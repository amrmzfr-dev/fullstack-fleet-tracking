namespace BackendFleetDotnet.Models;

public class Alert
{
    public int Id { get; set; }
    public int VehicleId { get; set; }
    public string AlertType { get; set; } = string.Empty;
    public double Value { get; set; }
    public double Lat { get; set; }
    public double Lng { get; set; }
    public DateTime TriggeredAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Vehicle Vehicle { get; set; } = null!;
}
