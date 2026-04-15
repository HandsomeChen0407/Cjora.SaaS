namespace Cjora.SaaS.Sys.Api.Contracts.Users;

public sealed class UserViewModel
{
    public long Id { get; init; }
    public string LoginName { get; init; } = "";
    public string DisplayName { get; init; } = "";
    public bool IsActive { get; init; }
    public long? DepartmentId { get; init; }
    public string? DepartmentName { get; init; }
    public string? ExternalSubjectId { get; init; }
    public string? Email { get; init; }
    public string? Phone { get; init; }
    public long CreatorUserId { get; init; }
    public DateTime CreatedAtUtc { get; init; }
    public DateTime? UpdatedAtUtc { get; init; }
}

public sealed class CreateUserDto
{
    public string LoginName { get; init; } = "";
    public string DisplayName { get; init; } = "";
    public bool IsActive { get; init; } = true;
    public long? DepartmentId { get; init; }
    public string? DepartmentName { get; init; }
    public string? ExternalSubjectId { get; init; }
    public string? Email { get; init; }
    public string? Phone { get; init; }
}

public sealed class UpdateUserDto
{
    public string DisplayName { get; init; } = "";
    public bool IsActive { get; init; } = true;
    public long? DepartmentId { get; init; }
    public string? DepartmentName { get; init; }
    public string? ExternalSubjectId { get; init; }
    public string? Email { get; init; }
    public string? Phone { get; init; }
}

