using Cjora.SaaS.Core.MultiTenancy.Abstractions;

namespace Cjora.SaaS.Core.MultiTenancy.Providers;

/// <summary>
/// 基于 <see cref="AsyncLocal{T}"/> 的租户上下文设置器（后台任务专用）。
/// </summary>
public sealed class AsyncLocalTenantContextSetter : ITenantContextSetter
{
    private static readonly AsyncLocal<string?> AmbientTenantId = new();

    internal static string? GetAmbientTenantId() => AmbientTenantId.Value;

    public IDisposable Use(string tenantId)
    {
        if (string.IsNullOrWhiteSpace(tenantId))
        {
            throw new ArgumentException("tenantId cannot be empty.", nameof(tenantId));
        }

        var prior = AmbientTenantId.Value;
        AmbientTenantId.Value = tenantId.Trim();
        return new Pop(prior);
    }

    private sealed class Pop : IDisposable
    {
        private readonly string? _prior;
        private int _disposed;

        public Pop(string? prior) => _prior = prior;

        public void Dispose()
        {
            if (Interlocked.Exchange(ref _disposed, 1) != 0)
            {
                return;
            }

            AmbientTenantId.Value = _prior;
        }
    }
}

