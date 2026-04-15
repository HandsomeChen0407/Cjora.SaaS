namespace Cjora.SaaS.Core.SqlSugar.Constants;

/// <summary>
/// 依赖注入中 Keyed <c>ISqlSugarClient</c>（见 SqlSugar 包）注册使用的键。
/// </summary>
public static class SqlSugarKeyedServiceKeys
{
    /// <summary>
    /// 始终连接 <see cref="Models.SqlSugarSaaSOptions.MasterConnectionString"/> 的客户端，用于仅存于平台/目录库的实体（例如租户注册表）。
    /// </summary>
    public const string Catalog = "CjoraSaaS.SqlSugar.Catalog";
}
