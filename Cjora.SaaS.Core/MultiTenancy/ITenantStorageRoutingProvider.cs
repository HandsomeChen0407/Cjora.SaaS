namespace Cjora.SaaS.Core.MultiTenancy;

/// <summary>
/// 根据逻辑租户标识解析「数据应如何落库/落盘」的路由元数据。
/// </summary>
/// <remarks>
/// <para><b>设计意图</b></para>
/// <para>
/// <see cref="ITenantProvider"/> 回答「当前租户是谁」；本接口回答「该租户的数据应连哪个库、哪个分片」。
/// 二者分离可避免在 HTTP 解析层混入连接串查询，也便于同一套识别管道适配「共享库 + 列隔离」与「一租户一库」等模型。
/// </para>
/// <para>
/// 扩展方式示例：查目录库返回 <see cref="TenantStorageRoutingContext.DedicatedConnectionString"/>；返回分片键供工厂创建客户端；或保持共享物理库并依赖 RLS。
/// </para>
/// </remarks>
public interface ITenantStorageRoutingProvider
{
    /// <summary>
    /// 解析指定租户的存储路由信息。
    /// </summary>
    /// <param name="tenantId">租户解析结果得到的逻辑标识。</param>
    /// <param name="cancellationToken">取消标记。</param>
    /// <returns>存储路由上下文。</returns>
    ValueTask<TenantStorageRoutingContext> ResolveAsync(string tenantId, CancellationToken cancellationToken = default);
}
