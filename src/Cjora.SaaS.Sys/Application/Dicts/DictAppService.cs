using Cjora.SaaS.Core.Repository.Abstractions;
using Cjora.SaaS.Core.Repository.Models;
using Cjora.SaaS.Sys.Application.Dicts.Models;
using Cjora.SaaS.Sys.Entities;

namespace Cjora.SaaS.Sys.Application.Dicts;

internal sealed class DictAppService : IDictAppService
{
    private readonly IRepository<SysDictType> _types;
    private readonly IRepository<SysDictItem> _items;

    public DictAppService(IRepository<SysDictType> types, IRepository<SysDictItem> items)
    {
        _types = types;
        _items = items;
    }

    public async Task<PagedResult<DictTypeVm>> GetTypesPagedAsync(PagedRequest request, CancellationToken cancellationToken = default)
    {
        var page = await _types.GetPagedListAsync(null, request, t => t.Id, true, cancellationToken);
        return new PagedResult<DictTypeVm>
        {
            Items = page.Items.Select(static t => t.ToVm()).ToArray(),
            TotalCount = page.TotalCount,
            PageNumber = page.PageNumber,
            PageSize = page.PageSize
        };
    }

    public async Task<DictTypeVm?> GetTypeByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var t = await _types.GetSingleAsync(x => x.Id == id, cancellationToken);
        return t?.ToVm();
    }

    public async Task<long> CreateTypeAsync(CreateDictTypeRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Code))
            throw new ArgumentException("Name 与 Code 必填。", nameof(request));
        if (request.Category is not ("system" or "business"))
            throw new ArgumentException("Category 仅支持 system 或 business。", nameof(request));

        var now = DateTime.UtcNow;
        var entity = new SysDictType
        {
            Name = request.Name.Trim(),
            Code = request.Code.Trim(),
            Category = request.Category,
            Remark = string.IsNullOrWhiteSpace(request.Remark) ? null : request.Remark.Trim(),
            IsActive = request.IsActive,
            IsLocked = request.IsLocked,
            CreatorUserId = 0,
            CreatedAtUtc = now
        };

        await _types.InsertAsync(entity, cancellationToken);
        return entity.Id;
    }

    public async Task<bool> UpdateTypeAsync(long id, UpdateDictTypeRequest request, CancellationToken cancellationToken = default)
    {
        var t = await _types.GetSingleAsync(x => x.Id == id, cancellationToken);
        if (t is null) return false;
        if (t.IsLocked) throw new InvalidOperationException("系统锁定字典不允许修改。");

        if (request.Category is not ("system" or "business"))
            throw new ArgumentException("Category 仅支持 system 或 business。", nameof(request));

        if (!string.IsNullOrWhiteSpace(request.Name)) t.Name = request.Name.Trim();
        if (!string.IsNullOrWhiteSpace(request.Code)) t.Code = request.Code.Trim();
        t.Category = request.Category;
        t.Remark = string.IsNullOrWhiteSpace(request.Remark) ? null : request.Remark.Trim();
        t.IsActive = request.IsActive;
        t.IsLocked = request.IsLocked;
        t.UpdatedAtUtc = DateTime.UtcNow;
        await _types.UpdateAsync(t, cancellationToken);
        return true;
    }

    public async Task<bool> DeleteTypeAsync(long id, CancellationToken cancellationToken = default)
    {
        var t = await _types.GetSingleAsync(x => x.Id == id, cancellationToken);
        if (t is null) return false;
        if (t.IsLocked) throw new InvalidOperationException("系统锁定字典不允许删除。");

        await _items.DeleteAsync(i => i.TypeId == id, cancellationToken);
        await _types.DeleteAsync(x => x.Id == id, cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<DictItemVm>> GetItemsByTypeAsync(long typeId, CancellationToken cancellationToken = default)
    {
        var list = await _items.GetListAsync(i => i.TypeId == typeId, cancellationToken);
        return list.OrderBy(i => i.SortOrder).ThenBy(i => i.Id).Select(static i => i.ToVm()).ToArray();
    }

    public async Task<DictItemVm?> GetItemByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var i = await _items.GetSingleAsync(x => x.Id == id, cancellationToken);
        return i?.ToVm();
    }

    public async Task<long> CreateItemAsync(long typeId, CreateDictItemRequest request, CancellationToken cancellationToken = default)
    {
        var type = await _types.GetSingleAsync(t => t.Id == typeId, cancellationToken)
                   ?? throw new ArgumentException("字典类型不存在。");
        if (type.IsLocked) throw new InvalidOperationException("系统锁定字典不允许新增字典项。");

        if (string.IsNullOrWhiteSpace(request.Label) || string.IsNullOrWhiteSpace(request.Value))
            throw new ArgumentException("Label 与 Value 必填。", nameof(request));

        var now = DateTime.UtcNow;
        var entity = new SysDictItem
        {
            TypeId = typeId,
            Label = request.Label.Trim(),
            Value = request.Value.Trim(),
            SortOrder = request.SortOrder,
            IsActive = request.IsActive,
            Remark = string.IsNullOrWhiteSpace(request.Remark) ? null : request.Remark.Trim(),
            CreatorUserId = 0,
            CreatedAtUtc = now
        };

        await _items.InsertAsync(entity, cancellationToken);
        return entity.Id;
    }

    public async Task<bool> UpdateItemAsync(long id, UpdateDictItemRequest request, CancellationToken cancellationToken = default)
    {
        var i = await _items.GetSingleAsync(x => x.Id == id, cancellationToken);
        if (i is null) return false;

        var type = await _types.GetSingleAsync(t => t.Id == i.TypeId, cancellationToken);
        if (type?.IsLocked == true) throw new InvalidOperationException("系统锁定字典不允许修改字典项。");

        if (string.IsNullOrWhiteSpace(request.Label) || string.IsNullOrWhiteSpace(request.Value))
            throw new ArgumentException("Label 与 Value 必填。", nameof(request));

        i.Label = request.Label.Trim();
        i.Value = request.Value.Trim();
        i.SortOrder = request.SortOrder;
        i.IsActive = request.IsActive;
        i.Remark = string.IsNullOrWhiteSpace(request.Remark) ? null : request.Remark.Trim();
        i.UpdatedAtUtc = DateTime.UtcNow;
        await _items.UpdateAsync(i, cancellationToken);
        return true;
    }

    public async Task<bool> DeleteItemAsync(long id, CancellationToken cancellationToken = default)
    {
        var i = await _items.GetSingleAsync(x => x.Id == id, cancellationToken);
        if (i is null) return false;

        var type = await _types.GetSingleAsync(t => t.Id == i.TypeId, cancellationToken);
        if (type?.IsLocked == true) throw new InvalidOperationException("系统锁定字典不允许删除字典项。");

        await _items.DeleteAsync(x => x.Id == id, cancellationToken);
        return true;
    }
}

internal static class DictMapping
{
    public static DictTypeVm ToVm(this SysDictType t) =>
        new(Id: t.Id, Name: t.Name, Code: t.Code, Category: t.Category, Remark: t.Remark,
            IsActive: t.IsActive, IsLocked: t.IsLocked, CreatedAtUtc: t.CreatedAtUtc, UpdatedAtUtc: t.UpdatedAtUtc);

    public static DictItemVm ToVm(this SysDictItem i) =>
        new(Id: i.Id, TypeId: i.TypeId, Label: i.Label, Value: i.Value, SortOrder: i.SortOrder,
            IsActive: i.IsActive, Remark: i.Remark, CreatedAtUtc: i.CreatedAtUtc, UpdatedAtUtc: i.UpdatedAtUtc);
}
