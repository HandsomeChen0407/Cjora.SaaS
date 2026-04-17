using Cjora.SaaS.Core.Diagnostics;
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
    private static readonly AsyncLocal<Activity?> SqlExecActivity = new();

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
        var dbDialect = options.DbType.ToString().ToLowerInvariant();

        client.Aop.OnLogExecuting = (sql, _) =>
        {
            SqlExecStopwatch.Value = Stopwatch.StartNew();
            guard?.Enter();

            // 开启 DB Span（OTel 语义约定：span kind = Client，span name = "db.{op}"）
            // 只在当前上下文存在 Activity（即 HTTP 请求 / 业务手动起的 span）时开启，避免背景任务无谓产生孤儿 Span。
            // 如需在 BackgroundService 里也观测到 DB span，业务应先 ActivitySource.StartActivity 再访问 DbContext。
            var op = DataTelemetry.ClassifyOperation(sql);
            var activity = DataTelemetry.ActivitySource.StartActivity(
                name: $"db.{op}",
                kind: ActivityKind.Client);

            if (activity is not null)
            {
                activity.SetTag("db.system", "sqlsugar");
                activity.SetTag("db.dialect", dbDialect);
                activity.SetTag("db.operation", op);
                // 不记录完整 SQL 以避免 PII 泄漏 / 高基数；仅摘要前 N 字符。
                activity.SetTag("db.statement.summary", Summarize(sql, maxLen: 256));
            }
            SqlExecActivity.Value = activity;
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
            var op = DataTelemetry.ClassifyOperation(sql);

            // 指标：耗时直方图 + 慢 SQL 计数（标签低基数）
            var tagSystem = new KeyValuePair<string, object?>("db.system", "sqlsugar");
            var tagDialect = new KeyValuePair<string, object?>("db.dialect", dbDialect);
            var tagOp = new KeyValuePair<string, object?>("db.operation", op);
            DataTelemetry.QueryDuration.Record(elapsed, tagSystem, tagDialect, tagOp);

            var threshold = options.SlowSqlWarningMilliseconds;
            if (threshold > 0 && elapsed >= threshold)
            {
                DataTelemetry.SlowQueries.Add(1, tagSystem, tagDialect, tagOp);
                logger?.LogWarning(
                    "SqlSugar slow SQL {ElapsedMs}ms (threshold {Threshold}ms). Sql={Sql}",
                    elapsed,
                    threshold,
                    sql);
            }

            // 关闭 DB Span
            var activity = SqlExecActivity.Value;
            SqlExecActivity.Value = null;
            activity?.SetTag("db.duration_ms", elapsed);
            activity?.Dispose();
        };
    }

    private static string Summarize(string? sql, int maxLen)
    {
        if (string.IsNullOrEmpty(sql)) return string.Empty;
        if (sql.Length <= maxLen) return sql;
        return sql[..maxLen] + "…";
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
            // 错误计数（标签维持低基数，SQL 文本不进入标签）
            var op = DataTelemetry.ClassifyOperation((ex as SqlSugarException)?.Sql);
            DataTelemetry.QueryErrors.Add(1,
                new KeyValuePair<string, object?>("db.system", "sqlsugar"),
                new KeyValuePair<string, object?>("db.operation", op),
                new KeyValuePair<string, object?>("exception.type", ex.GetType().Name));

            // 把异常信息标在当前 DB Span 上（若存在）
            var activity = SqlExecActivity.Value;
            if (activity is not null)
            {
                activity.SetStatus(ActivityStatusCode.Error, ex.Message);
                activity.SetTag("exception.type", ex.GetType().FullName);
                activity.SetTag("exception.message", ex.Message);
            }

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
