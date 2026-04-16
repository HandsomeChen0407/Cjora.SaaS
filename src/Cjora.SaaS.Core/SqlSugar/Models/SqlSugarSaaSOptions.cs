using SqlSugar;

namespace Cjora.SaaS.Core.SqlSugar.Models;

/// <summary>
/// SqlSugar 多租户与数据权限集成所需的主连接、数据库类型及 AOP 行为开关。
/// </summary>
public sealed class SqlSugarSaaSOptions
{
    /// <summary>
    /// 「共享库」模式下的主连接串；当 <see cref="MultiTenancy.Models.TenantStorageRoutingContext.UsesSharedPhysicalDatabase"/> 为 <see langword="true"/> 时使用。
    /// </summary>
    public string MasterConnectionString { get; set; } = string.Empty;

    /// <summary>
    /// 数据库类型，默认 SQLite 便于本地与示例零配置运行。
    /// </summary>
    public DbType DbType { get; set; } = DbType.Sqlite;

    /// <summary>
    /// 是否为删除操作自动附加全局 <c>QueryFilter</c>（推荐开启，防止绕过查询直接删他租数据）。
    /// </summary>
    public bool EnableDeleteQueryFilter { get; set; } = true;

    /// <summary>
    /// 是否为表达式更新自动附加全局过滤器（实体方式更新仍建议先查询再更新）。
    /// </summary>
    public bool EnableUpdateQueryFilter { get; set; } = true;

    /// <summary>
    /// 插入时若实体实现 <see cref="DataPermission.Abstractions.ICreatorOwnedEntity"/> 且 <c>CreatorUserId==0</c>，则写入当前用户 Id。
    /// </summary>
    public bool AutoFillCreatorUserIdOnInsert { get; set; } = true;

    /// <summary>
    /// 单条 SQL 执行耗时超过该毫秒数时写入 Warning 日志（0 表示不记录耗时告警）。
    /// </summary>
    public int SlowSqlWarningMilliseconds { get; set; } = 100;
}

