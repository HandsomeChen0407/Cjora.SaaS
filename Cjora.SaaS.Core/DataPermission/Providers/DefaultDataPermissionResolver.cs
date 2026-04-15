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
    private const int MaxDepartmentIdsForInClause = 1000;

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
        // COMPAT: 声明解析规则未变
        var bypass = ResolveBypass();
        var scope = ResolveScope(bypass);
        var deptIds = ResolveDepartmentIds();

        // IN 爆炸防护：部门 Id 过多时降级为 Self（比截断列表更安全，避免静默丢失授权部门）。
        if (!bypass && scope == DataScopeKind.Department && deptIds.Count > MaxDepartmentIdsForInClause)
        {
            _logger.LogWarning(
                "部门声明数量 {Count} 超过上限 {Max}，数据范围已降级为 Self（用户 {UserId}）。",
                deptIds.Count,
                MaxDepartmentIdsForInClause,
                _currentUser.UserId);
            return Task.FromResult(
                new DataPermissionResult(DataScopeKind.Self, bypass, _currentUser.UserId, Array.Empty<long>()));
        }

        return Task.FromResult(new DataPermissionResult(scope, bypass, _currentUser.UserId, deptIds));
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

    private IReadOnlyList<long> ResolveDepartmentIds()
    {
        var raw = _currentUser.FindClaim(_claimOptions.DepartmentIdsClaimType);
        return ParseIdList(raw);
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
