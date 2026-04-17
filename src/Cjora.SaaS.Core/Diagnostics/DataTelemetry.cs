using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace Cjora.SaaS.Core.Diagnostics;

/// <summary>
/// 数据访问层（SqlSugar）的 OpenTelemetry 遥测定义：<see cref="ActivitySource"/> 与 <see cref="Meter"/>
/// 共用同一个名称 <c>Cjora.SaaS.Data</c>，便于 OTel 白名单统一订阅。
/// </summary>
/// <remarks>
/// <para>
/// 本类型<b>仅</b>定义命名与 instrument，不依赖 ASP.NET Core / Logging / OpenTelemetry 包，
/// 以保持 Core 模块在多宿主（WebApi / BackgroundWorker / Console）下的零依赖可用性。
/// </para>
/// <para>指标命名遵循 OTel 语义约定子集（<c>cjora.db.*</c>）：</para>
/// <list type="bullet">
///   <item><description><c>cjora.db.query.duration</c>（Histogram，单位 <c>ms</c>）— 每条 SQL 执行耗时；</description></item>
///   <item><description><c>cjora.db.query.slow</c>（Counter）— 超过阈值的慢 SQL 累计数；</description></item>
///   <item><description><c>cjora.db.query.errors</c>（Counter）— SqlSugar 抛出的错误次数。</description></item>
/// </list>
/// <para>
/// 标签只保留<b>低基数</b>维度：<c>db.system</c>（固定 <c>sqlsugar</c>）、<c>db.dialect</c>（mysql/mssql/...）、
/// <c>db.operation</c>（select/insert/update/delete/other）。<b>严禁</b>把完整 SQL 作为标签。
/// </para>
/// </remarks>
public static class DataTelemetry
{
    /// <summary>统一 ActivitySource / Meter 名称，与 <c>CjoraTelemetry.DataTelemetryName</c> 保持一致。</summary>
    public const string Name = "Cjora.SaaS.Data";

    /// <summary>DB 相关 span 起点（<c>db.sqlsugar.execute</c>）。</summary>
    public static readonly ActivitySource ActivitySource = new(Name);

    /// <summary>DB 相关指标发射器。</summary>
    public static readonly Meter Meter = new(Name);

    /// <summary>SQL 执行耗时（毫秒）。</summary>
    public static readonly Histogram<double> QueryDuration = Meter.CreateHistogram<double>(
        name: "cjora.db.query.duration",
        unit: "ms",
        description: "SqlSugar 单次 SQL 执行耗时。");

    /// <summary>慢 SQL 累计数（阈值由 <c>SqlSugarSaaSOptions.SlowSqlWarningMilliseconds</c> 决定）。</summary>
    public static readonly Counter<long> SlowQueries = Meter.CreateCounter<long>(
        name: "cjora.db.query.slow",
        unit: "{query}",
        description: "SqlSugar 慢 SQL 累计数。");

    /// <summary>SQL 执行错误计数。</summary>
    public static readonly Counter<long> QueryErrors = Meter.CreateCounter<long>(
        name: "cjora.db.query.errors",
        unit: "{query}",
        description: "SqlSugar 执行过程中抛出的错误次数。");

    /// <summary>
    /// 从 SQL 文本推导 <c>db.operation</c> 标签值（低基数）。失败归为 <c>other</c>。
    /// </summary>
    public static string ClassifyOperation(string? sql)
    {
        if (string.IsNullOrEmpty(sql))
            return "other";

        ReadOnlySpan<char> span = sql.AsSpan().TrimStart();
        return span switch
        {
            _ when span.StartsWith("SELECT", StringComparison.OrdinalIgnoreCase) => "select",
            _ when span.StartsWith("INSERT", StringComparison.OrdinalIgnoreCase) => "insert",
            _ when span.StartsWith("UPDATE", StringComparison.OrdinalIgnoreCase) => "update",
            _ when span.StartsWith("DELETE", StringComparison.OrdinalIgnoreCase) => "delete",
            _ when span.StartsWith("MERGE", StringComparison.OrdinalIgnoreCase) => "merge",
            _ when span.StartsWith("CALL", StringComparison.OrdinalIgnoreCase) => "call",
            _ when span.StartsWith("EXEC", StringComparison.OrdinalIgnoreCase) => "exec",
            _ => "other"
        };
    }
}
