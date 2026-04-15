namespace Cjora.SaaS.Sys.Application.Users.Models;

public sealed record UserVm(
    long Id,
    string LoginName,
    string DisplayName,
    bool IsActive,
    long? DepartmentId,
    string? DepartmentName,
    string? ExternalSubjectId,
    long CreatorUserId,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);

