namespace Cjora.SaaS.Core.MultiTenancy.Abstractions;

/// <summary>
/// 提供当前执行作用域（通常为 HTTP 请求）下的租户标识及轻量解析元数据。
/// </summary>
/// <remarks>
/// <para><b>设计意图</b></para>
/// <para>
/// 业务层应依赖本接口，而非直接读 Header、JWT 或 Host，从而降低与传输细节耦合；后台任务可手动构造 Scoped 实现注入相同抽象。
/// HTTP 场景下由中间件写入 <see cref="Constants.TenantHttpContextKeys"/>，本接口在应用内统一读取。
/// </para>
/// <para>
/// 「识别租户」与「数据落在哪个库」分离：多库路由请使用 <see cref="ITenantStorageRoutingProvider"/>。
/// </para>
/// </remarks>
public interface ITenantProvider
{
    /// <summary>
    /// 获取当前作用域租户标识。
    /// </summary>
    /// <returns>非空租户标识；实现可将空值规范为配置的默认值。</returns>
    string GetTenantId();

    /// <summary>
    /// 获取本次解析来源的稳定标签（如 Header、JwtClaim、Subdomain）。
    /// </summary>
    /// <returns>非空标签；无法获知时返回 <c>Unknown</c>。</returns>
    /// <remarks>
    /// 主要用于诊断、审计与客服排障；除非完全理解 Header 可被伪造等风险，否则不要单独依赖此字段做授权判定。
    /// </remarks>
    string GetTenantResolutionSource();
}