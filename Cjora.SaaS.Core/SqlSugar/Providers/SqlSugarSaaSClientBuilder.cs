using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.DataPermission.Enums;
using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Cjora.SaaS.Core.Repository.Abstractions;
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

        ApplyGlobalQueryFilters(client, tenantProvider, dataPermission);
        SqlSugarDataProtectionAop.RegisterCompositeDataExecuting(client, services, options, tenantProvider);

        return client;
    }

    private static void ApplyGlobalQueryFilters(
        ISqlSugarClient client,
        ITenantProvider tenantProvider,
        IDataPermissionContext dataPermission)
    {
        // 租户：保持构建时绑定 ITenantProvider（与历史一致）。
        client.QueryFilter.AddTableFilter<ITenantScopedEntity>(
            entity => entity.TenantId == tenantProvider.GetTenantId(),
            QueryFilterProvider.FilterJoinPosition.Where);

        // RUNTIME: 行级权限必须在每次生成 SQL 时读取 IDataPermissionContext 属性；
        // 禁止在 Build 阶段 if (IsDisabled)/switch(Scope) 决定是否注册过滤器，否则 using (scope.Disable()) 在客户端已创建后无效。
        client.QueryFilter.AddTableFilter<IDepartmentScopedEntity>(
            entity =>
                dataPermission.IsDisabled
                || dataPermission.BypassRowLevelFilters
                || (
                    dataPermission.Scope == DataScopeKind.Department
                    && dataPermission.AccessibleDepartmentIds.Contains(entity.DepartmentId)
                )
                || dataPermission.Scope != DataScopeKind.Department,
            QueryFilterProvider.FilterJoinPosition.Where);

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
