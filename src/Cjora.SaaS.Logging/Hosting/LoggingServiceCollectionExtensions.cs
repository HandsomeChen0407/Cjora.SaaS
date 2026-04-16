using Cjora.SaaS.Logging.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Cjora.SaaS.Logging.Hosting;

/// <summary>Logging DI registration.</summary>
public static class LoggingServiceCollectionExtensions
{
    /// <summary>
    /// Register <see cref="RequestLoggingOptions"/> and related services.
    /// Call <c>UseCjoraRequestLogging()</c> in the pipeline to activate the middleware.
    /// </summary>
    public static IServiceCollection AddCjoraLogging(
        this IServiceCollection services,
        Action<RequestLoggingOptions>? configure = null)
    {
        ArgumentNullException.ThrowIfNull(services);

        var options = new RequestLoggingOptions();
        configure?.Invoke(options);
        services.AddSingleton(Microsoft.Extensions.Options.Options.Create(options));

        return services;
    }
}
