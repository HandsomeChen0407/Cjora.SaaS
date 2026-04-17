using System.Diagnostics;
using Cjora.SaaS.Core.Auth.Abstractions;
using Cjora.SaaS.Caching.Abstractions;
using Cjora.SaaS.Caching.Models;
using Cjora.SaaS.Sys.Diagnostics;
using Cjora.SaaS.Sys.Infrastructure.Caching;
using Cjora.SaaS.Sys.Permissions;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Sys.Application.Permissions;

/// <summary>
/// 为有效权限码解析增加短 TTL 内存缓存。
/// </summary>
public sealed class CachingEffectivePermissionResolver : IEffectivePermissionResolver
{
    private const string Module = "sys";
    private readonly EffectivePermissionResolver _inner;
    private readonly ICachingService _cache;
    private readonly ILockService _lock;
    private readonly ICurrentUser _currentUser;
    private readonly SysSecurityCacheVersionStore _versions;
    private readonly CacheOptions _options;

    public CachingEffectivePermissionResolver(
        EffectivePermissionResolver inner,
        ICachingService cache,
        ILockService @lock,
        ICurrentUser currentUser,
        SysSecurityCacheVersionStore versions,
        IOptions<CacheOptions> options)
    {
        _inner = inner;
        _cache = cache;
        _lock = @lock;
        _currentUser = currentUser;
        _versions = versions;
        _options = options.Value;
    }

    /// <inheritdoc />
    public async Task<IReadOnlySet<string>> GetEffectivePermissionCodesAsync(long userId, CancellationToken cancellationToken = default)
    {
        if (userId <= 0 || string.IsNullOrEmpty(_currentUser.TenantId))
        {
            return await _inner.GetEffectivePermissionCodesAsync(userId, cancellationToken).ConfigureAwait(false);
        }

        var kindTag = new KeyValuePair<string, object?>(AuthTelemetry.Tags.Kind, "permission");
        using var activity = AuthTelemetry.ActivitySource.StartActivity(
            name: "auth.permission.resolve",
            kind: ActivityKind.Internal);
        activity?.SetTag(AuthTelemetry.Tags.Kind, "permission");

        var sw = Stopwatch.StartNew();
        string source = "fresh";
        try
        {
            var ver = await _versions.GetPermissionVersionAsync(cancellationToken).ConfigureAwait(false);
            var cacheKey = SaaSCacheKeys.UserScoped(Module, "perm", _currentUser.TenantId, userId, ver);

            var cached = await _cache.GetAsync<HashSet<string>>(cacheKey).ConfigureAwait(false);
            if (cached is not null)
            {
                source = "cache";
                AuthTelemetry.CacheHits.Add(1, kindTag);
                activity?.SetTag(AuthTelemetry.Tags.Source, source);
                return cached;
            }

            AuthTelemetry.CacheMisses.Add(1, kindTag);

            var lockKey = SaaSCacheKeys.Lock(Module, "perm", $"{_currentUser.TenantId}:{userId}");
            var handle = await _lock.TryAcquireAsync(lockKey, TimeSpan.FromSeconds(5), cancellationToken).ConfigureAwait(false);
            if (handle is not null)
            {
                await using (handle.ConfigureAwait(false))
                {
                    // double-check
                    cached = await _cache.GetAsync<HashSet<string>>(cacheKey).ConfigureAwait(false);
                    if (cached is not null)
                    {
                        source = "cache";
                        AuthTelemetry.CacheHits.Add(1, kindTag);
                        activity?.SetTag(AuthTelemetry.Tags.Source, source);
                        return cached;
                    }

                    var freshLocked = await _inner.GetEffectivePermissionCodesAsync(userId, cancellationToken).ConfigureAwait(false);
                    await _cache.SetAsync(
                            cacheKey,
                            freshLocked.ToHashSet(StringComparer.Ordinal),
                            TimeSpan.FromMinutes(Math.Clamp(_options.DefaultExpireMinutes, 5, 10)))
                        .ConfigureAwait(false);

                    source = "fresh";
                    activity?.SetTag(AuthTelemetry.Tags.Source, source);
                    return freshLocked;
                }
            }

            // 未抢到锁：直接重算（避免阻塞），但仍会写入缓存。
            source = "fresh_no_lock";
            var fresh = await _inner.GetEffectivePermissionCodesAsync(userId, cancellationToken).ConfigureAwait(false);
            await _cache.SetAsync(
                    cacheKey,
                    fresh.ToHashSet(StringComparer.Ordinal),
                    TimeSpan.FromMinutes(Math.Clamp(_options.DefaultExpireMinutes, 5, 10)))
                .ConfigureAwait(false);
            activity?.SetTag(AuthTelemetry.Tags.Source, source);
            return fresh;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            AuthTelemetry.ComputeErrors.Add(1, kindTag);
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            throw;
        }
        finally
        {
            sw.Stop();
            AuthTelemetry.PermissionComputeDuration.Record(sw.Elapsed.TotalMilliseconds,
                kindTag,
                new KeyValuePair<string, object?>(AuthTelemetry.Tags.Source, source));
        }
    }

    /// <inheritdoc />
    public async Task<IReadOnlySet<long>> GetEffectivePermissionIdsAsync(long userId, CancellationToken cancellationToken = default)
    {
        return await _inner.GetEffectivePermissionIdsAsync(userId, cancellationToken).ConfigureAwait(false);
    }
}
