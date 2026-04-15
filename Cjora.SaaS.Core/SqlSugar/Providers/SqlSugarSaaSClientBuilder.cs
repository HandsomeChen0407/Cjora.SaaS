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
        RegisterClientGuard(client, services);

        return client;
    }

    private static void RegisterClientGuard(ISqlSugarClient client, IServiceProvider services)
    {
        var guard = services.GetService<ISqlSugarClientGuard>();
        if (guard is null)
        {
            return;
        }

        // Fail-Fast 并发检测：进入执行前标记，执行后清理。
        client.Aop.OnLogExecuting = (_, _) => guard.Enter();
        client.Aop.OnLogExecuted = (_, _) =>
        {
            if (guard is Cjora.SaaS.Core.SqlSugar.Providers.AsyncLocalSqlSugarClientGuard)
            {
                Cjora.SaaS.Core.SqlSugar.Providers.AsyncLocalSqlSugarClientGuard.Exit();
            }
        };
    }

    private static void ApplyGlobalQueryFilters(
        ISqlSugarClient client,
        IServiceProvider services,
        ITenantProvider tenantProvider,
        IDataPermissionContext dataPermission)
    {
        // 软删除：全局排除已逻辑删除的行，调用方无需手写 !IsDeleted。
        client.QueryFilter.AddTableFilter<ISoftDeleteEntity>(
            entity => !entity.IsDeleted,
            QueryFilterProvider.FilterJoinPosition.Where);

        // 租户：保持构建时绑定 ITenantProvider（与历史一致）。
        client.QueryFilter.AddTableFilter<ITenantScopedEntity>(
            entity => entity.TenantId == tenantProvider.GetTenantId(),
            QueryFilterProvider.FilterJoinPosition.Where);

        // Row-level（可插拔）：Core 不关心具体 SQL 形态（IN/EXISTS/JOIN）。
        // 业务实现层（如 Sys）通过 ISqlSugarDataPermissionFilterProvider 注入具体过滤器（要求不使用 IN）。
        var providers = services.GetServices<ISqlSugarDataPermissionFilterProvider>().ToArray();
        if (dataPermission.Scope == DataScopeKind.Department && providers.Length == 0)
        {
            throw new InvalidOperationException(
                "No ISqlSugarDataPermissionFilterProvider registered. Department scope is unsafe.");
        }

        foreach (var p in providers)
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
