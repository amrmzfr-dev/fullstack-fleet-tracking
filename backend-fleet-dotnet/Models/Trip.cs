namespace BackendFleetDotnet.Models;

public class Trip
{
    public int Id { get; set; }
    public int VehicleId { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public double StartLat { get; set; }
    public double StartLng { get; set; }
    public double EndLat { get; set; }
    public double EndLng { get; set; }
    public double DistanceKm { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Vehicle Vehicle { get; set; } = null!;
}
