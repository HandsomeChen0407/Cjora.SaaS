namespace Cjora.SaaS.Core.MultiTenancy.Abstractions;

/// <summary>
/// 为非 HTTP 场景（后台任务/消息消费）显式提供租户上下文。
/// </summary>
public interface ITenantContextSetter
{
    /// <summary>
    /// 在当前异步流中临时使用指定租户；释放时恢复。
    /// </summary>
    IDisposable Use(string tenantId);
}

