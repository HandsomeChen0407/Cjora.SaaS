using Cjora.SaaS.Core.DataPermission.Models;

namespace Cjora.SaaS.Core.DataPermission.Abstractions;

/// <summary>
/// 将「认证主体 / 声明 / 未来可扩展的数据源」解析为 <see cref="DataPermissionResult"/>，与 SqlSugar 消费侧解耦。
/// </summary>
/// <remarks>
/// <para>
/// <see cref="IDataPermissionContext"/> 仅描述「当前请求已确定的数据权限视图」；本接口承担「如何得到该视图」的可替换策略。
/// 默认实现 <see cref="Providers.DefaultDataPermissionResolver"/> 从 JWT/Claims 解析，与历史行为一致。
/// </para>
/// <para>
/// 扩展方向：实现本接口并在 DI 中替换注册，即可接入数据库角色表、集中式权限服务或短期缓存，而无需修改仓储或过滤器注册代码。
/// </para>
/// </remarks>
public interface IDataPermissionResolver
{
    /// <summary>
    /// 解析当前作用域的数据权限快照。
    /// </summary>
    /// <returns>不可变结果；同一 Scoped 生命周期内应幂等。</returns>
    DataPermissionResult Resolve();
}
