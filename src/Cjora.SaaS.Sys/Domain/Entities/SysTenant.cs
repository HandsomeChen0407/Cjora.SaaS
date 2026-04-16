using Cjora.SaaS.Core.Repository.Entities;
using SqlSugar;

namespace Cjora.SaaS.Sys.Entities;

/// <summary>
/// 租户主数据。数据库主键使用 long，自然租户标识统一使用 <see cref="TenantCode"/>。
/// </summary>
/// <remarks>
/// 不实现 <see cref="Cjora.SaaS.Core.Repository.ITenantScopedEntity"/>。独立物理库场景下本表通常仅在平台主库存在。
/// </remarks>
[SugarTable("sys_tenant")]
[SugarIndex("uk_sys_tenant_code", nameof(TenantCode), OrderByType.Asc, IsUnique = true)]
public sealed class SysTenant : SoftDeleteAuditedEntityBase
{
    /// <summary>
    /// 对外与跨服务使用的稳定租户编码。
    /// </summary>
    [SugarColumn(ColumnName = "tenant_code", Length = 64, IsNullable = false)]
    public string TenantCode { get; set; } = "";

    /// <summary>
    /// 租户显示名称。
    /// </summary>
    [SugarColumn(ColumnName = "name", Length = 256, IsNullable = false)]
    public string Name { get; set; } = "";

    /// <summary>
    /// 是否启用；禁用后业务层应拒绝该租户登录或访问。
    /// </summary>
    [SugarColumn(ColumnName = "is_active", IsNullable = false)]
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// 非空时表示该租户业务数据使用独立物理库；连接串仅存于平台主库，由 Sys 模块的目录库路由提供器解析。
    /// </summary>
    [SugarColumn(ColumnName = "dedicated_database_connection_string", Length = 2048, IsNullable = true)]
    public string? DedicatedDatabaseConnectionString { get; set; }
}
