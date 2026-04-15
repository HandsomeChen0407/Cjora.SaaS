namespace Cjora.SaaS.Sys.Application.Departments.Models;

public sealed record DepartmentVm(
    long Id,
    long? ParentId,
    string Name,
    string? Code,
    int SortOrder,
    string? Leader,
    string? Phone,
    bool IsActive,
    long CreatorUserId,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);

public sealed record DepartmentTreeNodeVm(
    long Id,
    long? ParentId,
    string Name,
    string? Code,
    int SortOrder,
    string? Leader,
    string? Phone,
    bool IsActive,
    IReadOnlyList<DepartmentTreeNodeVm> Children);

public sealed record CreateDepartmentRequest(
    long? ParentId,
    string Name,
    string? Code,
    int SortOrder,
    string? Leader,
    string? Phone,
    bool IsActive);

public sealed record UpdateDepartmentRequest(
    long? ParentId,
    string Name,
    string? Code,
    int SortOrder,
    string? Leader,
    string? Phone,
    bool IsActive);
