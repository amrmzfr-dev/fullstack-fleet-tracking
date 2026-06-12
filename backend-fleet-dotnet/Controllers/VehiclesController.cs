using BackendFleetDotnet.DTOs;
using BackendFleetDotnet.Services;
using Microsoft.AspNetCore.Mvc;

namespace BackendFleetDotnet.Controllers;

[ApiController]
[Route("api/v1/vehicles")]
public class VehiclesController(VehicleService vehicleService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<object>> List()
    {
        var vehicles = await vehicleService.GetAllWithLastPositionAsync();
        return Ok(new { vehicles });
    }

    [HttpPost]
    public async Task<ActionResult<RegisterVehicleResponseDto>> Register([FromBody] RegisterVehicleRequestDto request)
    {
        try
        {
            var result = await vehicleService.RegisterAsync(request);
            return Created(string.Empty, result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("{id:int}/live")]
    public async Task<ActionResult<LivePositionDto>> GetLive(int id)
    {
        if (await vehicleService.GetByIdAsync(id) is null)
        {
            return NotFound(new { error = "vehicle not found" });
        }

        var live = await vehicleService.GetLivePositionAsync(id);
        if (live is null)
        {
            return NotFound(new { error = "no position found" });
        }

        return Ok(live);
    }

    [HttpGet("{id:int}/positions")]
    public async Task<ActionResult<object>> GetPositions(
        int id,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int limit = 500)
    {
        if (await vehicleService.GetByIdAsync(id) is null)
        {
            return NotFound(new { error = "vehicle not found" });
        }

        var positions = await vehicleService.GetPositionsAsync(id, from, to, limit);
        return Ok(new { positions });
    }

    [HttpGet("{id:int}/trips")]
    public async Task<ActionResult<object>> GetTrips(int id)
    {
        if (await vehicleService.GetByIdAsync(id) is null)
        {
            return NotFound(new { error = "vehicle not found" });
        }

        var trips = await vehicleService.GetTripsAsync(id);
        return Ok(new { trips });
    }

    [HttpGet("{id:int}/trips/{tripId:int}/positions")]
    public async Task<ActionResult<object>> GetTripPositions(int id, int tripId)
    {
        if (await vehicleService.GetByIdAsync(id) is null)
        {
            return NotFound(new { error = "vehicle not found" });
        }

        var positions = await vehicleService.GetTripPositionsAsync(id, tripId);
        if (positions.Count == 0)
        {
            var tripExists = (await vehicleService.GetTripsAsync(id)).Any(t => t.Id == tripId);
            if (!tripExists)
            {
                return NotFound(new { error = "trip not found" });
            }
        }

        return Ok(new { positions });
    }
}
