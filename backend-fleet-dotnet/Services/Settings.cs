namespace BackendFleetDotnet.Services;

public class TrackingSettings
{
    public double OverspeedThreshold { get; set; } = 120;
    public int AlertCooldownSeconds { get; set; } = 60;
}

public class JwtSettings
{
    public string Secret { get; set; } = string.Empty;
    public int ExpiryHours { get; set; } = 24;
}

public class AdminSettings
{
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
}
