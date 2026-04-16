using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.DataPermission.Enums;
using Cjora.SaaS.Sys.DataPermission.Entities;
using Cjora.SaaS.Sys.Departments;
using SqlSugar;

namespace Cjora.SaaS.Sys.Infrastructure.DataPermission;

/// <summary>
/// 解析当前用户在 <see cref="DataScopeKind.Department"/> 下可访问的部门 Id 集合。
/// </summary>
/// <remarks>
/// 查询 <see cref="SysUserDataScope"/>（ScopeType="Department"）获取用户绑定的根部门，
/// 再通过 <see cref="ISysDepartmentExpansionService"/> 展开子部门树（已带缓存）。
/// </remarks>
public sealed class DepartmentDataScopeIdResolver : IDataScopeIdResolver
{
    private readonly ISqlSugarClient _db;
    private readonly ISysDepartmentExpansionService _expansion;

    public DepartmentDataScopeIdResolver(ISqlSugarClient db, ISysDepartmentExpansionService expansion)
    {
        _db = db;
        _expansion = expansion;
    }

    /// <inheritdoc />
    public DataScopeKind Scope => DataScopeKind.Department;

    /// <inheritdoc />
    public async Task<IReadOnlyList<long>> ResolveAccessibleIdsAsync(
        long userId, string tenantId, CancellationToken cancellationToken = default)
    {
        var rootDeptIds = await _db.Queryable<SysUserDataScope>()
            .Where(s => s.TenantId == tenantId && s.UserId == userId && s.ScopeType == "Department")
            .Select(s => s.ScopeId)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        if (rootDeptIds.Count == 0)
            return Array.Empty<long>();

        var result = new HashSet<long>();
        foreach (var rootId in rootDeptIds)
        {
            var descendants = await _expansion.ExpandWithDescendantsAsync(rootId, cancellationToken)
                .ConfigureAwait(false);
            foreach (var id in descendants)
                result.Add(id);
        }

        return result.ToArray();
    }
}
