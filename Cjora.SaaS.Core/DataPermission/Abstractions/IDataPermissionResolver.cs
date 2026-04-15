using Cjora.SaaS.Core.DataPermission.Models;

namespace Cjora.SaaS.Core.DataPermission.Abstractions;

/// <summary>
/// 将「认证主体 / 声明 / 未来可扩展的数据源」解析为 <see cref="DataPermissionResult"/>，与 SqlSugar 消费侧解耦。
/// </summary>
/// <remarks>
/// <para><b>IMPORTANT</b>：所有异步实现必须在 <c>await</c> 及后续延续上使用 <c>ConfigureAwait(false)</c>，
/// 避免与 <see cref="Providers.DefaultDataPermissionContext"/> 中通过 <c>GetAwaiter().GetResult()</c> 阻塞读取快照时产生死锁。</para>
/// <para>
/// <see cref="IDataPermissionContext"/> 仅描述「当前请求已确定的数据权限视图」；本接口承担「如何得到该视图」的可替换策略。
/// 默认实现 <see cref="Providers.DefaultDataPermissionResolver"/> 从 JWT/Claims 解析，与历史行为一致。
/// </para>
/// <para>
/// <b>// CHANGED</b>：异步 <see cref="ResolveAsync"/> 便于未来实现基于 DB / Redis 的解析而不阻塞线程池；
/// 默认解析器仍以 <see cref="Task{TResult}"/> 同步完成方式返回，宿主可无缝替换为真异步实现。
/// </para>
/// </remarks>
public interface IDataPermissionResolver
{
    /// <summary>
    /// 解析当前作用域的数据权限快照（可异步访问缓存或远程权限服务）。
    /// </summary>
    /// <returns>不可变结果；同一 Scoped 生命周期内应幂等。</returns>
    Task<DataPermissionResult> ResolveAsync();
}
