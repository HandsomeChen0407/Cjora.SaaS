using System.Globalization;
using System.Security.Claims;
using Cjora.SaaS.Core.DataPermission.Enums;

namespace Cjora.SaaS.Sys.DataPermission;

/// <summary>
/// 根据 IAM 解析结果生成供 <see cref="Cjora.SaaS.Core.DataPermission.Providers.DefaultDataPermissionContext"/> 消费的声明（与 <see cref="SysDataPermissionClaims"/> 对齐）。
/// </summary>
public static class SysDataPermissionClaimBuilder
{
    /// <summary>
    /// 构建数据范围相关声明（不含用户 Id，用户 Id 仍建议使用 <see cref="ClaimTypes.NameIdentifier"/> / <c>sub</c> 等标准声明）。
    /// </summary>
    /// <param name="scope">数据范围。</param>
    /// <param name="accessibleDepartmentIds">
    /// 兼容参数：企业级数据权限引擎不再把部门/代理商等列表塞入 JWT；数据域关系由数据库表在查询时实时计算。
    /// </param>
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

        _ = accessibleDepartmentIds; // 不再发 dept_ids

        if (bypassRowLevelFilters)
        {
            list.Add(new Claim(SysDataPermissionClaims.BypassRowLevelFilters, SysDataPermissionClaims.BypassRowFiltersValue));
        }

        return list;
    }
}
