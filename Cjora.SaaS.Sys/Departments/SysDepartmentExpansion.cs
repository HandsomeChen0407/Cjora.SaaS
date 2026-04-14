using Cjora.SaaS.Sys.Entities;

namespace Cjora.SaaS.Sys.Departments;

/// <summary>
/// 在当前租户部门列表上展开子树，用于填充令牌中的 <c>dept_ids</c>（与 <see cref="Cjora.SaaS.Core.DataPermission.IDataPermissionContext.AccessibleDepartmentIds"/> 对应）。
/// </summary>
public static class SysDepartmentExpansion
{
    /// <summary>
    /// 返回 <paramref name="rootDepartmentId"/> 及其所有后代部门 Id（含自身），顺序为广度优先。
    /// </summary>
    /// <param name="rootDepartmentId">根部门 Id。</param>
    /// <param name="departmentsInTenant">当前租户内全部部门（已由仓储过滤）。</param>
    /// <returns>部门 Id 列表。</returns>
    public static IReadOnlyList<long> ExpandWithDescendants(long rootDepartmentId, IReadOnlyList<SysDepartment> departmentsInTenant)
    {
        ArgumentNullException.ThrowIfNull(departmentsInTenant);

        // 仅索引「有父节点」的边，避免 Dictionary 使用 long? 作键在 net8 上的 notnull 约束告警。
        var childrenByParentId = new Dictionary<long, List<long>>();
        foreach (var d in departmentsInTenant)
        {
            if (d.ParentId is null)
            {
                continue;
            }

            if (!childrenByParentId.TryGetValue(d.ParentId.Value, out var list))
            {
                list = new List<long>();
                childrenByParentId[d.ParentId.Value] = list;
            }

            list.Add(d.Id);
        }

        var result = new List<long>();
        var queue = new Queue<long>();
        queue.Enqueue(rootDepartmentId);

        while (queue.Count > 0)
        {
            var id = queue.Dequeue();
            result.Add(id);

            if (!childrenByParentId.TryGetValue(id, out var children))
            {
                continue;
            }

            foreach (var c in children)
            {
                queue.Enqueue(c);
            }
        }

        return result;
    }
}
