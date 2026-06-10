using BackendFleetDotnet.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BackendFleetDotnet.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/alerts")]
public class AlertsController(AlertService alertService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<object>> List([FromQuery] int? vehicleId, [FromQuery] int limit = 50)
    {
        var alerts = await alertService.ListAsync(vehicleId, limit);
        return Ok(new { alerts });
    }
}
