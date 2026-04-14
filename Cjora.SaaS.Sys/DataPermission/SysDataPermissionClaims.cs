using Cjora.SaaS.Core.DataPermission;

namespace Cjora.SaaS.Sys.DataPermission;

/// <summary>
/// 与 <see cref="DataPermissionClaimOptions"/> 默认值一致的声明类型/取值常量，便于发令牌与 Core 的 <see cref="DefaultDataPermissionContext"/> 对齐。
/// </summary>
/// <remarks>
/// 若宿主自定义了 <see cref="DataPermissionClaimOptions"/>，应使用相同字符串；此处常量与 Core 默认保持同步。
/// </remarks>
public static class SysDataPermissionClaims
{
    /// <summary>与 <see cref="DataPermissionClaimOptions.DataScopeClaimType"/> 默认一致。</summary>
    public const string DataScope = "data_scope";

    /// <summary>与 <see cref="DataPermissionClaimOptions.DepartmentIdsClaimType"/> 默认一致。</summary>
    public const string DepartmentIds = "dept_ids";

    /// <summary>与 <see cref="DataPermissionClaimOptions.BypassRowLevelFiltersClaimType"/> 默认一致。</summary>
    public const string BypassRowLevelFilters = "bypass_row_filters";

    /// <summary>与 <see cref="DataPermissionClaimOptions.BypassRowFiltersClaimValue"/> 默认一致。</summary>
    public const string BypassRowFiltersValue = "1";
}
