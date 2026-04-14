using Cjora.SaaS.Core.Repository;
using Cjora.SaaS.Sys.Entities;

namespace Cjora.SaaS.Sys.Departments;

/// <summary>
/// <see cref="ISysDepartmentExpansionService"/> 的默认实现。
/// </summary>
public sealed class SysDepartmentExpansionService : ISysDepartmentExpansionService
{
    private readonly IRepository<SysDepartment> _departments;

    /// <summary>
    /// 初始化 <see cref="SysDepartmentExpansionService"/>。
    /// </summary>
    /// <param name="departments">部门仓储。</param>
    public SysDepartmentExpansionService(IRepository<SysDepartment> departments)
    {
        _departments = departments;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<long>> ExpandWithDescendantsAsync(long rootDepartmentId, CancellationToken cancellationToken = default)
    {
        var all = await _departments.GetListAsync(cancellationToken);
        return SysDepartmentExpansion.ExpandWithDescendants(rootDepartmentId, all);
    }
}
