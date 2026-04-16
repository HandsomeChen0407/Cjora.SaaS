namespace Cjora.SaaS.Logging.Models;

/// <summary>
/// Configuration for request logging middleware.
/// </summary>
public sealed class RequestLoggingOptions
{
    /// <summary>Path prefixes to skip (e.g. "/health", "/swagger").</summary>
    public HashSet<string> ExcludePaths { get; set; } = new(StringComparer.OrdinalIgnoreCase) { "/health", "/swagger" };

    /// <summary>When true, include exception detail in the JSON error response (dev only).</summary>
    public bool IncludeExceptionDetail { get; set; }
}
