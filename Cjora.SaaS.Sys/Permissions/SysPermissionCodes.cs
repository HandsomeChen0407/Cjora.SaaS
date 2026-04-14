namespace Cjora.SaaS.Sys.Permissions;

/// <summary>
/// 与角色 <c>PermissionCodesJson</c> 中字符串一致的权限码常量，便于在授权策略与种子数据中引用。
/// </summary>
public static class SysPermissionCodes
{
    /// <summary>查看用户。</summary>
    public const string UserRead = "sys.user.read";

    /// <summary>管理用户（增删改）。</summary>
    public const string UserManage = "sys.user.manage";

    /// <summary>查看角色。</summary>
    public const string RoleRead = "sys.role.read";

    /// <summary>管理角色（增删改、分配权限码）。</summary>
    public const string RoleManage = "sys.role.manage";
}
