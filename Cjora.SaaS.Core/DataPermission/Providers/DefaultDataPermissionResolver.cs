using System.Globalization;
using Cjora.SaaS.Core.Auth.Abstractions;
using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.DataPermission.Enums;
using Cjora.SaaS.Core.DataPermission.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Core.DataPermission.Providers;

/// <summary>
/// 默认 <see cref="IDataPermissionResolver"/>：从 <see cref="ICurrentUser"/> 声明与 <see cref="DataPermissionClaimOptions"/> 解析 <see cref="DataPermissionResult"/>。
/// </summary>
/// <remarks>
/// <b>// CHANGED</b>：<see cref="ResolveAsync"/> 包装同步解析逻辑，行为与历史 <c>Resolve()</c> 等价，便于宿主替换为真异步实现。
/// </remarks>
public sealed class DefaultDataPermissionResolver : IDataPermissionResolver
{
    private readonly ICurrentUser _currentUser;
    private readonly DataPermissionClaimOptions _claimOptions;
    private readonly ILogger<DefaultDataPermissionResolver> _logger;

    /// <summary>
    /// 初始化 <see cref="DefaultDataPermissionResolver"/>。
    /// </summary>
    public DefaultDataPermissionResolver(
        ICurrentUser currentUser,
        IOptions<DataPermissionClaimOptions> claimOptions,
        ILogger<DefaultDataPermissionResolver> logger)
    {
        _currentUser = currentUser;
        _claimOptions = claimOptions.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    public Task<DataPermissionResult> ResolveAsync()
    {
        // IMPORTANT: 企业级数据权限：不再从 JWT/Claims 读取部门列表；部门/项目/客户等数据域关系由数据库表在查询时实时计算。
        var bypass = ResolveBypass();
        var scope = ResolveScope(bypass);
        return Task.FromResult(new DataPermissionResult(scope, bypass, _currentUser.UserId, Array.Empty<long>()));
    }

    private bool ResolveBypass()
    {
        var raw = _currentUser.FindClaim(_claimOptions.BypassRowLevelFiltersClaimType);
        return string.Equals(raw, _claimOptions.BypassRowFiltersClaimValue, StringComparison.OrdinalIgnoreCase);
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
            return _claimOptions.DefaultScope;
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

        return _claimOptions.DefaultScope;
    }

    // NOTE: DepartmentIdsClaimType 保留为兼容配置项，但默认解析器不再消费 dept_ids。
}
