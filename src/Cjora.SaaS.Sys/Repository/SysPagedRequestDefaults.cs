using Cjora.SaaS.Core.Repository.Models;

namespace Cjora.SaaS.Sys.Repository;

/// <summary>
/// 与 Core <see cref="PagedRequest"/> / <see cref="Cjora.SaaS.Core.Repository.Providers.SqlSugarRepository{TEntity}"/> 分页规范化逻辑对齐的默认常量（便于 IAM 列表接口与仓储一致）。
/// </summary>
public static class SysPagedRequestDefaults
{
    /// <summary>与 <see cref="PagedRequest.PageNumber"/> 默认一致。</summary>
    public const int DefaultPageNumber = 1;

    /// <summary>与 <see cref="PagedRequest.PageSize"/> 默认一致（与 <c>SqlSugarRepository</c> 内部上限裁剪前的默认页大小一致）。</summary>
    public const int DefaultPageSize = 20;
}
