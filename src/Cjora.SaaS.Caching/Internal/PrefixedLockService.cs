using Cjora.SaaS.Caching.Abstractions;
using Cjora.SaaS.Caching.Models;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Caching.Internal;

/// <summary>
/// <see cref="ILockService"/> 装饰器：在委托给底层实现之前把 <see cref="CacheOptions.KeyPrefix"/>
/// 应用到锁 key 上。
/// </summary>
/// <remarks>
/// <para><b>为什么需要：</b>历史实现里 <see cref="ILockService.TryAcquireAsync"/> 的 key 直接由业务传入，
/// 而 <see cref="Providers.CacheManager"/> 只对 cache 读写做了前缀化。这造成多环境 / 多租户共享同一 Redis
/// 时，cache key 正确隔离、<b>锁 key 却会跨环境串台</b>（A 环境抢到的锁让 B 环境其它业务阻塞，或反之），
/// 最坏情况下跨环境双写。此装饰器把两条路径拉到同一前缀体系下。</para>
/// <para><b>对外透明：</b>返回的 <see cref="ILockHandle"/> 暴露的 <c>Key</c> 保留调用方原始 key，避免日志 /
/// 诊断里出现带前缀的别名。</para>
/// </remarks>
internal sealed class PrefixedLockService : ILockService
{
    private readonly ILockService _inner;
    private readonly IOptionsMonitor<CacheOptions> _optionsMonitor;

    public PrefixedLockService(ILockService inner, IOptionsMonitor<CacheOptions> optionsMonitor)
    {
        _inner = inner;
        _optionsMonitor = optionsMonitor;
    }

    public async Task<ILockHandle?> TryAcquireAsync(string key, TimeSpan ttl, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(key))
            return null;

        var prefixed = _optionsMonitor.CurrentValue.ApplyKeyPrefix(key);
        var handle = await _inner.TryAcquireAsync(prefixed, ttl, cancellationToken).ConfigureAwait(false);
        if (handle is null)
            return null;

        // 若底层实现没有拼前缀（prefix 为空），直接透传避免多一层包装开销。
        return ReferenceEquals(prefixed, key) ? handle : new HandleWrapper(handle, key);
    }

    private sealed class HandleWrapper : ILockHandle
    {
        private readonly ILockHandle _inner;

        public HandleWrapper(ILockHandle inner, string originalKey)
        {
            _inner = inner;
            Key = originalKey;
        }

        public string Key { get; }

        public CancellationToken LockLost => _inner.LockLost;

        public ValueTask DisposeAsync() => _inner.DisposeAsync();
    }
}
