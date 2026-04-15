using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.DataPermission.Enums;
using Cjora.SaaS.Core.Repository.Abstractions;
using SqlSugar;

namespace Cjora.SaaS.Sys.Entities;

/// <summary>
/// IAM 中带自增 long 主键、租户列、创建人及 UTC 审计字段的实体基类。
/// </summary>
/// <remarks>
/// <para>
/// <see cref="ITenantScopedEntity.TenantId"/>：在宿主已注册 Core 的 SqlSugar 集成（<c>SqlSugarTenantClientFactory</c>）时，插入与更新会通过 AOP 覆盖为当前
/// <see cref="Cjora.SaaS.Core.MultiTenancy.Abstractions.ITenantProvider"/> 解析的租户标识；调用方<strong>无需</strong>为写入而手动赋值。
/// </para>
/// <para>
/// <see cref="ICreatorOwnedEntity.CreatorUserId"/>：在 <see cref="Cjora.SaaS.Core.SqlSugar.Models.SqlSugarSaaSOptions.AutoFillCreatorUserIdOnInsert"/> 为 <see langword="true"/>（默认）且插入时该列为 <c>0</c> 时，由 Core AOP 写入当前 <see cref="Cjora.SaaS.Core.Auth.Abstractions.ICurrentUser.UserId"/>。
/// </para>
/// <para>
/// <see cref="CreatedAtUtc"/> / <see cref="UpdatedAtUtc"/>：仍由业务在保存前赋值，或由宿主统一的审计管线维护。
/// </para>
/// <para>
/// 实现 <see cref="ICreatorOwnedEntity"/> 后，在 <see cref="DataScopeKind.Self"/> 数据范围下，SqlSugar 全局过滤器会按创建人限制行集（见 Core <c>SqlSugarTenantClientFactory</c>）。
/// </para>
/// </remarks>
public abstract class SysLongIdTenantAuditedEntity : ITenantScopedEntity, ICreatorOwnedEntity
{
    /// <summary>主键。</summary>
    [SugarColumn(ColumnName = "id", IsPrimaryKey = true, IsIdentity = true, IsNullable = false)]
    public long Id { get; set; }

    /// <inheritdoc />
    [SugarColumn(ColumnName = "tenant_id", Length = 64, IsNullable = false)]
    public string TenantId { get; set; } = "";

    /// <inheritdoc />
    [SugarColumn(ColumnName = "creator_user_id", IsNullable = false)]
    public long CreatorUserId { get; set; }

    /// <summary>创建时间（UTC）。</summary>
    [SugarColumn(ColumnName = "created_at_utc", IsNullable = false)]
    public DateTime CreatedAtUtc { get; set; }

    /// <summary>更新时间（UTC）。</summary>
    [SugarColumn(ColumnName = "updated_at_utc", IsNullable = true)]
    public DateTime? UpdatedAtUtc { get; set; }
}

/// <summary>
/// 同时参与「部门行级」与「创建人」过滤的实体基类（对应 Core 中 <see cref="IDepartmentScopedEntity"/> 与 <see cref="ICreatorOwnedEntity"/>；数据范围由 <see cref="Cjora.SaaS.Core.DataPermission.IDataPermissionContext.Scope"/> 决定其一）。
/// </summary>
[SugarIndex("idx_tenant_dept", nameof(TenantId), OrderByType.Asc, nameof(DepartmentId), OrderByType.Asc)]
public abstract class SysLongIdDepartmentOwnedAuditedEntity : ITenantScopedEntity, IDepartmentScopedEntity, ICreatorOwnedEntity
{
    /// <summary>主键。</summary>
    [SugarColumn(ColumnName = "id", IsPrimaryKey = true, IsIdentity = true, IsNullable = false)]
    public long Id { get; set; }

    /// <inheritdoc />
    [SugarColumn(ColumnName = "tenant_id", Length = 64, IsNullable = false)]
    public string TenantId { get; set; } = "";

    /// <inheritdoc />
    [SugarColumn(ColumnName = "department_id", IsNullable = false)]
    public long DepartmentId { get; set; }

    /// <inheritdoc />
    [SugarColumn(ColumnName = "creator_user_id", IsNullable = false)]
    public long CreatorUserId { get; set; }

    /// <summary>创建时间（UTC）。</summary>
    [SugarColumn(ColumnName = "created_at_utc", IsNullable = false)]
    public DateTime CreatedAtUtc { get; set; }

    /// <summary>更新时间（UTC）。</summary>
    [SugarColumn(ColumnName = "updated_at_utc", IsNullable = true)]
    public DateTime? UpdatedAtUtc { get; set; }
}

/// <summary>
/// 租户注册表使用的字符串主键与 UTC 审计字段基类（无 <see cref="ITenantScopedEntity"/>）。
/// </summary>
public abstract class SysStringIdAuditedEntity
{
    /// <summary>主键，与业务表 <c>tenant_id</c> 同源。</summary>
    [SugarColumn(ColumnName = "id", IsPrimaryKey = true, Length = 64, IsNullable = false)]
    public string Id { get; set; } = "";

    /// <summary>创建时间（UTC）。</summary>
    [SugarColumn(ColumnName = "created_at_utc", IsNullable = false)]
    public DateTime CreatedAtUtc { get; set; }

    /// <summary>更新时间（UTC）。</summary>
    [SugarColumn(ColumnName = "updated_at_utc", IsNullable = true)]
    public DateTime? UpdatedAtUtc { get; set; }
}