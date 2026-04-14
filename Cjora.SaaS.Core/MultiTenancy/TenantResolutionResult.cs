namespace Cjora.SaaS.Core.MultiTenancy;

/// <summary>
/// 表示一次 HTTP 请求的租户解析结果。
/// </summary>
/// <remarks>
/// 类型保持小而不可变，便于在中间件边界传递。<see cref="ResolutionSourceName"/> 用于诊断、审计或与异常租户切换关联分析。
/// </remarks>
public sealed class TenantResolutionResult
{
    /// <summary>
    /// 初始化 <see cref="TenantResolutionResult"/>。
    /// </summary>
    /// <param name="tenantId">租户标识或回退默认值。</param>
    /// <param name="resolutionSourceName">来源标签，如 Header、JwtClaim。</param>
    /// <param name="usedDefaultFallback">是否因无 Contributor 命中而使用 <see cref="TenantOptions.DefaultTenantId"/>。</param>
    public TenantResolutionResult(string tenantId, string resolutionSourceName, bool usedDefaultFallback)
    {
        TenantId = tenantId;
        ResolutionSourceName = resolutionSourceName;
        UsedDefaultFallback = usedDefaultFallback;
    }

    /// <summary>
    /// 当前请求应采用的权威租户标识。
    /// </summary>
    public string TenantId { get; }

    /// <summary>
    /// 产生 <see cref="TenantId"/> 的策略名称。
    /// </summary>
    public string ResolutionSourceName { get; }

    /// <summary>
    /// 是否为「无匹配策略」后的默认租户回退。
    /// </summary>
    public bool UsedDefaultFallback { get; }

    /// <summary>
    /// 由指定解析策略成功解析时构造结果。
    /// </summary>
    /// <param name="tenantId">非空租户标识。</param>
    /// <param name="resolutionSourceName">来源标签。</param>
    /// <returns>结果实例。</returns>
    public static TenantResolutionResult FromContributor(string tenantId, string resolutionSourceName)
    {
        return new TenantResolutionResult(tenantId, resolutionSourceName, usedDefaultFallback: false);
    }

    /// <summary>
    /// 表示使用配置中的默认租户。
    /// </summary>
    /// <param name="defaultTenantId">默认租户值。</param>
    /// <returns>结果实例。</returns>
    public static TenantResolutionResult FromDefaultFallback(string defaultTenantId)
    {
        return new TenantResolutionResult(defaultTenantId, "DefaultFallback", usedDefaultFallback: true);
    }
}
