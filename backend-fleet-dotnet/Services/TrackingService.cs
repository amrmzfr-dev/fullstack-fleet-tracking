using System.Security.Cryptography;
using System.Text.Json;
using BackendFleetDotnet.Data;
using BackendFleetDotnet.DTOs;
using BackendFleetDotnet.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace BackendFleetDotnet.Services;

public class RedisCacheService(IConnectionMultiplexer redis)
{
    private readonly IDatabase _db = redis.GetDatabase();

    public async Task SetLivePositionAsync(LivePositionDto position)
    {
        var key = LiveKey(position.VehicleId);
        var payload = JsonSerializer.Serialize(position);
        await _db.StringSetAsync(key, payload);
    }

    public async Task<LivePositionDto?> GetLivePositionAsync(int vehicleId)
    {
        var value = await _db.StringGetAsync(LiveKey(vehicleId));
        if (value.IsNullOrEmpty)
        {
            return null;
        }

        return JsonSerializer.Deserialize<LivePositionDto>(value.ToString());
    }

    public async Task<bool> HasAlertCooldownAsync(int vehicleId)
    {
        return await _db.KeyExistsAsync(AlertCooldownKey(vehicleId));
    }

    public async Task SetAlertCooldownAsync(int vehicleId, int seconds)
    {
        await _db.StringSetAsync(AlertCooldownKey(vehicleId), "1", TimeSpan.FromSeconds(seconds));
    }

    private static string LiveKey(int vehicleId) => $"vehicle:live:{vehicleId}";

    private static string AlertCooldownKey(int vehicleId) => $"alert:cooldown:{vehicleId}";
}

public class TrackingService(
    FleetDbContext dbContext,
    RedisCacheService cache,
    IOptions<TrackingSettings> trackingOptions)
{
    private readonly TrackingSettings _settings = trackingOptions.Value;

    public async Task<(bool Success, string? Error, int StatusCode)> ProcessTrackAsync(TrackRequestDto dto)
    {
        var vehicle = await dbContext.Vehicles.FirstOrDefaultAsync(v => v.DeviceId == dto.DeviceId);
        if (vehicle is null)
        {
            return (false, "vehicle not found", StatusCodes.Status401Unauthorized);
        }

        if (!BCrypt.Net.BCrypt.Verify(dto.ApiKey, vehicle.ApiKeyHash))
        {
            return (false, "invalid api key", StatusCodes.Status401Unauthorized);
        }

        if (!dto.HasFix)
        {
            await UpdateNoFixHeartbeatAsync(vehicle.Id, dto);
            return (true, null, StatusCodes.Status200OK);
        }

        if (!DateTime.TryParse(dto.Timestamp, null, System.Globalization.DateTimeStyles.AdjustToUniversal, out var recordedAt))
        {
            return (false, "invalid timestamp", StatusCodes.Status400BadRequest);
        }

        recordedAt = DateTime.SpecifyKind(recordedAt, DateTimeKind.Utc);

        var position = new Position
        {
            VehicleId = vehicle.Id,
            Lat = dto.Lat,
            Lng = dto.Lng,
            SpeedKmh = dto.SpeedKmh,
            Heading = dto.Heading,
            Satellites = dto.Satellites,
            Hdop = dto.Hdop,
            RecordedAt = recordedAt
        };

        dbContext.Positions.Add(position);
        await dbContext.SaveChangesAsync();

        await cache.SetLivePositionAsync(new LivePositionDto
        {
            VehicleId = vehicle.Id,
            Lat = position.Lat,
            Lng = position.Lng,
            SpeedKmh = position.SpeedKmh,
            Heading = position.Heading,
            Satellites = position.Satellites,
            Hdop = position.Hdop,
            RecordedAt = position.RecordedAt
        });

        await ManageTripAsync(vehicle.Id, dto, recordedAt);
        await CheckOverspeedAsync(vehicle.Id, dto, recordedAt);

        return (true, null, StatusCodes.Status200OK);
    }

    // A no-fix heartbeat proves the device is alive but blind: refresh the
    // live cache "last seen" (server-stamped — the device clock is untrusted
    // without a fix) while keeping the last known coordinates, and store
    // nothing in Positions so history stays clean.
    private async Task UpdateNoFixHeartbeatAsync(int vehicleId, TrackRequestDto dto)
    {
        var lastKnown = await cache.GetLivePositionAsync(vehicleId);

        if (lastKnown is null)
        {
            var dbPosition = await dbContext.Positions
                .AsNoTracking()
                .Where(p => p.VehicleId == vehicleId)
                .OrderByDescending(p => p.RecordedAt)
                .FirstOrDefaultAsync();

            if (dbPosition is not null)
            {
                lastKnown = new LivePositionDto
                {
                    VehicleId = vehicleId,
                    Lat = dbPosition.Lat,
                    Lng = dbPosition.Lng,
                    Heading = dbPosition.Heading
                };
            }
        }

        await cache.SetLivePositionAsync(new LivePositionDto
        {
            VehicleId = vehicleId,
            Lat = lastKnown?.Lat ?? 0,
            Lng = lastKnown?.Lng ?? 0,
            SpeedKmh = 0,
            Heading = lastKnown?.Heading ?? 0,
            Satellites = dto.Satellites,
            Hdop = dto.Hdop,
            HasFix = false,
            RecordedAt = DateTime.UtcNow
        });
    }

    private async Task ManageTripAsync(int vehicleId, TrackRequestDto dto, DateTime recordedAt)
    {
        var openTrip = await dbContext.Trips
            .Where(t => t.VehicleId == vehicleId && t.EndedAt == null)
            .OrderByDescending(t => t.StartedAt)
            .FirstOrDefaultAsync();

        if (dto.SpeedKmh > 0)
        {
            if (openTrip is null)
            {
                dbContext.Trips.Add(new Trip
                {
                    VehicleId = vehicleId,
                    StartedAt = recordedAt,
                    StartLat = dto.Lat,
                    StartLng = dto.Lng,
                    EndLat = dto.Lat,
                    EndLng = dto.Lng
                });
            }
            else
            {
                openTrip.EndLat = dto.Lat;
                openTrip.EndLng = dto.Lng;
                openTrip.DistanceKm = await CalculateDistanceAsync(openTrip.Id);
                openTrip.UpdatedAt = DateTime.UtcNow;
            }

            await dbContext.SaveChangesAsync();
            return;
        }

        if (openTrip is null)
        {
            return;
        }

        openTrip.EndedAt = recordedAt;
        openTrip.EndLat = dto.Lat;
        openTrip.EndLng = dto.Lng;
        openTrip.DistanceKm = await CalculateDistanceAsync(openTrip.Id);
        openTrip.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync();
    }

    private async Task<double> CalculateDistanceAsync(int tripId)
    {
        var trip = await dbContext.Trips.AsNoTracking().FirstAsync(t => t.Id == tripId);
        var end = trip.EndedAt ?? DateTime.UtcNow;

        var positions = await dbContext.Positions
            .AsNoTracking()
            .Where(p => p.VehicleId == trip.VehicleId && p.RecordedAt >= trip.StartedAt && p.RecordedAt <= end)
            .OrderBy(p => p.RecordedAt)
            .ToListAsync();

        if (positions.Count < 2)
        {
            return 0;
        }

        var total = 0.0;
        for (var i = 1; i < positions.Count; i++)
        {
            total += DistanceService.Haversine(
                positions[i - 1].Lat, positions[i - 1].Lng,
                positions[i].Lat, positions[i].Lng);
        }

        return total;
    }

    private async Task CheckOverspeedAsync(int vehicleId, TrackRequestDto dto, DateTime recordedAt)
    {
        if (dto.SpeedKmh <= _settings.OverspeedThreshold)
        {
            return;
        }

        if (await cache.HasAlertCooldownAsync(vehicleId))
        {
            return;
        }

        dbContext.Alerts.Add(new Alert
        {
            VehicleId = vehicleId,
            AlertType = "overspeed",
            Value = dto.SpeedKmh,
            Lat = dto.Lat,
            Lng = dto.Lng,
            TriggeredAt = recordedAt
        });

        await dbContext.SaveChangesAsync();
        await cache.SetAlertCooldownAsync(vehicleId, _settings.AlertCooldownSeconds);
    }
}
