using BackendFleetDotnet.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace BackendFleetDotnet.Data;

public class FleetDbContext(DbContextOptions<FleetDbContext> options) : DbContext(options)
{
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<Position> Positions => Set<Position>();
    public DbSet<Trip> Trips => Set<Trip>();
    public DbSet<Alert> Alerts => Set<Alert>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var utcConverter = new ValueConverter<DateTime, DateTime>(
            value => DateTime.SpecifyKind(value, DateTimeKind.Utc),
            value => DateTime.SpecifyKind(value, DateTimeKind.Utc));

        var nullableUtcConverter = new ValueConverter<DateTime?, DateTime?>(
            value => value.HasValue ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc) : value,
            value => value.HasValue ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc) : value);

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(DateTime))
                {
                    property.SetValueConverter(utcConverter);
                }
                else if (property.ClrType == typeof(DateTime?))
                {
                    property.SetValueConverter(nullableUtcConverter);
                }
            }
        }

        modelBuilder.Entity<Vehicle>(entity =>
        {
            entity.HasIndex(v => v.Plate).IsUnique();
            entity.HasIndex(v => v.DeviceId).IsUnique();
            entity.Property(v => v.Name).IsRequired();
            entity.Property(v => v.Plate).IsRequired();
            entity.Property(v => v.DeviceId).IsRequired();
            entity.Property(v => v.ApiKeyHash).IsRequired();
        });

        modelBuilder.Entity<Position>(entity =>
        {
            entity.HasIndex(p => new { p.VehicleId, p.RecordedAt })
                .IsDescending(false, true);
            entity.HasOne(p => p.Vehicle)
                .WithMany(v => v.Positions)
                .HasForeignKey(p => p.VehicleId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Trip>(entity =>
        {
            entity.HasOne(t => t.Vehicle)
                .WithMany(v => v.Trips)
                .HasForeignKey(t => t.VehicleId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Alert>(entity =>
        {
            entity.HasOne(a => a.Vehicle)
                .WithMany(v => v.Alerts)
                .HasForeignKey(a => a.VehicleId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
