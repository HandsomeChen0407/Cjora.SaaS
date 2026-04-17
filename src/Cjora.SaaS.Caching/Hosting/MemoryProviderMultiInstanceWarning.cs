using Cjora.SaaS.Caching.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Caching.Hosting;

/// <summary>
/// 启动时检测"Provider=Memory 但运行在多副本环境"的配置错误，发出明显告警。
/// </summary>
/// <remarks>
/// <para><b>背景：</b>Memory 实现的 <c>SetIfAbsent / Lock / InvalidationBus</c> 都是 <b>进程内</b> 语义。
/// 一旦被误部署到 k8s 多副本或 PM2 cluster 下，相同 key 在两个 pod 分别"获取锁成功" / "SetIfAbsent 成功"，
/// 业务临界区失去互斥，数据重复 / 幂等键丢失。</para>
/// <para><b>识别方式：</b>通过经典的 IIS / k8s / container 环境变量（<c>ASPNETCORE_INSTANCEID</c> 缺失时无能为力，
/// 但 <c>HOSTNAME</c> 通常存在且能辅助判断）。真正严谨的多实例探测需要注册中心 / 健康探针，这超出本模块范畴；
/// 此守卫只是让误配一眼可见。</para>
/// </remarks>
internal sealed class MemoryProviderMultiInstanceWarning : IHostedService
{
    private readonly IOptionsMonitor<CacheOptions> _optionsMonitor;
    private readonly ILogger<MemoryProviderMultiInstanceWarning> _logger;

    public MemoryProviderMultiInstanceWarning(
        IOptionsMonitor<CacheOptions> optionsMonitor,
        ILogger<MemoryProviderMultiInstanceWarning> logger)
    {
        _optionsMonitor = optionsMonitor;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        var provider = _optionsMonitor.CurrentValue.Provider ?? string.Empty;
        if (!string.Equals(provider, "Memory", StringComparison.OrdinalIgnoreCase))
            return Task.CompletedTask;

        // k8s 会设 KUBERNETES_SERVICE_HOST；Azure App Service 会设 WEBSITE_INSTANCE_ID；
        // Docker Compose 多副本下 HOSTNAME 会是随机短串。任一出现都可能意味着存在多副本风险。
        var looksLikeCluster =
            !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("KUBERNETES_SERVICE_HOST"))
            || !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("WEBSITE_INSTANCE_ID"))
            || !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("ECS_CONTAINER_METADATA_URI"));

        if (looksLikeCluster)
        {
            _logger.LogWarning(
                "Cjora.SaaS.Caching is running with Provider=Memory in what appears to be a clustered environment (hostname={Host}). "
                + "Memory provider gives NO cross-process consistency: Lock / SetIfAbsent / InvalidationBus are process-local only. "
                + "Switch to Provider=Redis for multi-instance deployments, or this is a latent data-correctness bug.",
                Environment.MachineName);
        }

        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
