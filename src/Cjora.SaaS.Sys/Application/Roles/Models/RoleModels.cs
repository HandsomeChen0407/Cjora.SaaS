namespace Cjora.SaaS.Sys.Application.Roles.Models;

public sealed record RoleVm(
    long Id,
    string Code,
    string Name,
    bool IsSystem,
    bool IsActive,
    string DataScope,
    string? Remark,
    IReadOnlyList<long> PermissionIds,
    IReadOnlyList<long> DataScopeDeptIds,
    IReadOnlyList<long> DataScopeAgentIds,
    long CreatorUserId,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);

public sealed record CreateRoleRequest(
    string Code,
    string Name,
    bool IsSystem,
    bool IsActive,
    string DataScope,
    string? Remark,
    IReadOnlyList<long>? PermissionIds,
    IReadOnlyList<long>? DataScopeDeptIds,
    IReadOnlyList<long>? DataScopeAgentIds);

public sealed record UpdateRoleRequest(
    string Name,
    bool IsSystem,
    bool IsActive,
    string DataScope,
    string? Remark,
    IReadOnlyList<long>? PermissionIds,
    IReadOnlyList<long>? DataScopeDeptIds,
    IReadOnlyList<long>? DataScopeAgentIds);
