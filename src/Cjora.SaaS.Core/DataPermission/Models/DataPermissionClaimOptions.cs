using Cjora.SaaS.Core.DataPermission.Enums;

namespace Cjora.SaaS.Core.DataPermission.Models;

/// <summary>
/// 从声明中解析 <see cref="IDataPermissionContext"/> 时使用的声明类型与默认值。
/// </summary>
public sealed class DataPermissionClaimOptions
{
    /// <summary>
    /// 数据范围声明类型，默认 <c>data_scope</c>。
    /// </summary>
    public string DataScopeClaimType { get; set; } = "data_scope";

    /// <summary>
    /// 可访问部门 Id 列表声明类型（逗号分隔），默认 <c>dept_ids</c>。
    /// </summary>
    public string DepartmentIdsClaimType { get; set; } = "dept_ids";

    /// <summary>
    /// 声明为「跳过行级过滤」时使用的值（与 <see cref="BypassRowLevelFiltersClaimType"/> 配对），默认 <c>1</c>。
    /// </summary>
    public string BypassRowFiltersClaimValue { get; set; } = "1";

    /// <summary>
    /// 跳过行级过滤声明类型，默认 <c>bypass_row_filters</c>。
    /// </summary>
    public string BypassRowLevelFiltersClaimType { get; set; } = "bypass_row_filters";

    /// <summary>
    /// 当缺少范围声明时使用的默认 <see cref="DataScopeKind"/>。
    /// </summary>
    public DataScopeKind DefaultScope { get; set; } = DataScopeKind.Tenant;
}
