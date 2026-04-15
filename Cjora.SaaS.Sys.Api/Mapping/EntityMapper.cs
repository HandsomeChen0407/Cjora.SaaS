using Cjora.SaaS.Sys.Api.Models;
using Cjora.SaaS.Sys.Application.Departments.Models;
using Cjora.SaaS.Sys.Application.Dicts.Models;
using Cjora.SaaS.Sys.Application.Permissions.Models;
using Cjora.SaaS.Sys.Application.Roles.Models;
using Cjora.SaaS.Sys.Entities;

namespace Cjora.SaaS.Sys.Api.Mapping;

internal static class EntityMapper
{
    public static SysTenantDto ToDto(this SysTenant t) =>
        new()
        {
            Id = t.Id,
            Name = t.Name,
            IsActive = t.IsActive,
            DedicatedDatabaseConnectionString = t.DedicatedDatabaseConnectionString,
            CreatedAtUtc = t.CreatedAtUtc,
            UpdatedAtUtc = t.UpdatedAtUtc
        };

    public static SysRoleDto ToDto(this RoleVm r) =>
        new()
        {
            Id = r.Id,
            Code = r.Code,
            Name = r.Name,
            IsSystem = r.IsSystem,
            IsActive = r.IsActive,
            DataScope = r.DataScope,
            Remark = r.Remark,
            PermissionIds = r.PermissionIds,
            DataScopeDeptIds = r.DataScopeDeptIds,
            CreatorUserId = r.CreatorUserId,
            CreatedAtUtc = r.CreatedAtUtc,
            UpdatedAtUtc = r.UpdatedAtUtc
        };

    public static SysDepartmentDto ToDto(this DepartmentVm d) =>
        new()
        {
            Id = d.Id,
            ParentId = d.ParentId,
            Name = d.Name,
            Code = d.Code,
            SortOrder = d.SortOrder,
            Leader = d.Leader,
            Phone = d.Phone,
            IsActive = d.IsActive,
            CreatorUserId = d.CreatorUserId,
            CreatedAtUtc = d.CreatedAtUtc,
            UpdatedAtUtc = d.UpdatedAtUtc
        };

    public static SysDepartmentTreeNodeDto ToTreeDto(this DepartmentTreeNodeVm n) =>
        new()
        {
            Id = n.Id,
            ParentId = n.ParentId,
            Name = n.Name,
            Code = n.Code,
            SortOrder = n.SortOrder,
            Leader = n.Leader,
            Phone = n.Phone,
            IsActive = n.IsActive,
            Children = n.Children.Select(c => c.ToTreeDto()).ToArray()
        };

    public static SysPermissionDto ToDto(this PermissionVm p) =>
        new()
        {
            Id = p.Id,
            ParentId = p.ParentId,
            Label = p.Label,
            NodeType = p.NodeType,
            Path = p.Path,
            PermCode = p.PermCode,
            Icon = p.Icon,
            SortOrder = p.SortOrder,
            IsVisible = p.IsVisible,
            IsActive = p.IsActive
        };

    public static SysPermissionTreeNodeDto ToTreeDto(this PermissionTreeNodeVm n) =>
        new()
        {
            Id = n.Id,
            ParentId = n.ParentId,
            Label = n.Label,
            NodeType = n.NodeType,
            Path = n.Path,
            PermCode = n.PermCode,
            Icon = n.Icon,
            SortOrder = n.SortOrder,
            IsVisible = n.IsVisible,
            IsActive = n.IsActive,
            Children = n.Children.Select(c => c.ToTreeDto()).ToArray()
        };

    public static SysDictTypeDto ToDto(this DictTypeVm t) =>
        new()
        {
            Id = t.Id,
            Name = t.Name,
            Code = t.Code,
            Category = t.Category,
            Remark = t.Remark,
            IsActive = t.IsActive,
            IsLocked = t.IsLocked,
            CreatedAtUtc = t.CreatedAtUtc,
            UpdatedAtUtc = t.UpdatedAtUtc
        };

    public static SysDictItemDto ToDto(this DictItemVm i) =>
        new()
        {
            Id = i.Id,
            TypeId = i.TypeId,
            Label = i.Label,
            Value = i.Value,
            SortOrder = i.SortOrder,
            IsActive = i.IsActive,
            Remark = i.Remark,
            CreatedAtUtc = i.CreatedAtUtc,
            UpdatedAtUtc = i.UpdatedAtUtc
        };
}
