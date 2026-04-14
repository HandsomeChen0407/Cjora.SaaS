namespace Cjora.SaaS.Core.Repository.Models;

/// <summary>
/// 分页查询结果：包含当页数据与总记录数。
/// </summary>
/// <typeparam name="TEntity">实体或投影类型。</typeparam>
public sealed class PagedResult<TEntity>
{
    /// <summary>
    /// 获取或设置当前页数据列表。
    /// </summary>
    public IReadOnlyList<TEntity> Items { get; set; } = Array.Empty<TEntity>();

    /// <summary>
    /// 获取或设置满足条件（含租户过滤）的总记录数。
    /// </summary>
    public int TotalCount { get; set; }

    /// <summary>
    /// 获取或设置当前页码。
    /// </summary>
    public int PageNumber { get; set; }

    /// <summary>
    /// 获取或设置每页条数。
    /// </summary>
    public int PageSize { get; set; }
}

