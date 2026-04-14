using Cjora.SaaS.Core.Repository;
using SqlSugar;

namespace Cjora.SaaS.Sys.Entities;

/// <summary>
/// IAM 中带自增 long 主键、租户列与 UTC 审计字段的实体基类。
/// </summary>
/// <remarks>
/// <para>
/// <see cref="ITenantScopedEntity.TenantId"/>：在宿主已注册 Core 的 SqlSugar 集成（<c>SqlSugarTenantClientFactory</c>）时，插入与更新会通过 AOP 覆盖为当前
/// <see cref="Cjora.SaaS.Core.MultiTenancy.ITenantProvider"/> 解析的租户标识；调用方<strong>无需</strong>为写入而手动赋值，也不应信任客户端传入的租户列。
/// </para>
/// <para>
/// <see cref="CreatedAtUtc"/> / <see cref="UpdatedAtUtc"/>：仍由业务在保存前赋值，或由宿主统一的审计管线维护（Core 默认不会自动填这两项）。
/// </para>
/// </remarks>
public abstract class SysLongIdTenantAuditedEntity : ITenantScopedEntity
{
    /// <summary>主键。</summary>
    [SugarColumn(ColumnName = "id", IsPrimaryKey = true, IsIdentity = false, IsNullable = false)]
    public long Id { get; set; }

    /// <inheritdoc />
    [SugarColumn(ColumnName = "tenant_id", Length = 64, IsNullable = false)]
    public string TenantId { get; set; } = "";

    /// <summary>创建时间（UTC）。</summary>
    [SugarColumn(ColumnName = "created_at_utc", IsNullable = false)]
    public DateTime CreatedAtUtc { get; set; }

    /// <summary>更新时间（UTC）。</summary>
    [SugarColumn(ColumnName = "updated_at_utc", IsNullable = true)]
    public DateTime? UpdatedAtUtc { get; set; }
}
