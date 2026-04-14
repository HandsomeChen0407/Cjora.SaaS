using Cjora.SaaS.Sys.Api.Models;
using Cjora.SaaS.Sys.Entities;
using Cjora.SaaS.Sys.Permissions;

namespace Cjora.SaaS.Sys.Api.Mapping;

internal static class EntityMapper
{
    public static SysTenantDto ToDto(this SysTenant t) =>
        new()
        {
            Id = t.Id,
            Name = t.Name,
            IsActive = t.IsActive,
            CreatedAtUtc = t.CreatedAtUtc,
            UpdatedAtUtc = t.UpdatedAtUtc
        };

    public static SysUserDto ToDto(this SysUser u) =>
        new()
        {
            Id = u.Id,
            LoginName = u.LoginName,
            DisplayName = u.DisplayName,
            IsActive = u.IsActive,
            DepartmentId = u.DepartmentId,
            DepartmentName = u.DepartmentName,
            ExternalSubjectId = u.ExternalSubjectId,
            CreatorUserId = u.CreatorUserId,
            CreatedAtUtc = u.CreatedAtUtc,
            UpdatedAtUtc = u.UpdatedAtUtc
        };

    public static SysRoleDto ToDto(this SysRole r) =>
        new()
        {
            Id = r.Id,
            Code = r.Code,
            Name = r.Name,
            PermissionCodesJson = r.PermissionCodesJson,
            IsSystem = r.IsSystem,
            CreatorUserId = r.CreatorUserId,
            CreatedAtUtc = r.CreatedAtUtc,
            UpdatedAtUtc = r.UpdatedAtUtc
        };

    public static SysDepartmentDto ToDto(this SysDepartment d) =>
        new()
        {
            Id = d.Id,
            ParentId = d.ParentId,
            Name = d.Name,
            Code = d.Code,
            SortOrder = d.SortOrder,
            CreatorUserId = d.CreatorUserId,
            CreatedAtUtc = d.CreatedAtUtc,
            UpdatedAtUtc = d.UpdatedAtUtc
        };

    public static SysUserRoleDto ToDto(this SysUserRole ur) =>
        new()
        {
            Id = ur.Id,
            UserId = ur.UserId,
            RoleId = ur.RoleId,
            CreatorUserId = ur.CreatorUserId,
            CreatedAtUtc = ur.CreatedAtUtc,
            UpdatedAtUtc = ur.UpdatedAtUtc
        };

    public static string? ToPermissionCodesJson(IReadOnlyList<string>? codes) =>
        codes is null or { Count: 0 } ? null : PermissionCodesSerializer.Serialize(codes);
}
