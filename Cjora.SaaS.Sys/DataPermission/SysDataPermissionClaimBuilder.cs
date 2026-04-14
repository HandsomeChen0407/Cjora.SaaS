using System.Globalization;
using System.Security.Claims;
using Cjora.SaaS.Core.DataPermission;

namespace Cjora.SaaS.Sys.DataPermission;

/// <summary>
/// 根据 IAM 解析结果生成供 <see cref="DefaultDataPermissionContext"/> 消费的声明（与 <see cref="SysDataPermissionClaims"/> 对齐）。
/// </summary>
public static class SysDataPermissionClaimBuilder
{
    /// <summary>
    /// 构建数据范围相关声明（不含用户 Id，用户 Id 仍建议使用 <see cref="ClaimTypes.NameIdentifier"/> / <c>sub</c> 等标准声明）。
    /// </summary>
    /// <param name="scope">数据范围。</param>
    /// <param name="accessibleDepartmentIds">可访问部门 Id（含本部门及按需展开的子部门）；可为空。</param>
    /// <param name="bypassRowLevelFilters">是否跳过部门/本人行级过滤器（平台运维等）。</param>
    /// <returns>声明列表。</returns>
    public static IReadOnlyList<Claim> Build(
        DataScopeKind scope,
        IReadOnlyList<long>? accessibleDepartmentIds = null,
        bool bypassRowLevelFilters = false)
    {
        var list = new List<Claim>(4)
        {
            new(SysDataPermissionClaims.DataScope, ((int)scope).ToString(CultureInfo.InvariantCulture))
        };

        if (accessibleDepartmentIds is { Count: > 0 })
        {
            var raw = string.Join(
                ',',
                accessibleDepartmentIds.Select(static id => id.ToString(CultureInfo.InvariantCulture)));
            list.Add(new Claim(SysDataPermissionClaims.DepartmentIds, raw));
        }

        if (bypassRowLevelFilters)
        {
            list.Add(new Claim(SysDataPermissionClaims.BypassRowLevelFilters, SysDataPermissionClaims.BypassRowFiltersValue));
        }

        return list;
    }
}
