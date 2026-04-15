using System.Globalization;
using Cjora.SaaS.Core.Auth.Abstractions;
using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.DataPermission.Enums;
using Cjora.SaaS.Core.DataPermission.Models;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Core.DataPermission.Providers;

/// <summary>
/// 默认 <see cref="IDataPermissionResolver"/>：从 <see cref="ICurrentUser"/> 声明与 <see cref="DataPermissionClaimOptions"/> 解析 <see cref="DataPermissionResult"/>。
/// </summary>
/// <remarks>
/// 逻辑由原 <see cref="DefaultDataPermissionContext"/> 内联解析迁出，以保持「解析」与「上下文承载」职责分离；
/// 行为与升级前一致，确保宿主无感切换。
/// </remarks>
public sealed class DefaultDataPermissionResolver : IDataPermissionResolver
{
    private readonly ICurrentUser _currentUser;
    private readonly DataPermissionClaimOptions _claimOptions;

    /// <summary>
    /// 初始化 <see cref="DefaultDataPermissionResolver"/>。
    /// </summary>
    public DefaultDataPermissionResolver(ICurrentUser currentUser, IOptions<DataPermissionClaimOptions> claimOptions)
    {
        _currentUser = currentUser;
        _claimOptions = claimOptions.Value;
    }

    /// <inheritdoc />
    public DataPermissionResult Resolve()
    {
        var bypass = ResolveBypass();
        var scope = ResolveScope(bypass);
        var deptIds = ResolveDepartmentIds();
        return new DataPermissionResult(scope, bypass, _currentUser.UserId, deptIds);
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
