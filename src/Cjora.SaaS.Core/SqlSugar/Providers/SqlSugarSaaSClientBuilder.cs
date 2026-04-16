using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.DataPermission.Enums;
using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Cjora.SaaS.Core.Repository.Abstractions;
using Cjora.SaaS.Core.SqlSugar.Abstractions;
using Cjora.SaaS.Core.SqlSugar.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SqlSugar;
using System.Diagnostics;
using System.Linq;
using System.Threading;

namespace Cjora.SaaS.Core.SqlSugar.Providers;

/// <summary>
/// 创建已配置全局过滤器与 AOP 的 <see cref="ISqlSugarClient"/>（连接串由调用方决定）。
/// </summary>
internal static class SqlSugarSaaSClientBuilder
{
    private static readonly AsyncLocal<Stopwatch?> SqlExecStopwatch = new();

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
        RegisterClientGuard(client, services, options);
        RegisterSqlDiagnostics(client, services);

        return client;
    }

    /// <summary>
    /// 部门 / 项目 / 客户等范围必须由至少一个 <see cref="ISqlSugarDataPermissionFilterProvider"/> 声明 <see cref="ISqlSugarDataPermissionFilterProvider.HandledDataScopes"/> 覆盖，否则行级隔离失效。
    /// </summary>
    private static void EnsureDataScopeHandledByProviders(
        IDataPermissionContext dataPermission,
        ISqlSugarDataPermissionFilterProvider[] providers)
    {
        if (dataPermission.IsDisabled || dataPermission.BypassRowLevelFilters)
        {
            return;
        }

        if (!RequiresProviderHandledScope(dataPermission.Scope))
        {
            return;
        }

        if (providers.Any(p => p.HandledDataScopes.Contains(dataPermission.Scope)))
        {
            return;
        }

        throw new InvalidOperationException(
            $"No {nameof(ISqlSugarDataPermissionFilterProvider)} declares {nameof(ISqlSugarDataPermissionFilterProvider.HandledDataScopes)} for {nameof(DataScopeKind)}.{dataPermission.Scope}.");
    }

    private static bool RequiresProviderHandledScope(DataScopeKind scope) =>
        scope is DataScopeKind.Department or DataScopeKind.Project or DataScopeKind.Customer;

    private static void RegisterClientGuard(ISqlSugarClient client, IServiceProvider services, SqlSugarSaaSOptions options)
    {
        var guard = services.GetService<ISqlSugarClientGuard>();
        var logger = services.GetService<ILoggerFactory>()?.CreateLogger("SqlSugar");

        client.Aop.OnLogExecuting = (_, _) =>
        {
            SqlExecStopwatch.Value = Stopwatch.StartNew();
            guard?.Enter();
        };

        client.Aop.OnLogExecuted = (sql, _) =>
        {
            if (guard is Cjora.SaaS.Core.SqlSugar.Providers.AsyncLocalSqlSugarClientGuard)
            {
                Cjora.SaaS.Core.SqlSugar.Providers.AsyncLocalSqlSugarClientGuard.Exit();
            }

            var sw = SqlExecStopwatch.Value;
            SqlExecStopwatch.Value = null;
            var elapsed = sw?.ElapsedMilliseconds ?? 0;
            var threshold = options.SlowSqlWarningMilliseconds;
            if (threshold > 0 && elapsed >= threshold && logger is not null)
            {
                logger.LogWarning(
                    "SqlSugar slow SQL {ElapsedMs}ms (threshold {Threshold}ms). Sql={Sql}",
                    elapsed,
                    threshold,
                    sql);
            }
        };
    }

    private static void RegisterSqlDiagnostics(ISqlSugarClient client, IServiceProvider services)
    {
        var logger = services.GetService<ILoggerFactory>()?.CreateLogger("SqlSugar");
        if (logger is null)
        {
            return;
        }

        client.Aop.OnError = ex =>
        {
            if (ex is SqlSugarException sex)
            {
                logger.LogError(
                    sex,
                    "SqlSugar SQL error. Sql={Sql}",
                    sex.Sql);
            }
            else
            {
                logger.LogError(ex, "SqlSugar error");
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
        // 由宿主注册的业务模块通过 ISqlSugarDataPermissionFilterProvider 注入具体过滤器（要求不使用 IN）。
        var providers = services.GetServices<ISqlSugarDataPermissionFilterProvider>().ToArray();
        EnsureDataScopeHandledByProviders(dataPermission, providers);

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
