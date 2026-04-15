namespace Cjora.SaaS.Sys.Application.Users.Models;

public sealed record CreateUserRequest(
    string LoginName,
    string DisplayName,
    bool IsActive,
    long? DepartmentId,
    string? DepartmentName,
    string? ExternalSubjectId,
    string? Email,
    string? Phone);

public sealed record UpdateUserRequest(
    string DisplayName,
    bool IsActive,
    long? DepartmentId,
    string? DepartmentName,
    string? ExternalSubjectId,
    string? Email,
    string? Phone);

