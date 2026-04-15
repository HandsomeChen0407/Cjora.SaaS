namespace Cjora.SaaS.Sys.Application.Permissions.Models;

public sealed record PermissionVm(
    long Id,
    long? ParentId,
    string Label,
    string NodeType,
    string? Path,
    string? PermCode,
    string? Icon,
    int SortOrder,
    bool IsVisible,
    bool IsActive);

public sealed record PermissionTreeNodeVm(
    long Id,
    long? ParentId,
    string Label,
    string NodeType,
    string? Path,
    string? PermCode,
    string? Icon,
    int SortOrder,
    bool IsVisible,
    bool IsActive,
    IReadOnlyList<PermissionTreeNodeVm> Children);

public sealed record CreatePermissionRequest(
    long? ParentId,
    string Label,
    string NodeType,
    string? Path,
    string? PermCode,
    string? Icon,
    int SortOrder,
    bool IsVisible,
    bool IsActive);

public sealed record UpdatePermissionRequest(
    long? ParentId,
    string Label,
    string NodeType,
    string? Path,
    string? PermCode,
    string? Icon,
    int SortOrder,
    bool IsVisible,
    bool IsActive);
