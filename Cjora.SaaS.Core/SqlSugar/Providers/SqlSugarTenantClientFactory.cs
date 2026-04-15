using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Cjora.SaaS.Core.MultiTenancy.Models;
using Cjora.SaaS.Core.SqlSugar.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using SqlSugar;

namespace Cjora.SaaS.Core.SqlSugar.Providers;

/// <summary>
/// 按当前 <see cref="ITenantProvider"/> 与 <see cref="ITenantStorageRoutingProvider"/> 创建 Scoped <see cref="ISqlSugarClient"/>，
/// 并配置全局过滤器与插入/更新 AOP。
/// </summary>
public static class SqlSugarTenantClientFactory
{
    /// <summary>
    /// 供 <c>services.AddScoped&lt;ISqlSugarClient&gt;(SqlSugarTenantClientFactory.Create);</c> 使用的工厂方法。
    /// </summary>
    public static ISqlSugarClient Create(IServiceProvider services)
    {
        var tenantProvider = services.GetRequiredService<ITenantProvider>();
        var routingProvider = services.GetRequiredService<ITenantStorageRoutingProvider>();
        var options = services.GetRequiredService<IOptions<SqlSugarSaaSOptions>>().Value;

        if (string.IsNullOrWhiteSpace(options.MasterConnectionString))
        {
            throw new InvalidOperationException(
                $"{nameof(SqlSugarSaaSOptions)}.{nameof(SqlSugarSaaSOptions.MasterConnectionString)} 未配置，无法创建 ISqlSugarClient。");
        }

        var tenantId = tenantProvider.GetTenantId();
        // 同步阻塞：必须 ConfigureAwait(false)，避免自定义路由解析中的 await 捕获同步上下文后与 GetResult 死锁。
        var route = routingProvider.ResolveAsync(tenantId, CancellationToken.None)
            .AsTask()
            .ConfigureAwait(false)
            .GetAwaiter()
            .GetResult();

        var connectionString = route.UsesSharedPhysicalDatabase
            ? options.MasterConnectionString
            : route.DedicatedConnectionString
              ?? throw new InvalidOperationException(
                  $"租户 '{tenantId}' 使用独立物理库，但 {nameof(TenantStorageRoutingContext.DedicatedConnectionString)} 为空。");

        var client = SqlSugarSaaSClientBuilder.Build(services, connectionString, options);
        var guard = services.GetService<Cjora.SaaS.Core.SqlSugar.Abstractions.ISqlSugarClientGuard>();
        return guard is null ? client : GuardedDispatchProxy<ISqlSugarClient>.Create(client, guard);
    }
}
