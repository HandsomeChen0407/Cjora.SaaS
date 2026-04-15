namespace Cjora.SaaS.Sys.Api.Models;

// ──── Tenant ────

public sealed class SysTenantDto
{
    public string Id { get; init; } = "";
    public string Name { get; init; } = "";
    public bool IsActive { get; init; }
    public string? DedicatedDatabaseConnectionString { get; init; }
    public DateTime CreatedAtUtc { get; init; }
    public DateTime? UpdatedAtUtc { get; init; }
}

public sealed class SysTenantCreateRequest
{
    public string Id { get; init; } = "";
    public string Name { get; init; } = "";
    public bool IsActive { get; init; } = true;
    public string? DedicatedDatabaseConnectionString { get; init; }
}

public sealed class SysTenantUpdateRequest
{
    public string Name { get; init; } = "";
    public bool IsActive { get; init; }
    public string? DedicatedDatabaseConnectionString { get; init; }
}

// ──── Role ────

public sealed class SysRoleDto
{
    public long Id { get; init; }
    public string Code { get; init; } = "";
    public string Name { get; init; } = "";
    public bool IsSystem { get; init; }
    public bool IsActive { get; init; }
    public string DataScope { get; init; } = "tenant";
    public string? Remark { get; init; }
    public IReadOnlyList<long> PermissionIds { get; init; } = [];
    public IReadOnlyList<long> DataScopeDeptIds { get; init; } = [];
    public long CreatorUserId { get; init; }
    public DateTime CreatedAtUtc { get; init; }
    public DateTime? UpdatedAtUtc { get; init; }
}

public sealed class SysRoleCreateRequest
{
    public string Code { get; init; } = "";
    public string Name { get; init; } = "";
    public bool IsSystem { get; init; }
    public bool IsActive { get; init; } = true;
    public string DataScope { get; init; } = "tenant";
    public string? Remark { get; init; }
    public IReadOnlyList<long>? PermissionIds { get; init; }
    public IReadOnlyList<long>? DataScopeDeptIds { get; init; }
}

public sealed class SysRoleUpdateRequest
{
    public string Name { get; init; } = "";
    public bool IsSystem { get; init; }
    public bool IsActive { get; init; } = true;
    public string DataScope { get; init; } = "tenant";
    public string? Remark { get; init; }
    public IReadOnlyList<long>? PermissionIds { get; init; }
    public IReadOnlyList<long>? DataScopeDeptIds { get; init; }
}

// ──── Department ────

public sealed class SysDepartmentDto
{
    public long Id { get; init; }
    public long? ParentId { get; init; }
    public string Name { get; init; } = "";
    public string? Code { get; init; }
    public int SortOrder { get; init; }
    public string? Leader { get; init; }
    public string? Phone { get; init; }
    public bool IsActive { get; init; }
    public long CreatorUserId { get; init; }
    public DateTime CreatedAtUtc { get; init; }
    public DateTime? UpdatedAtUtc { get; init; }
}

public sealed class SysDepartmentTreeNodeDto
{
    public long Id { get; init; }
    public long? ParentId { get; init; }
    public string Name { get; init; } = "";
    public string? Code { get; init; }
    public int SortOrder { get; init; }
    public string? Leader { get; init; }
    public string? Phone { get; init; }
    public bool IsActive { get; init; }
    public IReadOnlyList<SysDepartmentTreeNodeDto> Children { get; init; } = [];
}

public sealed class SysDepartmentCreateRequest
{
    public long? ParentId { get; init; }
    public string Name { get; init; } = "";
    public string? Code { get; init; }
    public int SortOrder { get; init; }
    public string? Leader { get; init; }
    public string? Phone { get; init; }
    public bool IsActive { get; init; } = true;
}

public sealed class SysDepartmentUpdateRequest
{
    public long? ParentId { get; init; }
    public string Name { get; init; } = "";
    public string? Code { get; init; }
    public int SortOrder { get; init; }
    public string? Leader { get; init; }
    public string? Phone { get; init; }
    public bool IsActive { get; init; } = true;
}

// ──── UserRole ────

public sealed class SysUserRoleAssignRequest
{
    public long RoleId { get; init; }
}

// ──── Permission ────

public sealed class SysPermissionDto
{
    public long Id { get; init; }
    public long? ParentId { get; init; }
    public string Label { get; init; } = "";
    public string NodeType { get; init; } = "";
    public string? Path { get; init; }
    public string? PermCode { get; init; }
    public string? Icon { get; init; }
    public int SortOrder { get; init; }
    public bool IsVisible { get; init; }
    public bool IsActive { get; init; }
}

public sealed class SysPermissionTreeNodeDto
{
    public long Id { get; init; }
    public long? ParentId { get; init; }
    public string Label { get; init; } = "";
    public string NodeType { get; init; } = "";
    public string? Path { get; init; }
    public string? PermCode { get; init; }
    public string? Icon { get; init; }
    public int SortOrder { get; init; }
    public bool IsVisible { get; init; }
    public bool IsActive { get; init; }
    public IReadOnlyList<SysPermissionTreeNodeDto> Children { get; init; } = [];
}

public sealed class SysPermissionCreateRequest
{
    public long? ParentId { get; init; }
    public string Label { get; init; } = "";
    public string NodeType { get; init; } = "menu";
    public string? Path { get; init; }
    public string? PermCode { get; init; }
    public string? Icon { get; init; }
    public int SortOrder { get; init; }
    public bool IsVisible { get; init; } = true;
    public bool IsActive { get; init; } = true;
}

public sealed class SysPermissionUpdateRequest
{
    public long? ParentId { get; init; }
    public string Label { get; init; } = "";
    public string NodeType { get; init; } = "menu";
    public string? Path { get; init; }
    public string? PermCode { get; init; }
    public string? Icon { get; init; }
    public int SortOrder { get; init; }
    public bool IsVisible { get; init; } = true;
    public bool IsActive { get; init; } = true;
}

// ──── Dict ────

public sealed class SysDictTypeDto
{
    public long Id { get; init; }
    public string Name { get; init; } = "";
    public string Code { get; init; } = "";
    public string Category { get; init; } = "";
    public string? Remark { get; init; }
    public bool IsActive { get; init; }
    public bool IsLocked { get; init; }
    public DateTime CreatedAtUtc { get; init; }
    public DateTime? UpdatedAtUtc { get; init; }
}

public sealed class SysDictTypeCreateRequest
{
    public string Name { get; init; } = "";
    public string Code { get; init; } = "";
    public string Category { get; init; } = "business";
    public string? Remark { get; init; }
    public bool IsActive { get; init; } = true;
    public bool IsLocked { get; init; }
}

public sealed class SysDictTypeUpdateRequest
{
    public string Name { get; init; } = "";
    public string Code { get; init; } = "";
    public string Category { get; init; } = "business";
    public string? Remark { get; init; }
    public bool IsActive { get; init; } = true;
    public bool IsLocked { get; init; }
}

public sealed class SysDictItemDto
{
    public long Id { get; init; }
    public long TypeId { get; init; }
    public string Label { get; init; } = "";
    public string Value { get; init; } = "";
    public int SortOrder { get; init; }
    public bool IsActive { get; init; }
    public string? Remark { get; init; }
    public DateTime CreatedAtUtc { get; init; }
    public DateTime? UpdatedAtUtc { get; init; }
}

public sealed class SysDictItemCreateRequest
{
    public string Label { get; init; } = "";
    public string Value { get; init; } = "";
    public int SortOrder { get; init; }
    public bool IsActive { get; init; } = true;
    public string? Remark { get; init; }
}

public sealed class SysDictItemUpdateRequest
{
    public string Label { get; init; } = "";
    public string Value { get; init; } = "";
    public int SortOrder { get; init; }
    public bool IsActive { get; init; } = true;
    public string? Remark { get; init; }
}

// ──── Me (Current User) ────

public sealed class CurrentUserDto
{
    public long Id { get; init; }
    public string LoginName { get; init; } = "";
    public string DisplayName { get; init; } = "";
    public long? DepartmentId { get; init; }
    public IReadOnlyList<string> PermissionCodes { get; init; } = [];
    public IReadOnlyList<SysPermissionTreeNodeDto> MenuTree { get; init; } = [];
    public IReadOnlyList<string> Roles { get; init; } = [];
}
