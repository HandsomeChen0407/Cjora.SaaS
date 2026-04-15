using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.DataPermission.Enums;
using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Cjora.SaaS.Core.Repository.Abstractions;
using Cjora.SaaS.Core.SqlSugar.Abstractions;
using Cjora.SaaS.Core.SqlSugar.Models;
using Microsoft.Extensions.DependencyInjection;
using SqlSugar;

namespace Cjora.SaaS.Core.SqlSugar.Providers;

/// <summary>
/// 创建已配置全局过滤器与 AOP 的 <see cref="ISqlSugarClient"/>（连接串由调用方决定）。
/// </summary>
internal static class SqlSugarSaaSClientBuilder
{
    internal static ISqlSugarClient Build(IServiceProvider services, string connectionString, SqlSugarSaaSOptions options)
    {
        var tenantProvider = services.GetRequiredService<ITenantProvider>();
        var dataPermission = services.GetRequiredService<IDataPermissionContext>();

        var client = new SqlSugarClient(new ConnectionConfig
        {
            DbType = options.DbType,
            ConnectionString = connectionString,
            IsAutoCloseConnection = true,
            MoreSettings = new ConnMoreSettings
            {
                IsAutoDeleteQueryFilter = options.EnableDeleteQueryFilter,
                IsAutoUpdateQueryFilter = options.EnableUpdateQueryFilter
            }
        });

        ApplyGlobalQueryFilters(client, services, tenantProvider, dataPermission);
        SqlSugarDataProtectionAop.RegisterCompositeDataExecuting(client, services, options, tenantProvider);

        return client;
    }

    private static void ApplyGlobalQueryFilters(
        ISqlSugarClient client,
        IServiceProvider services,
        ITenantProvider tenantProvider,
        IDataPermissionContext dataPermission)
    {
        // 租户：保持构建时绑定 ITenantProvider（与历史一致）。
        client.QueryFilter.AddTableFilter<ITenantScopedEntity>(
            entity => entity.TenantId == tenantProvider.GetTenantId(),
            QueryFilterProvider.FilterJoinPosition.Where);

        // Row-level（可插拔）：Core 不关心具体 SQL 形态（IN/EXISTS/JOIN）。
        // 业务实现层（如 Sys）通过 ISqlSugarDataPermissionFilterProvider 注入具体过滤器（要求不使用 IN）。
        foreach (var p in services.GetServices<ISqlSugarDataPermissionFilterProvider>())
        {
            p.Apply(client, dataPermission);
        }

        // Self：在表达式内保留 CurrentUserId>0，与历史「无效用户 Id 时整表不可见」一致，避免 CreatorUserId==0 行被误放行。
        client.QueryFilter.AddTableFilter<ICreatorOwnedEntity>(
            entity =>
                dataPermission.IsDisabled
                || dataPermission.BypassRowLevelFilters
                || (
                    dataPermission.Scope == DataScopeKind.Self
                    && dataPermission.CurrentUserId > 0
                    && entity.CreatorUserId == dataPermission.CurrentUserId
                )
                || dataPermission.Scope != DataScopeKind.Self,
            QueryFilterProvider.FilterJoinPosition.Where);
    }
}
