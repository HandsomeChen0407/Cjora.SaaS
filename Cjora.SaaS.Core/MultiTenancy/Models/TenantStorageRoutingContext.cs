namespace Cjora.SaaS.Core.MultiTenancy;

/// <summary>
/// 描述运行时如何访问某租户持久化数据（共享库、独立连接串、分片键等）。
/// </summary>
/// <remarks>
/// <para><b>面向多库扩展</b></para>
/// <para>
/// 多数产品从「单物理库 + TenantId 列」演进为「大客户独立库」；在仓储或 <c>DbContext</c> 工厂中消费本上下文，
/// 可在不大改业务代码的前提下切换连接策略。核心库提供保守默认（共享物理库）；宿主可替换 <see cref="ITenantStorageRoutingProvider"/>。
/// </para>
/// </remarks>
public sealed class TenantStorageRoutingContext
{
    /// <summary>
    /// 初始化 <see cref="TenantStorageRoutingContext"/>。
    /// </summary>
    /// <param name="tenantId">逻辑租户标识。</param>
    /// <param name="usesSharedPhysicalDatabase">是否为共享物理库（列级/逻辑隔离）。</param>
    /// <param name="dedicatedConnectionString">独立库时的连接串；共享库时应为 <see langword="null"/>。</param>
    /// <param name="catalogOrShardKey">目录库键、分片键等可选路由信息。</param>
    public TenantStorageRoutingContext(
        string tenantId,
        bool usesSharedPhysicalDatabase,
        string? dedicatedConnectionString,
        string? catalogOrShardKey)
    {
        TenantId = tenantId;
        UsesSharedPhysicalDatabase = usesSharedPhysicalDatabase;
        DedicatedConnectionString = dedicatedConnectionString;
        CatalogOrShardKey = catalogOrShardKey;
    }

    /// <summary>
    /// 逻辑租户标识。
    /// </summary>
    public string TenantId { get; }

    /// <summary>
    /// 是否与其他租户共享同一物理数据库。
    /// </summary>
    public bool UsesSharedPhysicalDatabase { get; }

    /// <summary>
    /// 独立物理库时的连接串。
    /// </summary>
    public string? DedicatedConnectionString { get; }

    /// <summary>
    /// 分片/目录等扩展路由键。
    /// </summary>
    public string? CatalogOrShardKey { get; }
}
