using System.Globalization;
using System.Security;
using Cjora.SaaS.Core.Auth.Abstractions;
using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.DataPermission.Enums;
using Cjora.SaaS.Core.DataPermission.Models;
using Cjora.SaaS.Core.Diagnostics;
using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Core.DataPermission.Providers;

/// <summary>
/// 默认 <see cref="IDataPermissionResolver"/>：从 JWT Claims 解析 scope/bypass，
/// 再调用已注册的 <see cref="IDataScopeIdResolver"/> 填充可访问 Id 列表。
/// </summary>
public class DefaultDataPermissionResolver : IDataPermissionResolver
{
    private readonly ICurrentUser _currentUser;
    private readonly ITenantProvider _tenantProvider;
    private readonly DataPermissionClaimOptions _claimOptions;
    private readonly ILogger<DefaultDataPermissionResolver> _logger;
    private readonly IEnumerable<IDataScopeIdResolver> _scopeIdResolvers;

    /// <summary>
    /// 初始化 <see cref="DefaultDataPermissionResolver"/>。
    /// </summary>
    public DefaultDataPermissionResolver(
        ICurrentUser currentUser,
        ITenantProvider tenantProvider,
        IOptions<DataPermissionClaimOptions> claimOptions,
        ILogger<DefaultDataPermissionResolver> logger,
        IEnumerable<IDataScopeIdResolver> scopeIdResolvers)
    {
        _currentUser = currentUser;
        _tenantProvider = tenantProvider;
        _claimOptions = claimOptions.Value;
        _logger = logger;
        _scopeIdResolvers = scopeIdResolvers;
    }

    /// <inheritdoc />
    public async Task<DataPermissionResult> ResolveAsync()
    {
        var bypass = ResolveBypass();
        var scope = ResolveScope(bypass);

        if (bypass || scope is DataScopeKind.All or DataScopeKind.Tenant or DataScopeKind.Self)
        {
            return new DataPermissionResult(
                scope, bypass, _currentUser.UserId,
                Array.Empty<long>(), Array.Empty<long>(), Array.Empty<long>(), Array.Empty<long>());
        }

        var tenantId = _tenantProvider.GetTenantId();
        var deptIds = (IReadOnlyList<long>)Array.Empty<long>();
        var projIds = (IReadOnlyList<long>)Array.Empty<long>();
        var custIds = (IReadOnlyList<long>)Array.Empty<long>();
        var agentIds = (IReadOnlyList<long>)Array.Empty<long>();

        foreach (var resolver in _scopeIdResolvers)
        {
            if (resolver.Scope != scope) continue;

            var ids = await resolver.ResolveAccessibleIdsAsync(
                _currentUser.UserId, tenantId).ConfigureAwait(false);

            switch (resolver.Scope)
            {
                case DataScopeKind.Department: deptIds = ids; break;
                case DataScopeKind.Project:    projIds = ids; break;
                case DataScopeKind.Customer:   custIds = ids; break;
                case DataScopeKind.Agent:      agentIds = ids; break;
            }
        }

        return new DataPermissionResult(scope, bypass, _currentUser.UserId, deptIds, projIds, custIds, agentIds);
    }

    /// <summary>
    /// 从 JWT Claims 解析 bypass 标志。
    /// </summary>
    protected bool ResolveBypass()
    {
        var raw = _currentUser.FindClaim(_claimOptions.BypassRowLevelFiltersClaimType);
        var bypass = string.Equals(raw, _claimOptions.BypassRowFiltersClaimValue, StringComparison.OrdinalIgnoreCase);
        if (bypass)
        {
            SecurityAuditEventSource.Log.BypassRowLevelFilters(_currentUser.UserId, _currentUser.TenantId);
            _logger.LogWarning("BypassRowLevelFilters enabled. UserId={UserId}, TenantId={TenantId}", _currentUser.UserId, _currentUser.TenantId);
        }

        return bypass;
    }

    /// <summary>
    /// 从 JWT Claims 解析数据范围。
    /// </summary>
    protected DataScopeKind ResolveScope(bool bypassRowLevelFilters)
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
