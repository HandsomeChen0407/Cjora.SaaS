namespace Cjora.SaaS.Sys.Api.Models;

/// <summary>分页结果，与 Core <see cref="Cjora.SaaS.Core.Repository.Models.PagedResult{TEntity}"/> 对齐。</summary>
public sealed class PagedApiResult<T>
{
    public IReadOnlyList<T> Items { get; init; } = Array.Empty<T>();

    public int TotalCount { get; init; }

    public int PageNumber { get; init; }

    public int PageSize { get; init; }
}

public sealed class SysTenantDto
{
    public string Id { get; init; } = "";

    public string Name { get; init; } = "";

    public bool IsActive { get; init; }

    /// <summary>非空表示该租户使用独立物理库；注意接口鉴权与密钥保护。</summary>
    public string? DedicatedDatabaseConnectionString { get; init; }

    public DateTime CreatedAtUtc { get; init; }

    public DateTime? UpdatedAtUtc { get; init; }
}

public sealed class SysTenantCreateRequest
{
    public string Id { get; init; } = "";

    public string Name { get; init; } = "";

    public bool IsActive { get; init; } = true;

    /// <summary>可选；非空则该租户业务库使用此连接串。</summary>
    public string? DedicatedDatabaseConnectionString { get; init; }
}

public sealed class SysTenantUpdateRequest
{
    public string Name { get; init; } = "";

    public bool IsActive { get; init; }

    /// <summary>传入 <see langword="null"/> 表示不修改；传入空字符串可清空独立库配置。</summary>
    public string? DedicatedDatabaseConnectionString { get; init; }
}

public sealed class SysUserDto
{
    public long Id { get; init; }

    public string LoginName { get; init; } = "";

    public string DisplayName { get; init; } = "";

    public bool IsActive { get; init; }

    public long? DepartmentId { get; init; }

    public string? DepartmentName { get; init; }

    public string? ExternalSubjectId { get; init; }

    public long CreatorUserId { get; init; }

    public DateTime CreatedAtUtc { get; init; }

    public DateTime? UpdatedAtUtc { get; init; }
}

public sealed class SysUserCreateRequest
{
    public string LoginName { get; init; } = "";

    public string DisplayName { get; init; } = "";

    public bool IsActive { get; init; } = true;

    public long? DepartmentId { get; init; }

    public string? DepartmentName { get; init; }

    public string? ExternalSubjectId { get; init; }
}

public sealed class SysUserUpdateRequest
{
    public string DisplayName { get; init; } = "";

    public bool IsActive { get; init; } = true;

    public long? DepartmentId { get; init; }

    public string? DepartmentName { get; init; }

    public string? ExternalSubjectId { get; init; }
}

public sealed class SysRoleDto
{
    public long Id { get; init; }

    public string Code { get; init; } = "";

    public string Name { get; init; } = "";

    public string? PermissionCodesJson { get; init; }

    public bool IsSystem { get; init; }

    public long CreatorUserId { get; init; }

    public DateTime CreatedAtUtc { get; init; }

    public DateTime? UpdatedAtUtc { get; init; }
}

public sealed class SysRoleCreateRequest
{
    public string Code { get; init; } = "";

    public string Name { get; init; } = "";

    public IReadOnlyList<string>? PermissionCodes { get; init; }

    public bool IsSystem { get; init; }
}

public sealed class SysRoleUpdateRequest
{
    public string Name { get; init; } = "";

    public IReadOnlyList<string>? PermissionCodes { get; init; }

    public bool IsSystem { get; init; }
}

public sealed class SysDepartmentDto
{
    public long Id { get; init; }

    public long? ParentId { get; init; }

    public string Name { get; init; } = "";

    public string? Code { get; init; }

    public int SortOrder { get; init; }

    public long CreatorUserId { get; init; }

    public DateTime CreatedAtUtc { get; init; }

    public DateTime? UpdatedAtUtc { get; init; }
}

public sealed class SysDepartmentCreateRequest
{
    public long? ParentId { get; init; }

    public string Name { get; init; } = "";

    public string? Code { get; init; }

    public int SortOrder { get; init; }
}

public sealed class SysDepartmentUpdateRequest
{
    public long? ParentId { get; init; }

    public string Name { get; init; } = "";

    public string? Code { get; init; }

    public int SortOrder { get; init; }
}

public sealed class SysUserRoleDto
{
    public long Id { get; init; }

    public long UserId { get; init; }

    public long RoleId { get; init; }

    public long CreatorUserId { get; init; }

    public DateTime CreatedAtUtc { get; init; }

    public DateTime? UpdatedAtUtc { get; init; }
}

public sealed class SysUserRoleAssignRequest
{
    public long UserId { get; init; }

    public long RoleId { get; init; }
}

public sealed class SysPermissionDto
{
    public long Id { get; init; }

    public long? ParentId { get; init; }

    public string Label { get; init; } = "";

    public string NodeType { get; init; } = "";

    public string? Path { get; init; }

    public string? HttpMethod { get; init; }

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

    public string? HttpMethod { get; init; }

    public string? PermCode { get; init; }

    public string? Icon { get; init; }

    public int SortOrder { get; init; }

    public bool IsVisible { get; init; }

    public bool IsActive { get; init; }

    public IReadOnlyList<SysPermissionTreeNodeDto> Children { get; init; } = Array.Empty<SysPermissionTreeNodeDto>();
}

public sealed class SysPermissionCreateRequest
{
    public long? ParentId { get; init; }

    public string Label { get; init; } = "";

    public string NodeType { get; init; } = "menu";

    public string? Path { get; init; }

    public string? HttpMethod { get; init; }

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

    public string? HttpMethod { get; init; }

    public string? PermCode { get; init; }

    public string? Icon { get; init; }

    public int SortOrder { get; init; }

    public bool IsVisible { get; init; } = true;

    public bool IsActive { get; init; } = true;
}

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
    public long TypeId { get; init; }

    public string Label { get; init; } = "";

    public string Value { get; init; } = "";

    public int SortOrder { get; init; }

    public bool IsActive { get; init; } = true;

    public string? Remark { get; init; }
}

public sealed class SysDictItemUpdateRequest
{
    public long TypeId { get; init; }

    public string Label { get; init; } = "";

    public string Value { get; init; } = "";

    public int SortOrder { get; init; }

    public bool IsActive { get; init; } = true;

    public string? Remark { get; init; }
}
