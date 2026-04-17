using Cjora.SaaS.Caching.Providers;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Cjora.SaaS.Caching.Internal;

/// <summary>
/// Memory Provider 的过期条目后台清理器。
/// </summary>
/// <remarks>
/// <para><b>为什么需要：</b><see cref="MemoryLockService"/> / <see cref="MemoryGeoService"/> /
/// <see cref="MemoryHashMapService"/> 只在"同 key 再次被访问"时才做惰性过期清理；对于 key 空间大且
/// 访问分布稀疏的业务（例如按 orderId / driverId 生成锁），过期条目会<b>永久驻留</b>内存，长期运行必然 OOM。</para>
/// <para><b>实现策略：</b>每分钟扫描一次各容器，按 ExpireAt 清理；扫描走 snapshot，不长时间持锁。</para>
/// </remarks>
internal sealed class MemoryExpirationReaper : BackgroundService
{
    private static readonly TimeSpan SweepInterval = TimeSpan.FromMinutes(1);

    private readonly MemoryLockService? _lockService;
    private readonly MemoryGeoService? _geoService;
    private readonly MemoryHashMapService? _hashMapService;
    private readonly ILogger<MemoryExpirationReaper> _logger;

    public MemoryExpirationReaper(
        IServiceProvider serviceProvider,
        ILogger<MemoryExpirationReaper> logger)
    {
        // 用 GetService（可空）以兼容测试场景只注册子集的情况。
        _lockService = (MemoryLockService?)serviceProvider.GetService(typeof(MemoryLockService));
        _geoService = (MemoryGeoService?)serviceProvider.GetService(typeof(MemoryGeoService));
        _hashMapService = (MemoryHashMapService?)serviceProvider.GetService(typeof(MemoryHashMapService));
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // 首次 sweep 延迟，避免启动期和其它 IHostedService 同步竞争。
        try { await Task.Delay(SweepInterval, stoppingToken).ConfigureAwait(false); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                _lockService?.SweepExpired();
                _geoService?.SweepExpired();
                _hashMapService?.SweepExpired();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "MemoryExpirationReaper sweep failed.");
            }

            try { await Task.Delay(SweepInterval, stoppingToken).ConfigureAwait(false); }
            catch (OperationCanceledException) { return; }
        }
    }
}
