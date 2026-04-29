using Cjora.SaaS.Core.DataPermission.Enums;

namespace Cjora.SaaS.Core.DataPermission.Abstractions;

/// <summary>
/// 按 <see cref="DataScopeKind"/> 解析当前用户可访问的实体主键集合（部门 / 代理商 / 项目 / 客户等）。
/// </summary>
/// <remarks>
/// <para>每个业务模块为其负责的 <see cref="DataScopeKind"/> 注册一个实现：
/// Sys → Department / Agent，CRM → Customer，PM → Project。</para>
/// <para>解析结果将被合并进 <see cref="Models.DataPermissionResult"/>，
/// 由 <see cref="IDataPermissionContext"/> 暴露给服务层通过
/// <c>.WithDataPermission()</c> 消费。</para>
/// </remarks>
public interface IDataScopeIdResolver
{
    /// <summary>
    /// 本解析器负责的数据范围类型。
    /// </summary>
    DataScopeKind Scope { get; }

    /// <summary>
    /// 返回指定用户在指定租户下可访问的实体主键列表。
    /// </summary>
    /// <param name="userId">当前用户 Id。</param>
    /// <param name="tenantId">当前租户 Id。</param>
    /// <param name="cancellationToken">取消标记。</param>
    /// <returns>去重后的可访问 Id 集合；空集合表示无权访问任何行。</returns>
    Task<IReadOnlyList<long>> ResolveAccessibleIdsAsync(
        long userId, string tenantId, CancellationToken cancellationToken = default);
}
