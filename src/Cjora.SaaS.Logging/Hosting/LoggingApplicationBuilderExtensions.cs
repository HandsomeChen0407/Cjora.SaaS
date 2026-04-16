using Cjora.SaaS.Logging.Middleware;
using Microsoft.AspNetCore.Builder;

namespace Cjora.SaaS.Logging.Hosting;

/// <summary>Pipeline extension for request logging middleware.</summary>
public static class LoggingApplicationBuilderExtensions
{
    /// <summary>
    /// Insert request logging + exception handling middleware.
    /// Should be placed early in the pipeline (after <c>UseRequestTimeouts</c>, before auth).
    /// </summary>
    public static IApplicationBuilder UseCjoraRequestLogging(this IApplicationBuilder app)
    {
        ArgumentNullException.ThrowIfNull(app);
        return app.UseMiddleware<RequestLoggingMiddleware>();
    }
}
