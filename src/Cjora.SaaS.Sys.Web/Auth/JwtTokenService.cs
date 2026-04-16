using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Cjora.SaaS.Core.Repository.Abstractions;
using Cjora.SaaS.Sys.Application.Users.Models;
using Cjora.SaaS.Sys.Entities;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Cjora.SaaS.Sys.Api.Auth;

public sealed class JwtTokenService
{
    private readonly JwtSettings _settings;
    private readonly IRepository<SysRole> _roles;
    private readonly IRepository<SysUserRole> _userRoles;

    public JwtTokenService(IOptions<JwtSettings> settings, IRepository<SysRole> roles, IRepository<SysUserRole> userRoles)
    {
        _settings = settings.Value;
        _roles = roles;
        _userRoles = userRoles;
    }

    public async Task<string> GenerateTokenAsync(UserVm user, string tenantId, CancellationToken cancellationToken = default)
    {
        var claims = new List<Claim>
        {
            new("sub", user.Id.ToString()),
            new("user_id", user.Id.ToString()),
            new("login_name", user.LoginName),
            new("display_name", user.DisplayName),
            new("tenant_id", tenantId)
        };

        var userRoles = await _userRoles.GetListAsync(ur => ur.UserId == user.Id, cancellationToken);
        var roleIds = userRoles.Select(ur => ur.RoleId).ToList();

        if (roleIds.Count > 0)
        {
            var roles = await _roles.GetListAsync(r => roleIds.Contains(r.Id), cancellationToken);

            var highestScope = "self";
            var superAdmin = false;
            foreach (var role in roles)
            {
                claims.Add(new Claim("role", role.Code));
                highestScope = GetHigherScope(highestScope, role.DataScope);
                if (role.IsSystem || string.Equals(role.Code, "super_admin", StringComparison.OrdinalIgnoreCase))
                {
                    superAdmin = true;
                }
            }

            if (superAdmin)
            {
                claims.Add(new Claim("is_super_admin", "1"));
            }

            claims.Add(new Claim("data_scope", highestScope));
        }
        else
        {
            claims.Add(new Claim("data_scope", "self"));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_settings.ExpireMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GetHigherScope(string current, string candidate)
    {
        var order = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
        {
            ["self"] = 0, ["dept"] = 1, ["tenant"] = 2, ["all"] = 3
        };

        var currentLevel = order.GetValueOrDefault(current, 0);
        var candidateLevel = order.GetValueOrDefault(candidate, 0);
        return candidateLevel > currentLevel ? candidate : current;
    }
}
