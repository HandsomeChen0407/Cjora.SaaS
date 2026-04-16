namespace Cjora.SaaS.Core.Repository.Abstractions;

/// <summary>
/// 表示实体按租户隔离存储：仓储实现会在「查询/更新/删除」时强制带上当前 <c>TenantId</c>，在「新增」时自动写入当前租户标识。
/// </summary>
/// <remarks>
/// 实现原理（为何单独接口而不是基类）：
/// <list type="bullet">
/// <item><description>接口比基类更灵活：你可同时继承领域基类并实现本接口，避免单继承限制。</description></item>
/// <item><description>仓储泛型约束 <c>where TEntity : class, ITenantScopedEntity, new()</c> 在编译期保证存在 <see cref="TenantId"/> 属性，便于生成表达式树。</description></item>
/// <item><description>与 <see cref="MultiTenancy.Abstractions.ITenantProvider"/> 配合：运行时租户来自 HTTP/后台任务上下文，写入实体的是「当前解析到的租户」，而不是客户端随意提交的值。</description></item>
/// </list>
/// </remarks>
public interface ITenantScopedEntity
{
    /// <summary>
    /// 租户标识。值语义上为租户编码，应与当前请求（或作业上下文）中 <see cref="MultiTenancy.Abstractions.ITenantProvider.GetTenantId"/> 返回值一致。
    /// </summary>
    string TenantId { get; set; }
}

