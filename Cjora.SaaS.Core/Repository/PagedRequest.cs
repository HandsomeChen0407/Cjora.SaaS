namespace Cjora.SaaS.Core.Repository;

/// <summary>
/// 分页请求参数（页码从 1 开始，与 SqlSugar 常见约定一致）。
/// </summary>
public sealed class PagedRequest
{
    /// <summary>
    /// 获取或设置页码，从 1 开始。
    /// </summary>
    public int PageNumber { get; set; } = 1;

    /// <summary>
    /// 获取或设置每页条数；建议上限由业务在调用前裁剪，避免单次拉取过大。
    /// </summary>
    public int PageSize { get; set; } = 20;
}
