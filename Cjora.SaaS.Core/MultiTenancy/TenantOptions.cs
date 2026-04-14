namespace Cjora.SaaS.Core.MultiTenancy;

/// <summary>
/// 控制从 HTTP 请求中如何发现租户标识以及默认回退行为的配置项。
/// </summary>
/// <remarks>
/// 通过 <c>IOptions&lt;TenantOptions&gt;</c> 绑定，由 Contributor 与中间件消费。将
/// <see cref="EnableHeaderTenantResolution"/>、<see cref="EnableJwtClaimTenantResolution"/>、
/// <see cref="EnableSubdomainTenantResolution"/> 拆成开关，宿主可按需启用，减少无关策略带来的安全风险。
/// </remarks>
public class TenantOptions
{
    /// <summary>
    /// 承载租户标识的请求头名称（<see cref="TenantIdentifierResolver"/> 头策略）。
    /// </summary>
    /// <value>默认 <c>X-Tenant-Id</c>，常见于网关/BFF 透传。</value>
    public string TenantIdHeaderName { get; set; } = "X-Tenant-Id";

    /// <summary>
    /// 当没有任何 Contributor 解析出租户时使用的默认租户标识。
    /// </summary>
    /// <value>默认 <c>default</c>。生产环境常在网关直接拒绝无租户请求；此处保留便于本地开发。</value>
    public string DefaultTenantId { get; set; } = "default";

    /// <summary>
    /// 是否在请求未携带配置头时，将解析得到的租户标识写回该请求头。
    /// </summary>
    /// <remarks>
    /// 便于仍只读 Header 的下游组件；关闭后则主要依赖 <c>HttpContext.Items</c> 与 <see cref="ITenantProvider"/>。
    /// </remarks>
    public bool InjectDefaultTenantHeaderWhenMissing { get; set; } = true;

    /// <summary>
    /// 是否启用基于请求头的租户解析。
    /// </summary>
    public bool EnableHeaderTenantResolution { get; set; } = true;

    /// <summary>
    /// 是否启用基于已认证用户声明（如 JWT）的租户解析。
    /// </summary>
    /// <remarks>
    /// 若令牌中从不携带租户，可关闭以避免误用无关声明。
    /// </remarks>
    public bool EnableJwtClaimTenantResolution { get; set; } = true;

    /// <summary>
    /// 存储租户标识的声明类型（对应 <c>HttpContext.User</c> 上的 Claim）。
    /// </summary>
    /// <value>默认 <c>tenant_id</c>，需与身份颁发方配置一致。</value>
    public string JwtTenantIdClaimType { get; set; } = "tenant_id";

    /// <summary>
    /// 是否启用基于子域名的租户解析。
    /// </summary>
    public bool EnableSubdomainTenantResolution { get; set; }

    /// <summary>
    /// 子域名模式下的父域后缀，用于从 <see cref="Microsoft.AspNetCore.Http.HttpRequest.Host"/> 中截取租户段。
    /// </summary>
    /// <remarks>
    /// 例如父域为 <c>app.contoso.com</c>、请求 Host 为 <c>acme.app.contoso.com</c> 时，租户为 <c>acme</c>。
    /// 仅当 <see cref="EnableSubdomainTenantResolution"/> 为 <see langword="true"/> 时生效。
    /// </remarks>
    public string? SubdomainParentHost { get; set; }
}
