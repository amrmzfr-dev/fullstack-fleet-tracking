using BackendFleetDotnet.DTOs;
using BackendFleetDotnet.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BackendFleetDotnet.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/v1/auth")]
public class AuthController(AuthService authService) : ControllerBase
{
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginRequestDto request)
    {
        var result = await authService.LoginAsync(request);
        if (result is null)
        {
            return Unauthorized(new { error = "invalid credentials" });
        }

        return Ok(result);
    }
}
