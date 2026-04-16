namespace Cjora.SaaS.Caching.Models;

/// <summary>
/// SaaS 缓存 Key 工厂。生成符合 <c>saas:{module}:{type}:{id}</c> 规范的 Key。
/// </summary>
public static class SaaSCacheKeys
{
    /// <summary>
    /// 版本号 Key，用于分布式失效。
    /// <para>格式：<c>saas:{module}:ver:{kind}:{tenantId}</c></para>
    /// </summary>
    public static string Version(string module, string kind, string tenantId)
        => $"saas:{module}:ver:{kind}:{tenantId}";

    /// <summary>
    /// 用户维度缓存 Key。
    /// <para>格式：<c>saas:{module}:{type}:user:{tenantId}:{userId}:v{version}</c></para>
    /// </summary>
    public static string UserScoped(string module, string type, string tenantId, long userId, string version)
        => $"saas:{module}:{type}:user:{tenantId}:{userId}:v{version}";

    /// <summary>
    /// 部门闭包表缓存 Key。
    /// <para>格式：<c>saas:{module}:dept:closure:{tenantId}:{rootId}:v{version}</c></para>
    /// </summary>
    public static string DepartmentClosure(string module, string tenantId, long rootDepartmentId, string version)
        => $"saas:{module}:dept:closure:{tenantId}:{rootDepartmentId}:v{version}";

    /// <summary>
    /// 分布式锁 Key。
    /// <para>格式：<c>saas:{module}:lock:{kind}:{id}</c></para>
    /// </summary>
    public static string Lock(string module, string kind, string id)
        => $"saas:{module}:lock:{kind}:{id}";
}
