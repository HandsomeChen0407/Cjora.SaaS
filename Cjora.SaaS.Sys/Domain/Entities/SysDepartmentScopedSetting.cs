using SqlSugar;

namespace Cjora.SaaS.Sys.Entities;

/// <summary>
/// 按部门划分的租户内配置项，用于在 Sys 模块内<strong>同时体现</strong> Core 的 <see cref="Cjora.SaaS.Core.DataPermission.Abstractions.IDepartmentScopedEntity"/> 与 <see cref="Cjora.SaaS.Core.DataPermission.Abstractions.ICreatorOwnedEntity"/> 能力（具体生效范围由 <see cref="Cjora.SaaS.Core.DataPermission.Enums.DataScopeKind"/> 决定）。
/// </summary>
/// <remarks>
/// 典型用途：部门级参数、开关；与 <see cref="SysDepartment"/> 主数据区分——本表行受数据权限过滤器约束。
/// </remarks>
[SugarTable("sys_department_scoped_setting")]
public sealed class SysDepartmentScopedSetting : SysLongIdDepartmentOwnedAuditedEntity
{
    /// <summary>配置键（租户+部门内唯一性由业务或唯一索引保证）。</summary>
    [SugarColumn(ColumnName = "config_key", Length = 256, IsNullable = false)]
    public string ConfigKey { get; set; } = "";

    /// <summary>配置值。</summary>
    [SugarColumn(ColumnName = "config_value", Length = 4000, IsNullable = true)]
    public string? ConfigValue { get; set; }
}
