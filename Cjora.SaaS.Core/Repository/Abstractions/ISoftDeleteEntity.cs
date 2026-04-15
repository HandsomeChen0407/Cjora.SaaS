namespace Cjora.SaaS.Core.Repository.Abstractions;

/// <summary>
/// 逻辑删除约束：实现此接口的实体在 SqlSugar 全局 <c>QueryFilter</c> 中会自动过滤
/// <see cref="IsDeleted"/> 为 <see langword="true"/> 的行；
/// 仓储 <see cref="IRepository{TEntity}.DeleteAsync"/> 也会将物理删除替换为软删除（更新三个字段）。
/// </summary>
/// <remarks>
/// <para>
/// 全局过滤器注册于 <c>SqlSugarSaaSClientBuilder.ApplyGlobalQueryFilters</c>，与租户过滤器同级叠加。
/// </para>
/// <para>
/// 需查询已删除行的管理场景，可通过 <c>ClearFilter&lt;ISoftDeleteEntity&gt;()</c> 在单次查询链上临时跳过。
/// </para>
/// </remarks>
public interface ISoftDeleteEntity
{
    /// <summary>逻辑删除标记；<see langword="true"/> 时全局过滤器自动排除该行。</summary>
    bool IsDeleted { get; set; }

    /// <summary>逻辑删除时间（UTC）；由仓储 <c>DeleteAsync</c> 自动写入。</summary>
    DateTime? DeletedAtUtc { get; set; }

    /// <summary>执行删除操作的用户 Id；无法获取时为 <see langword="null"/>。</summary>
    long? DeleterUserId { get; set; }
}
