using Cjora.SaaS.Core.Auth.Abstractions;
using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Cjora.SaaS.Core.MultiTenancy.Models;
using Cjora.SaaS.Core.Repository.Abstractions;
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
        var dataPermission = services.GetRequiredService<IDataPermissionContext>();
        var options = services.GetRequiredService<IOptions<SqlSugarSaaSOptions>>().Value;

        if (string.IsNullOrWhiteSpace(options.MasterConnectionString))
        {
            throw new InvalidOperationException(
                $"{nameof(SqlSugarSaaSOptions)}.{nameof(SqlSugarSaaSOptions.MasterConnectionString)} 未配置，无法创建 ISqlSugarClient。");
        }

        var tenantId = tenantProvider.GetTenantId();
        var route = routingProvider.ResolveAsync(tenantId, CancellationToken.None).GetAwaiter().GetResult();

        var connectionString = route.UsesSharedPhysicalDatabase
            ? options.MasterConnectionString
            : route.DedicatedConnectionString
              ?? throw new InvalidOperationException(
                  $"租户 '{tenantId}' 使用独立物理库，但 {nameof(TenantStorageRoutingContext.DedicatedConnectionString)} 为空。");

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
        ApplyTenantAndCreatorAop(client, tenantProvider, services, options);

        return client;
    }

    private static void ApplyGlobalQueryFilters(
        ISqlSugarClient client,
        ITenantProvider tenantProvider,
        IDataPermissionContext dataPermission)
    {
        var tenantId = tenantProvider.GetTenantId();
        client.QueryFilter.AddTableFilter<ITenantScopedEntity>(
            entity => entity.TenantId == tenantId,
            QueryFilterProvider.FilterJoinPosition.Where);

        if (dataPermission.BypassRowLevelFilters)
        {
            return;
        }

        switch (dataPermission.Scope)
        {
            case DataPermission.Enums.DataScopeKind.Department:
                ApplyDepartmentFilter(client, dataPermission);
                break;
            case DataPermission.Enums.DataScopeKind.Self:
                ApplySelfFilter(client, dataPermission);
                break;
            case DataPermission.Enums.DataScopeKind.All:
            case DataPermission.Enums.DataScopeKind.Tenant:
            default:
                break;
        }
    }

    private static void ApplyDepartmentFilter(ISqlSugarClient client, IDataPermissionContext dataPermission)
    {
        var ids = dataPermission.AccessibleDepartmentIds.ToArray();
        if (ids.Length == 0)
        {
            client.QueryFilter.AddTableFilter<IDepartmentScopedEntity>(
                _ => false,
                QueryFilterProvider.FilterJoinPosition.Where);
            return;
        }

        client.QueryFilter.AddTableFilter<IDepartmentScopedEntity>(
            entity => ids.Contains(entity.DepartmentId),
            QueryFilterProvider.FilterJoinPosition.Where);
    }

    private static void ApplySelfFilter(ISqlSugarClient client, IDataPermissionContext dataPermission)
    {
        var uid = dataPermission.CurrentUserId;
        if (uid <= 0)
        {
            client.QueryFilter.AddTableFilter<ICreatorOwnedEntity>(
                _ => false,
                QueryFilterProvider.FilterJoinPosition.Where);
            return;
        }

        client.QueryFilter.AddTableFilter<ICreatorOwnedEntity>(
            entity => entity.CreatorUserId == uid,
            QueryFilterProvider.FilterJoinPosition.Where);
    }

    private static void ApplyTenantAndCreatorAop(
        ISqlSugarClient client,
        ITenantProvider tenantProvider,
        IServiceProvider services,
        SqlSugarSaaSOptions options)
    {
        client.Aop.DataExecuting = (oldValue, entityInfo) =>
        {
            if (entityInfo.OperationType is not (DataFilterType.InsertByObject or DataFilterType.UpdateByObject))
            {
                return;
            }

            if (entityInfo.PropertyName == nameof(ITenantScopedEntity.TenantId))
            {
                entityInfo.SetValue(tenantProvider.GetTenantId());
                return;
            }

            if (options.AutoFillCreatorUserIdOnInsert
                && entityInfo.OperationType == DataFilterType.InsertByObject
                && entityInfo.PropertyName == nameof(ICreatorOwnedEntity.CreatorUserId))
            {
                var user = services.GetService<ICurrentUser>();
                if (user is not { UserId: > 0 })
                {
                    return;
                }

                var current = oldValue is long l ? l : 0L;
                if (current == 0)
                {
                    entityInfo.SetValue(user.UserId);
                }
            }
        };
    }
}

