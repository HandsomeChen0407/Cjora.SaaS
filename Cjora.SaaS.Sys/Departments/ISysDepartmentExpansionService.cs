namespace Cjora.SaaS.Sys.Departments;

/// <summary>
/// 基于仓储中的部门数据展开子树，供登录发令牌等场景使用。
/// </summary>
public interface ISysDepartmentExpansionService
{
    /// <summary>
    /// 将 <paramref name="rootDepartmentId"/> 展开为「自身 + 全部后代」Id 列表（当前租户内）。
    /// </summary>
    Task<IReadOnlyList<long>> ExpandWithDescendantsAsync(long rootDepartmentId, CancellationToken cancellationToken = default);
}
