using Cjora.SaaS.Core.Repository.Abstractions;
using Cjora.SaaS.Sys.Application.Permissions.Models;
using Cjora.SaaS.Sys.Entities;
using Cjora.SaaS.Sys.Infrastructure.Caching;

namespace Cjora.SaaS.Sys.Application.Permissions;

internal sealed class PermissionAppService : IPermissionAppService
{
    private readonly IRepository<SysPermission> _perms;
    private readonly IRepository<SysRolePermission> _rolePerms;
    private readonly ISysSecurityCacheControl _securityCache;

    public PermissionAppService(
        IRepository<SysPermission> perms,
        IRepository<SysRolePermission> rolePerms,
        ISysSecurityCacheControl securityCache)
    {
        _perms = perms;
        _rolePerms = rolePerms;
        _securityCache = securityCache;
    }

    public async Task<IReadOnlyList<PermissionVm>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var list = await _perms.GetListAsync(cancellationToken);
        return list
            .OrderBy(p => p.SortOrder).ThenBy(p => p.Id)
            .Select(static p => p.ToVm())
            .ToArray();
    }

    public async Task<IReadOnlyList<PermissionTreeNodeVm>> GetTreeAsync(CancellationToken cancellationToken = default)
    {
        var list = await _perms.GetListAsync(cancellationToken);
        var ordered = list.OrderBy(p => p.SortOrder).ThenBy(p => p.Id).ToList();

        var childrenByParent = ordered
            .GroupBy(p => p.ParentId ?? 0L)
            .ToDictionary(g => g.Key, g => g.ToList());

        PermissionTreeNodeVm Build(SysPermission p)
        {
            var children = childrenByParent.TryGetValue(p.Id, out var kids) ? kids : [];
            return new PermissionTreeNodeVm(
                Id: p.Id,
                ParentId: p.ParentId,
                Label: p.Label,
                NodeType: p.NodeType,
                Path: p.Path,
                PermCode: p.PermCode,
                Icon: p.Icon,
                SortOrder: p.SortOrder,
                IsVisible: p.IsVisible,
                IsActive: p.IsActive,
                Children: children.Select(Build).ToArray());
        }

        var roots = childrenByParent.TryGetValue(0L, out var rootNodes) ? rootNodes : [];
        return roots.Select(Build).ToArray();
    }

    public async Task<PermissionVm?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var p = await _perms.GetSingleAsync(x => x.Id == id, cancellationToken);
        return p?.ToVm();
    }

    public async Task<long> CreateAsync(CreatePermissionRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Label))
            throw new ArgumentException("Label 必填。", nameof(request));
        if (request.NodeType is not ("menu" or "button"))
            throw new ArgumentException("NodeType 仅支持 menu 或 button。", nameof(request));
        if (request.NodeType == "button" && string.IsNullOrWhiteSpace(request.PermCode))
            throw new ArgumentException("button 节点必须提供 PermCode。", nameof(request));

        var now = DateTime.UtcNow;
        var entity = new SysPermission
        {
            ParentId = request.ParentId,
            Label = request.Label.Trim(),
            NodeType = request.NodeType,
            Path = string.IsNullOrWhiteSpace(request.Path) ? null : request.Path.Trim(),
            PermCode = string.IsNullOrWhiteSpace(request.PermCode) ? null : request.PermCode.Trim(),
            Icon = string.IsNullOrWhiteSpace(request.Icon) ? null : request.Icon.Trim(),
            SortOrder = request.SortOrder,
            IsVisible = request.IsVisible,
            IsActive = request.IsActive,
            CreatorUserId = 0,
            CreatedAtUtc = now
        };

        await _perms.InsertAsync(entity, cancellationToken);
        await _securityCache.InvalidatePermissionCachesAsync(cancellationToken).ConfigureAwait(false);
        return entity.Id;
    }

    public async Task<bool> UpdateAsync(long id, UpdatePermissionRequest request, CancellationToken cancellationToken = default)
    {
        var p = await _perms.GetSingleAsync(x => x.Id == id, cancellationToken);
        if (p is null) return false;

        if (request.NodeType is not ("menu" or "button"))
            throw new ArgumentException("NodeType 仅支持 menu 或 button。", nameof(request));
        if (request.NodeType == "button" && string.IsNullOrWhiteSpace(request.PermCode))
            throw new ArgumentException("button 节点必须提供 PermCode。", nameof(request));

        p.ParentId = request.ParentId;
        if (!string.IsNullOrWhiteSpace(request.Label))
            p.Label = request.Label.Trim();
        p.NodeType = request.NodeType;
        p.Path = string.IsNullOrWhiteSpace(request.Path) ? null : request.Path.Trim();
        p.PermCode = string.IsNullOrWhiteSpace(request.PermCode) ? null : request.PermCode.Trim();
        p.Icon = string.IsNullOrWhiteSpace(request.Icon) ? null : request.Icon.Trim();
        p.SortOrder = request.SortOrder;
        p.IsVisible = request.IsVisible;
        p.IsActive = request.IsActive;
        p.UpdatedAtUtc = DateTime.UtcNow;
        await _perms.UpdateAsync(p, cancellationToken);
        await _securityCache.InvalidatePermissionCachesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var hasChild = await _perms.GetSingleAsync(x => x.ParentId == id, cancellationToken);
        if (hasChild is not null)
            throw new InvalidOperationException("含子节点时无法删除。");

        await _rolePerms.DeleteAsync(rp => rp.PermissionId == id, cancellationToken);
        var n = await _perms.DeleteAsync(x => x.Id == id, cancellationToken);
        if (n > 0)
        {
            await _securityCache.InvalidatePermissionCachesAsync(cancellationToken).ConfigureAwait(false);
        }

        return n > 0;
    }
}

internal static class PermissionMapping
{
    public static PermissionVm ToVm(this SysPermission p) =>
        new(
            Id: p.Id,
            ParentId: p.ParentId,
            Label: p.Label,
            NodeType: p.NodeType,
            Path: p.Path,
            PermCode: p.PermCode,
            Icon: p.Icon,
            SortOrder: p.SortOrder,
            IsVisible: p.IsVisible,
            IsActive: p.IsActive);
}
