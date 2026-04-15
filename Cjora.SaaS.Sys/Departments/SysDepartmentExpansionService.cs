using Cjora.SaaS.Core.Repository.Abstractions;
using Cjora.SaaS.Sys.Entities;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Sys.Departments;

/// <summary>
/// <see cref="ISysDepartmentExpansionService"/> 的默认实现。
/// </summary>
public sealed class SysDepartmentExpansionService : ISysDepartmentExpansionService
{
    private readonly IRepository<SysDepartment> _departments;
    private readonly SysDepartmentOptions _options;

    /// <summary>
    /// 初始化 <see cref="SysDepartmentExpansionService"/>。
    /// </summary>
    /// <param name="departments">部门仓储。</param>
    public SysDepartmentExpansionService(IRepository<SysDepartment> departments, IOptions<SysDepartmentOptions> options)
    {
        _departments = departments;
        _options = options.Value;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<long>> ExpandWithDescendantsAsync(long rootDepartmentId, CancellationToken cancellationToken = default)
    {
        var all = await _departments.GetListAsync(cancellationToken);
        if (all.Count > _options.MaxDepartmentNodes)
        {
            throw new InvalidOperationException("Department tree too large. Use alternative model.");
        }

        return SysDepartmentExpansion.ExpandWithDescendants(rootDepartmentId, all);
    }
}
