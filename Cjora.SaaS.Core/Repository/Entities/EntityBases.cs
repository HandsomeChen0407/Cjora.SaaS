using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.Repository.Abstractions;
using SqlSugar;

namespace Cjora.SaaS.Core.Repository.Entities;

/// <summary>
/// 标准雪花 long 主键实体基类。
/// </summary>
public abstract class SnowflakeEntityBase
{
    [SugarColumn(ColumnName = "id", IsPrimaryKey = true, IsIdentity = false, IsNullable = false)]
    public long Id { get; set; } = SnowFlakeSingle.Instance.NextId();
}

/// <summary>
/// 带创建/更新时间的审计实体基类。
/// </summary>
public abstract class AuditedEntityBase : SnowflakeEntityBase
{
    [SugarColumn(ColumnName = "created_at_utc", IsNullable = false)]
    public DateTime CreatedAtUtc { get; set; }

    [SugarColumn(ColumnName = "updated_at_utc", IsNullable = true)]
    public DateTime? UpdatedAtUtc { get; set; }
}

/// <summary>
/// 带软删除与审计字段的标准实体基类。
/// </summary>
public abstract class SoftDeleteAuditedEntityBase : AuditedEntityBase, ISoftDeleteEntity
{
    [SugarColumn(ColumnName = "is_deleted", IsNullable = false)]
    public bool IsDeleted { get; set; }

    [SugarColumn(ColumnName = "deleted_at_utc", IsNullable = true)]
    public DateTime? DeletedAtUtc { get; set; }

    [SugarColumn(ColumnName = "deleter_user_id", IsNullable = true)]
    public long? DeleterUserId { get; set; }
}

/// <summary>
/// 带租户标识、软删除与审计字段的标准实体基类。
/// 其中 <c>TenantId</c> 的值语义仍为租户编码字符串。
/// </summary>
public abstract class TenantEntityBase : SoftDeleteAuditedEntityBase, ITenantScopedEntity
{
    [SugarColumn(ColumnName = "tenant_id", Length = 64, IsNullable = false)]
    public string TenantId { get; set; } = "";
}

/// <summary>
/// 带租户标识、创建人、软删除与审计字段的标准实体基类。
/// </summary>
public abstract class TenantCreatorEntityBase : TenantEntityBase, ICreatorOwnedEntity
{
    [SugarColumn(ColumnName = "creator_user_id", IsNullable = false)]
    public long CreatorUserId { get; set; }
}

/// <summary>
/// 带租户标识、部门、创建人、软删除与审计字段的标准实体基类。
/// </summary>
public abstract class TenantDepartmentEntityBase
    : TenantCreatorEntityBase, IDepartmentScopedEntity
{
    [SugarColumn(ColumnName = "department_id", IsNullable = false)]
    public long DepartmentId { get; set; }
}
