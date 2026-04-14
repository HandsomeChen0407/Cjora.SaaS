using System.Globalization;
using Cjora.SaaS.Core.Auth;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Core.DataPermission;

/// <summary>
/// 基于 <see cref="ICurrentUser"/> 与可配置声明名的默认 <see cref="IDataPermissionContext"/> 实现。
/// </summary>
/// <remarks>
/// 生产环境可将部门树展开逻辑替换为独立服务：先查角色数据范围，再计算 <see cref="AccessibleDepartmentIds"/>。
/// 本实现从 JWT/Claims 读取逗号分隔部门列表，便于示例与集成测试直接运行。
/// </remarks>
public sealed class DefaultDataPermissionContext : IDataPermissionContext
{
    private readonly ICurrentUser _currentUser;
    private readonly DataPermissionClaimOptions _claimOptions;
    private DataScopeKind? _scopeCache;
    private bool? _bypassCache;
    private IReadOnlyList<long>? _deptIdsCache;

    /// <summary>
    /// 初始化 <see cref="DefaultDataPermissionContext"/>。
    /// </summary>
    public DefaultDataPermissionContext(ICurrentUser currentUser, IOptions<DataPermissionClaimOptions> claimOptions)
    {
        _currentUser = currentUser;
        _claimOptions = claimOptions.Value;
    }

    /// <inheritdoc />
    public DataScopeKind Scope
    {
        get
        {
            if (!_scopeCache.HasValue)
            {
                _scopeCache = ResolveScope();
            }

            return _scopeCache.Value;
        }
    }

    /// <inheritdoc />
    public bool BypassRowLevelFilters
    {
        get
        {
            if (!_bypassCache.HasValue)
            {
                var raw = _currentUser.FindClaim(_claimOptions.BypassRowLevelFiltersClaimType);
                _bypassCache = string.Equals(raw, _claimOptions.BypassRowFiltersClaimValue, StringComparison.OrdinalIgnoreCase);
            }

            return _bypassCache.Value;
        }
    }

    /// <inheritdoc />
    public long CurrentUserId => _currentUser.UserId;

    /// <inheritdoc />
    public IReadOnlyList<long> AccessibleDepartmentIds
    {
        get
        {
            if (_deptIdsCache is not null)
            {
                return _deptIdsCache;
            }

            var raw = _currentUser.FindClaim(_claimOptions.DepartmentIdsClaimType);
            _deptIdsCache = ParseIdList(raw);
            return _deptIdsCache;
        }
    }

    private DataScopeKind ResolveScope()
    {
        if (BypassRowLevelFilters)
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

    private static IReadOnlyList<long> ParseIdList(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return Array.Empty<long>();
        }

        var parts = raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var list = new List<long>(parts.Length);
        foreach (var p in parts)
        {
            if (long.TryParse(p, NumberStyles.Integer, CultureInfo.InvariantCulture, out var id))
            {
                list.Add(id);
            }
        }

        return list;
    }
}
