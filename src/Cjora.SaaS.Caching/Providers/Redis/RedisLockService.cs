using System.Diagnostics;
using Cjora.SaaS.Caching.Abstractions;
using Cjora.SaaS.Caching.Internal;
using Cjora.SaaS.Caching.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Cjora.SaaS.Caching.Providers;

/// <summary>基于 Redis SET NX PX + Lua 安全释放的分布式锁实现，支持后台自动续租。</summary>
/// <remarks>
/// <para><b>Dispose 顺序：</b><c>lockLostCts.Cancel()</c> → <c>timer.Dispose()</c> → 等待续租 Task（最长
/// <see cref="LockOptions.DisposeWaitTimeoutMs"/>）→ <c>ReleaseScript</c> → 最后才 <c>lockLostCts.Dispose()</c>。
/// 任何业务持有的 <see cref="ILockHandle.LockLost"/> token 在 Release 完成前始终可用，不会 <see cref="ObjectDisposedException"/>。</para>
/// <para><b>未解决的已知限制（文档化，不在代码层修复）：</b>Redis 网络分区场景下"本地认为持锁、实际已被他人获取"无法 100% 避免。
/// 业务 <b>必须</b> 在 <see cref="ILockHandle.LockLost"/> 上挂载取消，临界区代码可被中止。</para>
/// </remarks>
public sealed class RedisLockService : ILockService
{
    private const string ReleaseScript =
        "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end";

    private const string RenewScript =
        "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('PEXPIRE', KEYS[1], ARGV[2]) else return 0 end";

    private readonly IConnectionMultiplexer _mux;
    private readonly IOptionsMonitor<CacheOptions> _optionsMonitor;
    private readonly ILogger<RedisLockService> _logger;

    /// <summary>DI 构造。</summary>
    public RedisLockService(
        IConnectionMultiplexer mux,
        IOptionsMonitor<CacheOptions> optionsMonitor,
        ILogger<RedisLockService> logger)
    {
        _mux = mux;
        _optionsMonitor = optionsMonitor;
        _logger = logger;
    }

    private CacheOptions Options => _optionsMonitor.CurrentValue;

    private IDatabase Db => _mux.GetDatabase(Options.Redis.Database);

    /// <inheritdoc />
    public async Task<ILockHandle?> TryAcquireAsync(string key, TimeSpan ttl, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(key))
            return null;
        if (ttl <= TimeSpan.Zero)
            throw new ArgumentOutOfRangeException(nameof(ttl), "Lock TTL must be positive.");

        using var activity = CacheTelemetry.ActivitySource.StartActivity(
            name: "cache.lock.acquire",
            kind: ActivityKind.Client);
        activity?.SetTag("cjora.cache.provider", "Redis");
        activity?.SetTag("cjora.cache.lock_key", key);
        activity?.SetTag("cjora.cache.lock_ttl_ms", (long)ttl.TotalMilliseconds);

        var token = Guid.NewGuid().ToString("N");

        // 统计 acquire 耗时（网络抖动时可吃掉大段 TTL），传给 Handle 用于决定首次续租偏移，
        // 消除"PeriodicTimer 首 tick 要等满 interval 才续第一次"的延迟窗口。
        var sw = System.Diagnostics.Stopwatch.StartNew();
        var ok = await Db.StringSetAsync(key, token, ttl, when: When.NotExists).ConfigureAwait(false);
        sw.Stop();

        if (!ok)
        {
            CacheMetrics.LocksContended.Add(1, CacheMetrics.Provider("Redis"));
            activity?.SetTag("cjora.cache.lock_acquired", false);
            return null;
        }

        CacheMetrics.LocksAcquired.Add(1, CacheMetrics.Provider("Redis"));
        activity?.SetTag("cjora.cache.lock_acquired", true);
        activity?.SetTag("cjora.cache.acquire_elapsed_ms", sw.ElapsedMilliseconds);
        return new Handle(Db, key, token, ttl, Options.Lock, _logger, sw.Elapsed);
    }

    /// <summary>
    /// 锁句柄：通过 <see cref="PeriodicTimer"/> 做可控续租；续租返回 0（锁已不归属本 handle）时
    /// 立即 Cancel <see cref="LockLost"/>，业务可据此中止临界区。
    /// </summary>
    private sealed class Handle : ILockHandle
    {
        private readonly IDatabase _db;
        private readonly long _ttlMs;
        private readonly string _token;
        private readonly ILogger _logger;
        private readonly int _disposeWaitMs;
        private readonly PeriodicTimer? _timer;
        private readonly Task? _renewTask;
        private readonly CancellationTokenSource? _lockLostCts;
        private int _disposed;

        public string Key { get; }

        public CancellationToken LockLost => _lockLostCts?.Token ?? CancellationToken.None;

        public Handle(IDatabase db, string key, string token, TimeSpan ttl, LockOptions lockOptions, ILogger logger, TimeSpan acquireElapsed)
        {
            _db = db;
            Key = key;
            _token = token;
            _ttlMs = (long)ttl.TotalMilliseconds;
            _logger = logger;
            _disposeWaitMs = Math.Max(100, lockOptions.DisposeWaitTimeoutMs);

            if (!lockOptions.EnableAutoRenewal || ttl <= TimeSpan.FromSeconds(1))
                return;

            var ratio = Math.Clamp(
                lockOptions.RenewalIntervalRatio,
                LockOptions.MinRenewalIntervalRatio,
                LockOptions.MaxRenewalIntervalRatio);
            var intervalMs = Math.Max(200, ttl.TotalMilliseconds * ratio);

            // 首 tick 偏移：如果 acquire 已经吃掉了 >interval 的 TTL，将首 tick 压到 200ms 内尽快做第一次续租；
            // 否则按 (interval - acquireMs) 来让"第一次续租时锁总剩下 ≈ (ttl - interval)"，语义与稳定态一致。
            var firstTickMs = Math.Max(200, intervalMs - acquireElapsed.TotalMilliseconds);

            _lockLostCts = new CancellationTokenSource();
            _timer = new PeriodicTimer(TimeSpan.FromMilliseconds(intervalMs));
            // 先构造 PeriodicTimer 再启动任务，保证 _timer 对 RenewLoopAsync 可见。
            _renewTask = Task.Run(() => RenewLoopAsync(_timer, _lockLostCts, TimeSpan.FromMilliseconds(firstTickMs)));
        }

        private async Task RenewLoopAsync(PeriodicTimer timer, CancellationTokenSource lockLostCts, TimeSpan firstTickDelay)
        {
            try
            {
                // 首次 renew 不走 PeriodicTimer（它的首 tick 要等满 interval，期间若 acquire 已花了大量 TTL
                // 会出现"续租姗姗来迟"的死角）。走一次小 delay + 立即 renew，之后进入常规节拍。
                using (var cts = CancellationTokenSource.CreateLinkedTokenSource(lockLostCts.Token))
                {
                    try { await Task.Delay(firstTickDelay, cts.Token).ConfigureAwait(false); }
                    catch (OperationCanceledException) { return; }
                }

                if (!await TryRenewOnceAsync(lockLostCts).ConfigureAwait(false))
                    return;

                while (await timer.WaitForNextTickAsync().ConfigureAwait(false))
                {
                    if (!await TryRenewOnceAsync(lockLostCts).ConfigureAwait(false))
                        return;
                }
            }
            catch (OperationCanceledException)
            {
                // timer.Dispose() 会让 WaitForNextTickAsync 返回 false；保留 catch 以防万一。
            }
        }

        /// <summary>执行一次续租；返回 false 表示 "LockLost 已 Cancel，应退出循环"。</summary>
        private async Task<bool> TryRenewOnceAsync(CancellationTokenSource lockLostCts)
        {
            try
            {
                var result = (long)await _db.ScriptEvaluateAsync(
                    RenewScript,
                    new RedisKey[] { Key },
                    new RedisValue[] { _token, _ttlMs }).ConfigureAwait(false);

                if (result == 0)
                {
                    _logger.LogWarning("Lock ownership lost during renewal. Key={Key}", Key);
                    CacheMetrics.LocksLost.Add(1, CacheMetrics.Provider("Redis"));
                    lockLostCts.Cancel();
                    return false;
                }
                return true;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "Lock renewal transient failure, will retry. Key={Key}", Key);
                // 瞬时异常不取消 LockLost，等下一次 tick 再尝试；TTL 会兜底。
                return true;
            }
        }

        public async ValueTask DisposeAsync()
        {
            if (Interlocked.Exchange(ref _disposed, 1) == 1)
                return;

            // 1) 第一时间 Cancel LockLost：让临界区内"正在执行业务"的代码（监听了 LockLost 的）立即感知
            //    "我准备释放锁，接下来的工作不要再假设持锁"。配合 Dispose 过程可能与临界区并行这一现实，
            //    避免 "A DisposeAsync → Release 成功 → B 获得同 key 锁 → A 的后续写入仍基于'持锁'假设" 的幽灵双写。
            try { _lockLostCts?.Cancel(); } catch { /* 已 Dispose 等场景静默 */ }

            // 2) 停止续租 timer；等待续租任务退出（最长 DisposeWaitTimeoutMs），避免 Redis 卡死时阻塞进程 shutdown。
            _timer?.Dispose();
            if (_renewTask is not null)
            {
                try
                {
                    var completed = await Task
                        .WhenAny(_renewTask, Task.Delay(_disposeWaitMs))
                        .ConfigureAwait(false);
                    if (completed != _renewTask)
                        _logger.LogWarning(
                            "Lock renewal loop did not exit within {TimeoutMs}ms during Dispose. Key={Key}",
                            _disposeWaitMs, Key);
                }
                catch
                {
                    // 续租任务异常已在内部记录，不再级联。
                }
            }

            // 3) 释放 Redis 锁（Lua 原子比较 token + DEL），即使 Redis 慢也容忍其自然超时。
            using var releaseActivity = CacheTelemetry.ActivitySource.StartActivity(
                name: "cache.lock.release",
                kind: ActivityKind.Client);
            releaseActivity?.SetTag("cjora.cache.provider", "Redis");
            releaseActivity?.SetTag("cjora.cache.lock_key", Key);
            try
            {
                await _db.ScriptEvaluateAsync(ReleaseScript, new RedisKey[] { Key }, new RedisValue[] { _token })
                    .ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                releaseActivity?.SetStatus(ActivityStatusCode.Error, ex.Message);
                _logger.LogWarning(ex, "Lock release failed (TTL will fall back). Key={Key}", Key);
            }

            // 4) 最后才 Dispose CTS——整个 Dispose 过程 LockLost 仍可安全监听。
            _lockLostCts?.Dispose();
        }
    }
}
