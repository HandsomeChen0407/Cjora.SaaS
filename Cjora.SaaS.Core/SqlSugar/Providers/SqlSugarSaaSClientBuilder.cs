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
/// <remarks>
/// <para>
/// <b>租户 QueryFilter</b>：过滤表达式中对租户 Id 的判定使用
/// <c>tenantProvider.GetTenantId()</c> 的<strong>运行时调用</strong>，避免将 Scoped 解析结果捕获为常量写入表达式树导致
/// 后台任务或错误复用客户端时的串租风险（与仅依赖请求作用域解析器的架构一致）。
/// </para>
/// </remarks>
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
        client.QueryFilter.AddTableFilter<ITenantScopedEntity>(
            entity => entity.TenantId == tenantProvider.GetTenantId(),
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
        if (dataPermission.CurrentUserId <= 0)
        {
            client.QueryFilter.AddTableFilter<ICreatorOwnedEntity>(
                _ => false,
                QueryFilterProvider.FilterJoinPosition.Where);
            return;
        }

        client.QueryFilter.AddTableFilter<ICreatorOwnedEntity>(
            entity => entity.CreatorUserId == dataPermission.CurrentUserId,
            QueryFilterProvider.FilterJoinPosition.Where);
    }
}
