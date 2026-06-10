namespace BackendFleetDotnet.Models;

public class Vehicle
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Plate { get; set; } = string.Empty;
    public string DeviceId { get; set; } = string.Empty;
    public string ApiKeyHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Position> Positions { get; set; } = [];
    public ICollection<Trip> Trips { get; set; } = [];
    public ICollection<Alert> Alerts { get; set; } = [];
}
