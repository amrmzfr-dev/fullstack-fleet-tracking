namespace BackendFleetDotnet.Models;

public class Position
{
    public int Id { get; set; }
    public int VehicleId { get; set; }
    public double Lat { get; set; }
    public double Lng { get; set; }
    public double SpeedKmh { get; set; }
    public double Heading { get; set; }
    public int Satellites { get; set; }
    public double Hdop { get; set; }
    public DateTime RecordedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Vehicle Vehicle { get; set; } = null!;
}
