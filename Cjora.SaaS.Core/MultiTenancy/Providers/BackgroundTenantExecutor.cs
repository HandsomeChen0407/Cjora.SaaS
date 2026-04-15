using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Microsoft.Extensions.DependencyInjection;

namespace Cjora.SaaS.Core.MultiTenancy.Providers;

public sealed class BackgroundTenantExecutor : IBackgroundTenantExecutor
{
    private readonly ITenantContextSetter _tenantContext;
    private readonly IServiceScopeFactory _scopeFactory;

    public BackgroundTenantExecutor(ITenantContextSetter tenantContext, IServiceScopeFactory scopeFactory)
    {
        _tenantContext = tenantContext;
        _scopeFactory = scopeFactory;
    }

    public async Task RunAsync(string tenantId, Func<IServiceProvider, Task> action)
    {
        ArgumentNullException.ThrowIfNull(action);
        using (_tenantContext.Use(tenantId))
        using (var scope = _scopeFactory.CreateScope())
        {
            await action(scope.ServiceProvider).ConfigureAwait(false);
        }
    }
}

