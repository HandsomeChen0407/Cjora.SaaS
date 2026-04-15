namespace Cjora.SaaS.Sys.Api.Contracts.Common;

public sealed class Result
{
    public bool Success { get; init; }
    public string? Error { get; init; }

    public static Result Ok() => new() { Success = true };
    public static Result Fail(string error) => new() { Success = false, Error = error };
}

public sealed class Result<T>
{
    public bool Success { get; init; }
    public string? Error { get; init; }
    public T? Data { get; init; }

    public static Result<T> Ok(T data) => new() { Success = true, Data = data };
    public static Result<T> Fail(string error) => new() { Success = false, Error = error };
}

public sealed class PagedResponse<T>
{
    public IReadOnlyList<T> Items { get; init; } = Array.Empty<T>();
    public int TotalCount { get; init; }
    public int PageNumber { get; init; }
    public int PageSize { get; init; }
}

