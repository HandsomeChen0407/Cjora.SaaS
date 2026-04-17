using Cjora.SaaS.Logging.Diagnostics;
using Cjora.SaaS.Logging.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace Cjora.SaaS.Logging.Hosting;

/// <summary>
/// OpenTelemetry Tracing + Metrics 注册扩展。
/// </summary>
/// <remarks>
/// 本扩展为 Cjora.SaaS 全服务共用的最小 OTel 配置：
/// <list type="bullet">
///   <item>Tracing：<c>AspNetCore</c> + <c>HttpClient</c> 自动埋点，并订阅所有 <c>Cjora.*</c> ActivitySource；</item>
///   <item>Metrics：<c>AspNetCore</c> + <c>HttpClient</c> + <c>Runtime</c> 自动指标 + <c>Cjora.*</c> Meter；</item>
///   <item>资源属性：<c>service.name</c> / <c>service.instance.id</c> 与日志字段一致；</item>
///   <item>默认不启用任何外部导出器（Jaeger/OTLP/Zipkin/ELK 均不引入），仅开发环境可通过配置启用 Console Exporter。</item>
/// </list>
/// </remarks>
public static class CjoraObservabilityExtensions
{
    /// <summary>
    /// 注册 Cjora.SaaS 的 OpenTelemetry Tracing + Metrics 管道。
    /// 必须在 <see cref="IServiceCollection"/> 调用 <c>AddCjoraLogging</c> 之后或与其并列调用。
    /// </summary>
    /// <param name="services">DI 容器。</param>
    /// <param name="configuration">配置源（用于读取 <see cref="RequestLoggingOptions"/> 与 <c>CjoraObservability:ConsoleExporter</c>）。</param>
    /// <param name="configureTracing">可选：追加自定义 ActivitySource 等。</param>
    /// <param name="configureMetrics">可选：追加自定义 Meter 等。</param>
    public static IServiceCollection AddCjoraObservability(
        this IServiceCollection services,
        IConfiguration configuration,
        Action<TracerProviderBuilder>? configureTracing = null,
        Action<MeterProviderBuilder>? configureMetrics = null)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        var options = new RequestLoggingOptions();
        configuration.GetSection(RequestLoggingOptions.SectionName).Bind(options);

        var enableConsoleExporter = configuration
            .GetValue($"{RequestLoggingOptions.SectionName}:ConsoleExporter", defaultValue: false);

        services.AddSingleton<HttpRequestMetrics>();

        var resource = ResourceBuilder.CreateDefault()
            .AddService(
                serviceName: options.ServiceName,
                serviceInstanceId: options.InstanceId)
            .AddAttributes(new KeyValuePair<string, object>[]
            {
                new("cjora.namespace", CjoraTelemetry.Namespace)
            });

        services.AddOpenTelemetry()
            .ConfigureResource(r => r.AddService(options.ServiceName, serviceInstanceId: options.InstanceId))
            .WithTracing(tracing =>
            {
                tracing
                    .SetResourceBuilder(resource)
                    .AddSource(CjoraTelemetry.DefaultActivitySources.ToArray())
                    .AddAspNetCoreInstrumentation(o =>
                    {
                        // health / swagger 等不进入链路，降低开销与存储成本
                        o.Filter = ctx =>
                        {
                            var path = ctx.Request.Path.Value ?? "/";
                            return !options.ExcludePaths.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase));
                        };
                        o.RecordException = true;
                    })
                    .AddHttpClientInstrumentation();

                configureTracing?.Invoke(tracing);

                if (enableConsoleExporter)
                {
                    tracing.AddConsoleExporter();
                }
            })
            .WithMetrics(metrics =>
            {
                metrics
                    .SetResourceBuilder(resource)
                    .AddMeter(CjoraTelemetry.DefaultMeters.ToArray())
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation()
                    .AddRuntimeInstrumentation();

                configureMetrics?.Invoke(metrics);

                if (enableConsoleExporter)
                {
                    metrics.AddConsoleExporter();
                }
            });

        return services;
    }
}
