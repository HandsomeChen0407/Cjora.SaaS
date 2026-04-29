using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Cjora.SaaS.Core.DataPermission.Enums;
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

            DataScopeKind? widest = null;
            var superAdmin = false;
            foreach (var role in roles)
            {
                claims.Add(new Claim("role", role.Code));
                var mapped = MapRoleDataScope(role.DataScope);
                widest = widest is null ? mapped : Wider(widest.Value, mapped);
                if (role.IsSystem || string.Equals(role.Code, "super_admin", StringComparison.OrdinalIgnoreCase))
                {
                    superAdmin = true;
                }
            }

            if (superAdmin)
            {
                claims.Add(new Claim("is_super_admin", "1"));
            }

            claims.Add(new Claim("data_scope", ((int)(widest ?? DataScopeKind.Self)).ToString(CultureInfo.InvariantCulture)));
        }
        else
        {
            claims.Add(new Claim("data_scope", ((int)DataScopeKind.Self).ToString(CultureInfo.InvariantCulture)));
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

    private static DataScopeKind MapRoleDataScope(string? dataScope) =>
        dataScope?.Trim().ToLowerInvariant() switch
        {
            "all" => DataScopeKind.All,
            "tenant" => DataScopeKind.Tenant,
            "dept" => DataScopeKind.Department,
            "agent" => DataScopeKind.Agent,
            "self" => DataScopeKind.Self,
            _ => DataScopeKind.Tenant
        };

    /// <summary>数值越大表示同一租户内可见数据范围越宽（多角色合并时取最宽）。</summary>
    private static int PermissiveRank(DataScopeKind k) => k switch
    {
        DataScopeKind.Self => 0,
        DataScopeKind.Agent => 1,
        DataScopeKind.Project => 2,
        DataScopeKind.Customer => 2,
        DataScopeKind.Department => 3,
        DataScopeKind.Tenant => 4,
        DataScopeKind.All => 5,
        _ => 0
    };

    private static DataScopeKind Wider(DataScopeKind a, DataScopeKind b) =>
        PermissiveRank(a) >= PermissiveRank(b) ? a : b;
}
