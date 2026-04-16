namespace Cjora.SaaS.Sys.Infrastructure.Caching;

/// <summary>
/// IAM 权限相关内存缓存选项（不缓存业务实体）。
/// </summary>
public sealed class SysSecurityCacheOptions
{
    public const string SectionName = "Sys:SecurityCache";

    /// <summary>
    /// 绝对过期时间（分钟），建议 5~10。
    /// </summary>
    public int AbsoluteExpirationMinutes { get; set; } = 7;
}
