using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Cjora.SaaS.Sys.Api.Auth;
using Cjora.SaaS.Sys.Api.Contracts.Common;
using Cjora.SaaS.Sys.Application.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cjora.SaaS.Sys.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly IUserAppService _users;
    private readonly JwtTokenService _tokenService;
    private readonly ITenantProvider _tenantProvider;

    public AuthController(IUserAppService users, JwtTokenService tokenService, ITenantProvider tenantProvider)
    {
        _users = users;
        _tokenService = tokenService;
        _tenantProvider = tenantProvider;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<Result<LoginResponse>>> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.LoginName) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(Result<LoginResponse>.Fail("LoginName 与 Password 必填。"));

        var valid = await _users.VerifyPasswordAsync(request.LoginName, request.Password, cancellationToken);
        if (!valid) return Unauthorized(Result<LoginResponse>.Fail("用户名或密码错误。"));

        var user = await _users.GetByLoginNameAsync(request.LoginName, cancellationToken);
        if (user is null) return Unauthorized(Result<LoginResponse>.Fail("用户不存在。"));

        var tenantId = _tenantProvider.GetTenantId();
        var token = await _tokenService.GenerateTokenAsync(user, tenantId, cancellationToken);

        return Ok(Result<LoginResponse>.Ok(new LoginResponse
        {
            Token = token,
            UserId = user.Id,
            LoginName = user.LoginName,
            DisplayName = user.DisplayName
        }));
    }
}

public sealed class LoginRequest
{
    public string LoginName { get; init; } = "";
    public string Password { get; init; } = "";
}

public sealed class LoginResponse
{
    public string Token { get; init; } = "";
    public long UserId { get; init; }
    public string LoginName { get; init; } = "";
    public string DisplayName { get; init; } = "";
}
