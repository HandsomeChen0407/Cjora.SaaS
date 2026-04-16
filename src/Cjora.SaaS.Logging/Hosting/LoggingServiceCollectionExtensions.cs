using Cjora.SaaS.Logging.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Cjora.SaaS.Logging.Hosting;

/// <summary>Logging 模块 DI 注册。</summary>
public static class LoggingServiceCollectionExtensions
{
    /// <summary>
    /// 注册 <see cref="RequestLoggingOptions"/>。
    /// 通过 <paramref name="configure"/> 可设置 <c>ServiceName</c>、<c>InstanceId</c>、<c>ExcludePaths</c> 等。
    /// 管道中调用 <c>UseCjoraRequestLogging()</c> 激活中间件。
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
