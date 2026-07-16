namespace BackendFleetDotnet.DTOs;

public class TrackRequestDto
{
    public string DeviceId { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public double Lat { get; set; }
    public double Lng { get; set; }
    public double SpeedKmh { get; set; }
    public double Heading { get; set; }
    public int Satellites { get; set; }
    public double Hdop { get; set; }

    // Older firmware omits this field, so it must default to true
    public bool HasFix { get; set; } = true;
    public string Timestamp { get; set; } = string.Empty;
}

public class LoginRequestDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class LoginResponseDto
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}

public enum VehicleStatus
{
    Moving,
    Parked,
    NoSignal,
    NoGps
}

public class PositionDto
{
    public int Id { get; set; }
    public double Lat { get; set; }
    public double Lng { get; set; }
    public double SpeedKmh { get; set; }
    public double Heading { get; set; }
    public int Satellites { get; set; }
    public double Hdop { get; set; }
    public bool HasFix { get; set; } = true;
    public DateTime RecordedAt { get; set; }
}

public class VehicleDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Plate { get; set; } = string.Empty;
    public string DeviceId { get; set; } = string.Empty;
    public PositionDto? LastPosition { get; set; }
    public VehicleStatus Status { get; set; }
    public int TripCount { get; set; }
}

public class TripDto
{
    public int Id { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public double StartLat { get; set; }
    public double StartLng { get; set; }
    public double EndLat { get; set; }
    public double EndLng { get; set; }
    public double DistanceKm { get; set; }
    public double DurationMinutes { get; set; }
}

public class AlertDto
{
    public int Id { get; set; }
    public int VehicleId { get; set; }
    public string AlertType { get; set; } = string.Empty;
    public double Value { get; set; }
    public double Lat { get; set; }
    public double Lng { get; set; }
    public DateTime TriggeredAt { get; set; }
}

public class RegisterVehicleRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string Plate { get; set; } = string.Empty;
    public string DeviceId { get; set; } = string.Empty;
}

public class RegisterVehicleResponseDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Plate { get; set; } = string.Empty;
    public string DeviceId { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
}

public class LivePositionDto
{
    public int VehicleId { get; set; }
    public double Lat { get; set; }
    public double Lng { get; set; }
    public double SpeedKmh { get; set; }
    public double Heading { get; set; }
    public int Satellites { get; set; }
    public double Hdop { get; set; }

    // Cached entries written before this field existed lack it — default
    // to true so they deserialize as normal fixes
    public bool HasFix { get; set; } = true;
    public DateTime RecordedAt { get; set; }
}
