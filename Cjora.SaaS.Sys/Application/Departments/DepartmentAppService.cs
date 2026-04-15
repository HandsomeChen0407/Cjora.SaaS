using Cjora.SaaS.Core.Repository.Abstractions;
using Cjora.SaaS.Core.Repository.Models;
using Cjora.SaaS.Sys.Application.Departments.Models;
using Cjora.SaaS.Sys.DataPermission.Entities;
using Cjora.SaaS.Sys.Entities;
using SqlSugar;

namespace Cjora.SaaS.Sys.Application.Departments;

internal sealed class DepartmentAppService : IDepartmentAppService
{
    private readonly IRepository<SysDepartment> _departments;
    private readonly ISqlSugarClient _db;

    public DepartmentAppService(IRepository<SysDepartment> departments, ISqlSugarClient db)
    {
        _departments = departments;
        _db = db;
    }

    public async Task<PagedResult<DepartmentVm>> GetPagedAsync(PagedRequest request, CancellationToken cancellationToken = default)
    {
        var page = await _departments.GetPagedListAsync(null, request, d => d.SortOrder, true, cancellationToken);
        return new PagedResult<DepartmentVm>
        {
            Items = page.Items.Select(static d => d.ToVm()).ToArray(),
            TotalCount = page.TotalCount,
            PageNumber = page.PageNumber,
            PageSize = page.PageSize
        };
    }

    public async Task<DepartmentVm?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var d = await _departments.GetSingleAsync(x => x.Id == id, cancellationToken);
        return d?.ToVm();
    }

    public async Task<IReadOnlyList<DepartmentTreeNodeVm>> GetTreeAsync(CancellationToken cancellationToken = default)
    {
        var all = await _departments.GetListAsync(cancellationToken);
        var ordered = all.OrderBy(d => d.SortOrder).ThenBy(d => d.Id).ToList();

        var childrenByParent = ordered
            .GroupBy(d => d.ParentId ?? 0L)
            .ToDictionary(g => g.Key, g => g.ToList());

        DepartmentTreeNodeVm Build(SysDepartment dept)
        {
            var children = childrenByParent.TryGetValue(dept.Id, out var kids) ? kids : [];
            return new DepartmentTreeNodeVm(
                Id: dept.Id,
                ParentId: dept.ParentId,
                Name: dept.Name,
                Code: dept.Code,
                SortOrder: dept.SortOrder,
                Leader: dept.Leader,
                Phone: dept.Phone,
                IsActive: dept.IsActive,
                Children: children.Select(Build).ToArray());
        }

        var roots = childrenByParent.TryGetValue(0L, out var rootNodes) ? rootNodes : [];
        return roots.Select(Build).ToArray();
    }

    public async Task<long> CreateAsync(CreateDepartmentRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new ArgumentException("Name 必填。", nameof(request));

        var now = DateTime.UtcNow;
        var entity = new SysDepartment
        {
            ParentId = request.ParentId,
            Name = request.Name.Trim(),
            Code = request.Code,
            SortOrder = request.SortOrder,
            Leader = string.IsNullOrWhiteSpace(request.Leader) ? null : request.Leader.Trim(),
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
            IsActive = request.IsActive,
            CreatorUserId = 0,
            CreatedAtUtc = now
        };

        await _departments.InsertAsync(entity, cancellationToken);
        await RebuildClosureForNodeAsync(entity.Id, entity.ParentId);
        return entity.Id;
    }

    public async Task<bool> UpdateAsync(long id, UpdateDepartmentRequest request, CancellationToken cancellationToken = default)
    {
        var d = await _departments.GetSingleAsync(x => x.Id == id, cancellationToken);
        if (d is null) return false;

        var parentChanged = d.ParentId != request.ParentId;

        d.ParentId = request.ParentId;
        d.Name = string.IsNullOrWhiteSpace(request.Name) ? d.Name : request.Name.Trim();
        d.Code = request.Code;
        d.SortOrder = request.SortOrder;
        d.Leader = string.IsNullOrWhiteSpace(request.Leader) ? null : request.Leader.Trim();
        d.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        d.IsActive = request.IsActive;
        d.UpdatedAtUtc = DateTime.UtcNow;
        await _departments.UpdateAsync(d, cancellationToken);

        if (parentChanged)
        {
            await RebuildFullClosureTableAsync(cancellationToken);
        }

        return true;
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var d = await _departments.GetSingleAsync(x => x.Id == id, cancellationToken);
        if (d is null) return false;

        var hasChild = await _departments.GetSingleAsync(x => x.ParentId == id, cancellationToken);
        if (hasChild is not null)
            throw new InvalidOperationException("请先删除子部门。");

        await _departments.DeleteAsync(x => x.Id == id, cancellationToken);

        await _db.Deleteable<SysDepartmentClosure>()
            .Where(c => c.AncestorId == id || c.DescendantId == id)
            .ExecuteCommandAsync();

        return true;
    }

    /// <summary>
    /// 为新创建的节点插入闭包行：自身 + 继承祖先的路径。
    /// </summary>
    private async Task RebuildClosureForNodeAsync(long nodeId, long? parentId)
    {
        await _db.Insertable(new SysDepartmentClosure { AncestorId = nodeId, DescendantId = nodeId })
            .ExecuteCommandAsync();

        if (parentId is null) return;

        var ancestors = await _db.Queryable<SysDepartmentClosure>()
            .Where(c => c.DescendantId == parentId.Value)
            .ToListAsync();

        foreach (var a in ancestors)
        {
            await _db.Insertable(new SysDepartmentClosure { AncestorId = a.AncestorId, DescendantId = nodeId })
                .ExecuteCommandAsync();
        }
    }

    /// <summary>
    /// 部门移动时完全重建闭包表（安全但较重，适合中小规模部门树）。
    /// </summary>
    private async Task RebuildFullClosureTableAsync(CancellationToken cancellationToken)
    {
        var all = await _departments.GetListAsync(cancellationToken);
        await _db.Deleteable<SysDepartmentClosure>().ExecuteCommandAsync();

        var childrenByParent = new Dictionary<long, List<long>>();
        foreach (var d in all)
        {
            if (d.ParentId is null) continue;
            if (!childrenByParent.TryGetValue(d.ParentId.Value, out var list))
            {
                list = [];
                childrenByParent[d.ParentId.Value] = list;
            }
            list.Add(d.Id);
        }

        foreach (var d in all)
        {
            await _db.Insertable(new SysDepartmentClosure { AncestorId = d.Id, DescendantId = d.Id })
                .ExecuteCommandAsync();
        }

        foreach (var d in all)
        {
            var ancestors = new List<long>();
            var current = d.ParentId;
            var visited = new HashSet<long>();
            while (current is not null && visited.Add(current.Value))
            {
                ancestors.Add(current.Value);
                var parent = all.FirstOrDefault(x => x.Id == current.Value);
                current = parent?.ParentId;
            }

            foreach (var ancestorId in ancestors)
            {
                await _db.Insertable(new SysDepartmentClosure { AncestorId = ancestorId, DescendantId = d.Id })
                    .ExecuteCommandAsync();
            }
        }
    }
}

internal static class DepartmentMapping
{
    public static DepartmentVm ToVm(this SysDepartment d) =>
        new(
            Id: d.Id,
            ParentId: d.ParentId,
            Name: d.Name,
            Code: d.Code,
            SortOrder: d.SortOrder,
            Leader: d.Leader,
            Phone: d.Phone,
            IsActive: d.IsActive,
            CreatorUserId: d.CreatorUserId,
            CreatedAtUtc: d.CreatedAtUtc,
            UpdatedAtUtc: d.UpdatedAtUtc);
}
