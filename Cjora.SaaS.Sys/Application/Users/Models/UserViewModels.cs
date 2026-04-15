namespace Cjora.SaaS.Sys.Application.Users.Models;

public sealed record UserVm(
    long Id,
    string LoginName,
    string DisplayName,
    bool IsActive,
    long? DepartmentId,
    string? ExternalSubjectId,
    string? Email,
    string? Phone,
    long CreatorUserId,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);

public sealed record UserRoleVm(
    long UserRoleId,
    long RoleId,
    string RoleCode,
    string RoleName);
