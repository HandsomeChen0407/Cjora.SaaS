namespace Cjora.SaaS.Sys.Application.Dicts.Models;

public sealed record DictTypeVm(
    long Id,
    string Name,
    string Code,
    string Category,
    string? Remark,
    bool IsActive,
    bool IsLocked,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);

public sealed record DictItemVm(
    long Id,
    long TypeId,
    string Label,
    string Value,
    int SortOrder,
    bool IsActive,
    string? Remark,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);

public sealed record CreateDictTypeRequest(
    string Name,
    string Code,
    string Category,
    string? Remark,
    bool IsActive,
    bool IsLocked);

public sealed record UpdateDictTypeRequest(
    string Name,
    string Code,
    string Category,
    string? Remark,
    bool IsActive,
    bool IsLocked);

public sealed record CreateDictItemRequest(
    string Label,
    string Value,
    int SortOrder,
    bool IsActive,
    string? Remark);

public sealed record UpdateDictItemRequest(
    string Label,
    string Value,
    int SortOrder,
    bool IsActive,
    string? Remark);
