using System.Security.Cryptography;
using BackendFleetDotnet.Data;
using BackendFleetDotnet.DTOs;
using BackendFleetDotnet.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace BackendFleetDotnet.Services;

public class VehicleService(FleetDbContext dbContext, RedisCacheService cache)
{
    public async Task<IReadOnlyList<VehicleDto>> GetAllWithLastPositionAsync()
    {
        var vehicles = await dbContext.Vehicles
            .OrderBy(v => v.Name)
            .ToListAsync();

        var result = new List<VehicleDto>(vehicles.Count);
        foreach (var vehicle in vehicles)
        {
            var live = await cache.GetLivePositionAsync(vehicle.Id);
            PositionDto? lastPosition = null;

            if (live is not null)
            {
                lastPosition = new PositionDto
                {
                    Lat = live.Lat,
                    Lng = live.Lng,
                    SpeedKmh = live.SpeedKmh,
                    Heading = live.Heading,
                    Satellites = live.Satellites,
                    Hdop = live.Hdop,
                    RecordedAt = live.RecordedAt
                };
            }
            else
            {
                var dbPosition = await dbContext.Positions
                    .AsNoTracking()
                    .Where(p => p.VehicleId == vehicle.Id)
                    .OrderByDescending(p => p.RecordedAt)
                    .FirstOrDefaultAsync();

                if (dbPosition is not null)
                {
                    lastPosition = MapPosition(dbPosition);
                }
            }

            var tripCount = await dbContext.Trips.CountAsync(t => t.VehicleId == vehicle.Id);

            result.Add(new VehicleDto
            {
                Id = vehicle.Id,
                Name = vehicle.Name,
                Plate = vehicle.Plate,
                DeviceId = vehicle.DeviceId,
                LastPosition = lastPosition,
                Status = DetermineStatus(lastPosition),
                TripCount = tripCount
            });
        }

        return result;
    }

    public async Task<RegisterVehicleResponseDto> RegisterAsync(RegisterVehicleRequestDto dto)
    {
        var apiKeyBytes = RandomNumberGenerator.GetBytes(32);
        var apiKey = Convert.ToHexString(apiKeyBytes).ToLowerInvariant();
        var hash = BCrypt.Net.BCrypt.HashPassword(apiKey);

        var vehicle = new Vehicle
        {
            Name = dto.Name,
            Plate = dto.Plate,
            DeviceId = dto.DeviceId,
            ApiKeyHash = hash,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.Vehicles.Add(vehicle);
        await dbContext.SaveChangesAsync();

        return new RegisterVehicleResponseDto
        {
            Id = vehicle.Id,
            Name = vehicle.Name,
            Plate = vehicle.Plate,
            DeviceId = vehicle.DeviceId,
            ApiKey = apiKey
        };
    }

    public async Task<Vehicle?> GetByIdAsync(int id)
    {
        return await dbContext.Vehicles.FindAsync(id);
    }

    public async Task<LivePositionDto?> GetLivePositionAsync(int vehicleId)
    {
        var live = await cache.GetLivePositionAsync(vehicleId);
        if (live is not null)
        {
            return live;
        }

        var position = await dbContext.Positions
            .AsNoTracking()
            .Where(p => p.VehicleId == vehicleId)
            .OrderByDescending(p => p.RecordedAt)
            .FirstOrDefaultAsync();

        if (position is null)
        {
            return null;
        }

        return new LivePositionDto
        {
            VehicleId = vehicleId,
            Lat = position.Lat,
            Lng = position.Lng,
            SpeedKmh = position.SpeedKmh,
            Heading = position.Heading,
            Satellites = position.Satellites,
            Hdop = position.Hdop,
            RecordedAt = position.RecordedAt
        };
    }

    public async Task<IReadOnlyList<PositionDto>> GetPositionsAsync(
        int vehicleId,
        DateTime? from,
        DateTime? to,
        int limit)
    {
        var query = dbContext.Positions.AsNoTracking().Where(p => p.VehicleId == vehicleId);

        if (from.HasValue)
        {
            query = query.Where(p => p.RecordedAt >= from.Value);
        }

        if (to.HasValue)
        {
            query = query.Where(p => p.RecordedAt <= to.Value);
        }

        if (limit <= 0)
        {
            limit = 500;
        }

        var positions = await query
            .OrderByDescending(p => p.RecordedAt)
            .Take(limit)
            .ToListAsync();

        return positions.Select(MapPosition).ToList();
    }

    public async Task<IReadOnlyList<TripDto>> GetTripsAsync(int vehicleId)
    {
        var trips = await dbContext.Trips
            .AsNoTracking()
            .Where(t => t.VehicleId == vehicleId)
            .OrderByDescending(t => t.StartedAt)
            .ToListAsync();

        return trips.Select(MapTrip).ToList();
    }

    public async Task<IReadOnlyList<PositionDto>> GetTripPositionsAsync(int vehicleId, int tripId)
    {
        var trip = await dbContext.Trips
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tripId && t.VehicleId == vehicleId);

        if (trip is null)
        {
            return [];
        }

        var end = trip.EndedAt ?? DateTime.UtcNow;
        var positions = await dbContext.Positions
            .AsNoTracking()
            .Where(p => p.VehicleId == vehicleId && p.RecordedAt >= trip.StartedAt && p.RecordedAt <= end)
            .OrderBy(p => p.RecordedAt)
            .ToListAsync();

        return positions.Select(MapPosition).ToList();
    }

    public static VehicleStatus DetermineStatus(PositionDto? position)
    {
        if (position is null)
        {
            return VehicleStatus.NoSignal;
        }

        var age = DateTime.UtcNow - position.RecordedAt;
        if (age > TimeSpan.FromMinutes(10))
        {
            return VehicleStatus.NoSignal;
        }

        if (position.SpeedKmh > 0 && age <= TimeSpan.FromMinutes(2))
        {
            return VehicleStatus.Moving;
        }

        return VehicleStatus.Parked;
    }

    private static PositionDto MapPosition(Position position) => new()
    {
        Id = position.Id,
        Lat = position.Lat,
        Lng = position.Lng,
        SpeedKmh = position.SpeedKmh,
        Heading = position.Heading,
        Satellites = position.Satellites,
        Hdop = position.Hdop,
        RecordedAt = position.RecordedAt
    };

    private static TripDto MapTrip(Trip trip)
    {
        var end = trip.EndedAt ?? DateTime.UtcNow;
        var duration = (end - trip.StartedAt).TotalMinutes;

        return new TripDto
        {
            Id = trip.Id,
            StartedAt = trip.StartedAt,
            EndedAt = trip.EndedAt,
            StartLat = trip.StartLat,
            StartLng = trip.StartLng,
            EndLat = trip.EndLat,
            EndLng = trip.EndLng,
            DistanceKm = trip.DistanceKm,
            DurationMinutes = Math.Max(0, duration)
        };
    }
}

public class AlertService(FleetDbContext dbContext)
{
    public async Task<IReadOnlyList<AlertDto>> ListAsync(int? vehicleId, int limit)
    {
        if (limit <= 0)
        {
            limit = 50;
        }

        var query = dbContext.Alerts.AsNoTracking().AsQueryable();
        if (vehicleId.HasValue)
        {
            query = query.Where(a => a.VehicleId == vehicleId.Value);
        }

        var alerts = await query
            .OrderByDescending(a => a.TriggeredAt)
            .Take(limit)
            .ToListAsync();

        return alerts.Select(a => new AlertDto
        {
            Id = a.Id,
            VehicleId = a.VehicleId,
            AlertType = a.AlertType,
            Value = a.Value,
            Lat = a.Lat,
            Lng = a.Lng,
            TriggeredAt = a.TriggeredAt
        }).ToList();
    }
}

public class AuthService(IOptions<AdminSettings> adminOptions, IOptions<JwtSettings> jwtOptions)
{
    private readonly AdminSettings _admin = adminOptions.Value;
    private readonly JwtSettings _jwt = jwtOptions.Value;

    public async Task<LoginResponseDto?> LoginAsync(LoginRequestDto dto)
    {
        if (!string.Equals(dto.Email, _admin.Email, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, _admin.PasswordHash))
        {
            return null;
        }

        var expiresAt = DateTime.UtcNow.AddHours(_jwt.ExpiryHours);
        var token = JwtTokenService.GenerateToken(_admin.Email, _jwt.Secret, expiresAt);

        return await Task.FromResult(new LoginResponseDto
        {
            Token = token,
            ExpiresAt = expiresAt
        });
    }
}
