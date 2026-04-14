using Cjora.SaaS.Core.Auth;
using Cjora.SaaS.Core.Auth.Abstractions;
using Cjora.SaaS.Core.DataPermission;
using Cjora.SaaS.Core.MultiTenancy;
using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Cjora.SaaS.Core.MultiTenancy.Models;
using Cjora.SaaS.Core.Repository;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using SqlSugar;

namespace Cjora.SaaS.Core.SqlSugarInfrastructure;

/// <summary>
/// 按当前 <see cref="ITenantProvider"/> 与 <see cref="ITenantStorageRoutingProvider"/> 创建 Scoped <see cref="ISqlSugarClient"/>，
/// 并配置全局过滤器与插入/更新 AOP。
/// </summary>
/// <remarks>
/// <para>
/// 工厂在依赖注入解析时同步等待路由解析；宿主应保证 <see cref="ITenantStorageRoutingProvider.ResolveAsync"/> 快速返回（缓存目录库结果）。
/// </para>
/// </remarks>
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

    /// <summary>
    /// 注册 SqlSugar 全局 <c>QueryFilter</c>：租户 +（可选）部门/本人数据权限，与 <see cref="IDataPermissionContext"/> 打通。
    /// </summary>
    private static void ApplyGlobalQueryFilters(
        ISqlSugarClient client,
        ITenantProvider tenantProvider,
        IDataPermissionContext dataPermission)
    {
        // 接口级过滤器：所有实现 ITenantScopedEntity 的实体在查询/更新/删除（若开启自动过滤器）时附加 TenantId 条件。
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
            case DataScopeKind.Department:
                ApplyDepartmentFilter(client, dataPermission);
                break;
            case DataScopeKind.Self:
                ApplySelfFilter(client, dataPermission);
                break;
            case DataScopeKind.All:
            case DataScopeKind.Tenant:
            default:
                break;
        }
    }

    private static void ApplyDepartmentFilter(ISqlSugarClient client, IDataPermissionContext dataPermission)
    {
        var ids = dataPermission.AccessibleDepartmentIds.ToArray();
        // 空集合在部分数据库上对 IN () 语法不友好，这里用永假条件表达「无可见部门」。
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

    /// <summary>
    /// 插入/更新执行前强制同步 <see cref="ITenantScopedEntity.TenantId"/>，并可自动填充创建人。
    /// </summary>
    private static void ApplyTenantAndCreatorAop(
        ISqlSugarClient client,
        ITenantProvider tenantProvider,
        IServiceProvider services,
        SqlSugarSaaSOptions options)
    {
        // SqlSugar 5.x：实体插入/更新使用 DataFilterType.InsertByObject / UpdateByObject；列级事件每个字段各触发一次，适合用 SetValue 写入。
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
