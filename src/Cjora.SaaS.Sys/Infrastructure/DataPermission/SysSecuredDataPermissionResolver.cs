using System.Globalization;
using System.Security;
using Cjora.SaaS.Core.Auth.Abstractions;
using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.DataPermission.Enums;
using Cjora.SaaS.Core.DataPermission.Models;
using Cjora.SaaS.Core.Diagnostics;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Sys.Infrastructure.DataPermission;

/// <summary>
/// 宿主侧数据权限解析：在 Core 默认语义上收敛 <c>bypass_row_filters</c>——仅 <see cref="ICurrentUser.IsSuperAdmin"/> 为真时允许跳过行级过滤。
/// </summary>
public sealed class SysSecuredDataPermissionResolver : IDataPermissionResolver
{
    private readonly ICurrentUser _currentUser;
    private readonly DataPermissionClaimOptions _claimOptions;
    private readonly ILogger<SysSecuredDataPermissionResolver> _logger;

    public SysSecuredDataPermissionResolver(
        ICurrentUser currentUser,
        IOptions<DataPermissionClaimOptions> claimOptions,
        ILogger<SysSecuredDataPermissionResolver> logger)
    {
        _currentUser = currentUser;
        _claimOptions = claimOptions.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    public Task<DataPermissionResult> ResolveAsync()
    {
        var bypass = ResolveBypass();
        var scope = ResolveScope(bypass);
        _logger.LogInformation(
            "DataPermissionResolver: Scope={Scope}, BypassRowLevelFilters={Bypass}, UserId={UserId}, TenantId={TenantId}",
            scope,
            bypass,
            _currentUser.UserId,
            _currentUser.TenantId);
        return Task.FromResult(new DataPermissionResult(scope, bypass, _currentUser.UserId, Array.Empty<long>()));
    }

    private bool ResolveBypass()
    {
        var raw = _currentUser.FindClaim(_claimOptions.BypassRowLevelFiltersClaimType);
        var claimSaysBypass = string.Equals(raw, _claimOptions.BypassRowFiltersClaimValue, StringComparison.OrdinalIgnoreCase);
        if (!claimSaysBypass)
        {
            return false;
        }

        if (!_currentUser.IsSuperAdmin)
        {
            _logger.LogWarning(
                "bypass_row_filters claim ignored for non-super-admin. UserId={UserId}, TenantId={TenantId}",
                _currentUser.UserId,
                _currentUser.TenantId);
            return false;
        }

        SecurityAuditEventSource.Log.BypassRowLevelFilters(_currentUser.UserId, _currentUser.TenantId);
        _logger.LogWarning(
            "BypassRowLevelFilters enabled. UserId={UserId}, TenantId={TenantId}",
            _currentUser.UserId,
            _currentUser.TenantId);
        return true;
    }

    private DataScopeKind ResolveScope(bool bypassRowLevelFilters)
    {
        if (bypassRowLevelFilters)
        {
            return DataScopeKind.All;
        }

        var raw = _currentUser.FindClaim(_claimOptions.DataScopeClaimType);
        if (string.IsNullOrWhiteSpace(raw))
        {
            throw new SecurityException("Invalid data_scope claim");
        }

        raw = raw.Trim();
        if (int.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var numeric))
        {
            if (Enum.IsDefined(typeof(DataScopeKind), numeric))
            {
                return (DataScopeKind)numeric;
            }
        }

        if (Enum.TryParse<DataScopeKind>(raw, ignoreCase: true, out var named))
        {
            return named;
        }

        throw new SecurityException("Invalid data_scope claim");
    }
}
