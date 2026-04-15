namespace Cjora.SaaS.Core.MultiTenancy.Models;

/// <summary>
/// 租户存储路由选项：声明哪些逻辑租户使用独立物理库；未声明的租户仍使用 <see cref="SqlSugar.Models.SqlSugarSaaSOptions.MasterConnectionString"/>（共享库 + 列隔离）。
/// </summary>
public sealed class TenantStorageRoutingOptions
{
    /// <summary>
    /// 逻辑租户 Id 到独立库连接串的映射；键区分大小写。
    /// </summary>
    public Dictionary<string, string> DedicatedDatabaseConnectionStrings { get; set; } =
        new Dictionary<string, string>(StringComparer.Ordinal);
}
