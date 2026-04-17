using Cjora.SaaS.Logging.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Serilog;

namespace Cjora.SaaS.Logging.Hosting;

/// <summary>
/// Serilog 宿主集成扩展：以 Serilog 接管 <c>ILogger</c>，并强制挂载标准 Enricher。
/// 本项目不定义任何 <c>LoggerWrapper</c>；业务代码继续使用 <c>ILogger&lt;T&gt;</c>，底层 Provider 由 Serilog 提供。
/// </summary>
public static class CjoraSerilogHostingExtensions
{
    /// <summary>
    /// 在 <see cref="IHostBuilder"/> 上挂载 Serilog：
    /// <list type="number">
    ///   <item>从 <see cref="IConfiguration"/> 的 <c>Serilog</c> 节读取 sinks、MinimumLevel、Filter 等；</item>
    ///   <item>强制追加 <c>FromLogContext</c>、<c>WithMachineName</c>、<c>WithEnvironmentName</c>、<c>WithThreadId</c>；</item>
    ///   <item>把 <see cref="RequestLoggingOptions.ServiceName"/> 写成全局 <c>ServiceName</c> 字段。</item>
    /// </list>
    /// 所有配置项均可在 <c>appsettings.json</c> 覆盖；仅提供最小可用默认值（Console）。
    /// </summary>
    /// <param name="builder">Web 宿主 Builder。</param>
    /// <param name="configureOptions">可选：自定义请求日志选项（ServiceName / InstanceId / 排除路径）。</param>
    public static WebApplicationBuilder UseCjoraSerilog(
        this WebApplicationBuilder builder,
        Action<RequestLoggingOptions>? configureOptions = null)
    {
        ArgumentNullException.ThrowIfNull(builder);

        var options = new RequestLoggingOptions();
        // 配置优先级（从低到高，后者覆盖前者）：
        //   1) Options 默认值（程序集名 / 机器名）
        //   2) Program.cs 里的 lambda（作为"运行环境无关的默认 ServiceName"）
        //   3) appsettings.json 的 CjoraObservability 节（运维可调）
        // 反转原因见 Observability 审计报告 M-1：配置必须是单一可信源。
        configureOptions?.Invoke(options);
        builder.Configuration.GetSection(RequestLoggingOptions.SectionName).Bind(options);

        builder.Host.UseSerilog((context, services, configuration) =>
        {
            configuration
                .ReadFrom.Configuration(context.Configuration)
                .ReadFrom.Services(services)
                .Enrich.FromLogContext()
                .Enrich.WithMachineName()
                .Enrich.WithEnvironmentName()
                .Enrich.WithThreadId()
                .Enrich.WithProperty("ServiceName", options.ServiceName)
                .Enrich.WithProperty("InstanceId", options.InstanceId);

            // 若 appsettings 未显式配置任何 WriteTo，兜底写 Console；上层仍可通过配置关闭或替换
            if (!context.Configuration.GetSection("Serilog:WriteTo").GetChildren().Any())
            {
                configuration.WriteTo.Console(
                    outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] svc={ServiceName} mod={Module} trace={TraceId} tenant={TenantId} user={UserId} {SourceContext} {Message:lj}{NewLine}{Exception}");
            }
        });

        return builder;
    }
}
