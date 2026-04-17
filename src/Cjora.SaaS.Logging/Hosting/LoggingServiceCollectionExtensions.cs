using Cjora.SaaS.Logging.Diagnostics;
using Cjora.SaaS.Logging.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Cjora.SaaS.Logging.Hosting;

/// <summary>Cjora.SaaS.Logging DI 注册入口。</summary>
public static class LoggingServiceCollectionExtensions
{
    /// <summary>
    /// 注册 <see cref="RequestLoggingOptions"/> 与 <see cref="HttpRequestMetrics"/>。
    /// <para>
    /// 本方法**只注册 Options / 指标 Singleton**，不改动 ILogger Provider，也不挂载任何中间件：
    /// </para>
    /// <list type="bullet">
    ///   <item>日志 Provider 由 <c>builder.UseCjoraSerilog()</c>（在 Program.cs 开头）装配；</item>
    ///   <item>OpenTelemetry Tracing/Metrics 由 <c>services.AddCjoraObservability(config)</c> 装配；</item>
    ///   <item>中间件由 <c>app.UseCjoraRequestLogging()</c> 挂载。</item>
    /// </list>
    /// </summary>
    public static IServiceCollection AddCjoraLogging(
        this IServiceCollection services,
        Action<RequestLoggingOptions>? configure = null)
    {
        ArgumentNullException.ThrowIfNull(services);

        // 配置优先级：lambda（代码默认） → appsettings（运维覆盖）。
        // 故先 Configure（代码）后 BindConfiguration（配置）。
        services.AddOptions<RequestLoggingOptions>()
            .Configure(o => configure?.Invoke(o))
            .BindConfiguration(RequestLoggingOptions.SectionName);

        services.AddSingleton<HttpRequestMetrics>();

        return services;
    }

    /// <summary>
    /// 同时注册 <c>AddCjoraLogging</c> 与 <c>AddCjoraObservability</c>，供宿主一行调用。
    /// </summary>
    public static IServiceCollection AddCjoraObservabilityStack(
        this IServiceCollection services,
        IConfiguration configuration,
        Action<RequestLoggingOptions>? configure = null)
    {
        services.AddCjoraLogging(configure);
        services.AddCjoraObservability(configuration);
        return services;
    }
}
