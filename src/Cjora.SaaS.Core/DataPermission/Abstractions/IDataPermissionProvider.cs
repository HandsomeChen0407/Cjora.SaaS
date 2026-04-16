using Cjora.SaaS.Core.DataPermission.Models;

namespace Cjora.SaaS.Core.DataPermission.Abstractions;

/// <summary>
/// 与 ORM 无关的数据权限范围提供器：返回当前用户可访问的结构化权限数据。
/// </summary>
/// <remarks>
/// <para><b>设计意图</b>：<see cref="ISqlSugarDataPermissionFilterProvider"/> 将权限逻辑嵌入 SqlSugar QueryFilter（ORM 层），
/// 适用于单体架构中"查询自动带权限"的场景。但在微服务架构下，各服务可能使用不同 ORM 甚至不同数据库，
/// 无法共享 SqlSugar 全局过滤器。</para>
/// <para>本接口提供一条与 ORM 无关的路径：将权限计算结果以 <see cref="DataPermissionGrant"/> 形式返回，
/// 消费方自行决定如何转化为 SQL WHERE / API 过滤 / 其他形态。</para>
/// <para><b>当前阶段</b>：与 <see cref="ISqlSugarDataPermissionFilterProvider"/> 并行存在，不替换、不冲突。
/// 单体应用中可以不注册任何实现；微服务演进时，各服务注册各自的 <see cref="IDataPermissionProvider"/> 实现即可。</para>
/// </remarks>
public interface IDataPermissionProvider
{
    /// <summary>
    /// 根据当前用户的 <see cref="IDataPermissionContext"/> 返回结构化的可访问范围。
    /// </summary>
    /// <param name="context">当前请求已解析的数据权限上下文。</param>
    /// <param name="cancellationToken">取消标记。</param>
    /// <returns>权限授予结果；消费方根据 <see cref="DataPermissionGrant.Scope"/> 决定过滤策略。</returns>
    Task<DataPermissionGrant> GetGrantAsync(IDataPermissionContext context, CancellationToken cancellationToken = default);
}
