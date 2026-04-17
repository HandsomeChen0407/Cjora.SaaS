namespace Cjora.SaaS.Caching.Models;

/// <summary>
/// SaaS 缓存 Key 工厂。生成符合 <c>saas:{module}:{type}:{id}</c> 规范的强类型 <see cref="CacheKey"/>。
/// </summary>
/// <remarks>
/// <para>所有返回的 <see cref="CacheKey"/> 均携带 <c>module</c> 字段，供 <c>ICacheManager</c> 按模块命中 TTL 策略。
/// 返回值可隐式转换为 <see cref="string"/>，兼容直接接受字符串的旧接口（如 <see cref="Abstractions.ICachingService"/>）。</para>
/// <para>长度上限由 <see cref="CacheKey.MaxKeyLength"/> 保证。环境 / 多租户隔离请通过 <c>CacheOptions.KeyPrefix</c> 叠加，
/// 不在本工厂内硬编码。</para>
/// </remarks>
public static class SaaSCacheKeys
{
    private const string Root = "saas";

    /// <summary>
    /// 版本号 Key，用于分布式失效。
    /// <para>格式：<c>saas:{module}:ver:{kind}:{tenantId}</c></para>
    /// </summary>
    public static CacheKey Version(string module, string kind, string tenantId)
    {
        Require(module, nameof(module));
        Require(kind, nameof(kind));
        Require(tenantId, nameof(tenantId));
        return new($"{Root}:{module}:ver:{kind}:{tenantId}", module);
    }

    /// <summary>
    /// 用户维度缓存 Key。
    /// <para>格式：<c>saas:{module}:{type}:user:{tenantId}:{userId}:v{version}</c></para>
    /// </summary>
    public static CacheKey UserScoped(string module, string type, string tenantId, long userId, string version)
    {
        Require(module, nameof(module));
        Require(type, nameof(type));
        Require(tenantId, nameof(tenantId));
        Require(version, nameof(version));
        return new($"{Root}:{module}:{type}:user:{tenantId}:{userId}:v{version}", module);
    }

    /// <summary>
    /// 部门闭包表缓存 Key。
    /// <para>格式：<c>saas:{module}:dept:closure:{tenantId}:{rootId}:v{version}</c></para>
    /// </summary>
    public static CacheKey DepartmentClosure(string module, string tenantId, long rootDepartmentId, string version)
    {
        Require(module, nameof(module));
        Require(tenantId, nameof(tenantId));
        Require(version, nameof(version));
        return new($"{Root}:{module}:dept:closure:{tenantId}:{rootDepartmentId}:v{version}", module);
    }

    /// <summary>
    /// 分布式锁 Key。
    /// <para>格式：<c>saas:{module}:lock:{kind}:{id}</c></para>
    /// </summary>
    public static CacheKey Lock(string module, string kind, string id)
    {
        Require(module, nameof(module));
        Require(kind, nameof(kind));
        Require(id, nameof(id));
        return new($"{Root}:{module}:lock:{kind}:{id}", module);
    }

    private static void Require(string? v, string name)
    {
        if (string.IsNullOrWhiteSpace(v))
            throw new ArgumentException($"'{name}' is required.", name);
    }
}
