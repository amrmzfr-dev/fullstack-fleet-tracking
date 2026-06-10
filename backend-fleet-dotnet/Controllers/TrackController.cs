using BackendFleetDotnet.DTOs;
using BackendFleetDotnet.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BackendFleetDotnet.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/v1/track")]
public class TrackController(TrackingService trackingService) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Track([FromBody] TrackRequestDto request)
    {
        var (success, error, statusCode) = await trackingService.ProcessTrackAsync(request);
        if (!success)
        {
            return StatusCode(statusCode, new { error });
        }

        return Ok(new { status = "ok" });
    }
}
