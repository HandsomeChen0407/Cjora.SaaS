using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Cjora.SaaS.Core.Repository.Abstractions;
using Cjora.SaaS.Core.SqlSugar.Abstractions;
using Cjora.SaaS.Core.SqlSugar.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SqlSugar;
using System.Diagnostics;
using System.Threading;

namespace Cjora.SaaS.Core.SqlSugar.Providers;

/// <summary>
/// 创建已配置全局过滤器与 AOP 的 <see cref="ISqlSugarClient"/>（连接串由调用方决定）。
/// </summary>
/// <remarks>
/// 全局 QueryFilter 仅保留租户隔离与软删除；行级数据权限（部门/项目/客户/本人）
/// 由服务层通过 <c>.WithDataPermission()</c> 扩展方法显式附加。
/// </remarks>
internal static class SqlSugarSaaSClientBuilder
{
    private static readonly AsyncLocal<Stopwatch?> SqlExecStopwatch = new();

    internal static ISqlSugarClient Build(IServiceProvider services, string connectionString, SqlSugarSaaSOptions options)
    {
        var tenantProvider = services.GetRequiredService<ITenantProvider>();

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

        ApplyGlobalQueryFilters(client, tenantProvider);
        SqlSugarDataProtectionAop.RegisterCompositeDataExecuting(client, services, options, tenantProvider);
        RegisterClientGuard(client, services, options);
        RegisterSqlDiagnostics(client, services);

        return client;
    }

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

    /// <summary>
    /// 仅注册租户隔离与软删除全局过滤器。行级数据权限由服务层 <c>.WithDataPermission()</c> 显式处理。
    /// </summary>
    private static void ApplyGlobalQueryFilters(
        ISqlSugarClient client,
        ITenantProvider tenantProvider)
    {
        client.QueryFilter.AddTableFilter<ISoftDeleteEntity>(
            entity => !entity.IsDeleted,
            QueryFilterProvider.FilterJoinPosition.Where);

        client.QueryFilter.AddTableFilter<ITenantScopedEntity>(
            entity => entity.TenantId == tenantProvider.GetTenantId(),
            QueryFilterProvider.FilterJoinPosition.Where);
    }
}
