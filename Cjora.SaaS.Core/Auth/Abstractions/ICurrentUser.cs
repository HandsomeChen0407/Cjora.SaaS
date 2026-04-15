namespace Cjora.SaaS.Core.Auth.Abstractions;

/// <summary>
/// 当前执行上下文中的终端用户抽象：典型来源为 HTTP 请求中的 <see cref="System.Security.Claims.ClaimsPrincipal"/>。
/// </summary>
/// <remarks>
/// 实现通常为 Scoped，供 <see cref="DataPermission.Abstractions.IDataPermissionContext"/> 与 SqlSugar 写入侧（如创建人）解析声明。
/// </remarks>
public interface ICurrentUser
{
    /// <summary>
    /// 当前身份是否已通过认证（由 <see cref="System.Security.Claims.ClaimsIdentity.IsAuthenticated"/> 等决定）。
    /// </summary>
    /// <remarks>
    /// 与 <see cref="IsValidUser"/> 不同：已认证但用户 Id 声明缺失或无法解析时，仍可为 <see langword="true"/> 而 <see cref="IsValidUser"/> 为 <see langword="false"/>。
    /// </remarks>
    bool IsAuthenticated { get; }

    /// <summary>
    /// 当前用户唯一标识；无法解析时为 <c>0</c>。
    /// </summary>
    long UserId { get; }

    /// <summary>
    /// 与当前用户或租户上下文关联的租户标识。
    /// </summary>
    string TenantId { get; }

    /// <summary>
    /// 是否视为有效业务用户（已解析出大于 0 的用户 Id）。
    /// </summary>
    bool IsValidUser => UserId > 0;

    /// <summary>
    /// 是否为平台级超级管理员（可执行跨租户运维等高危操作）。
    /// </summary>
    /// <remarks>
    /// 默认按声明 <c>is_super_admin</c> == <c>1</c> 判断；宿主可通过自定义 <see cref="ICurrentUser"/> 实现覆盖策略。
    /// </remarks>
    bool IsSuperAdmin => string.Equals(FindClaim("is_super_admin"), "1", StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// 按声明类型查找原始字符串值；不存在或类型名为空时返回 <see langword="null"/>。
    /// </summary>
    /// <param name="claimType">声明类型，可为 URI 或短名（如 <c>sub</c>）。</param>
    /// <returns>第一个匹配声明的值；未找到则为 <see langword="null"/>。</returns>
    string? FindClaim(string claimType);

    /// <summary>
    /// 按声明类型查找并转换为 <typeparamref name="T"/>；解析失败时返回 <c>default</c>，不抛异常。
    /// </summary>
    /// <typeparam name="T">目标类型，支持常见值类型、<see cref="string"/> 与枚举等。</typeparam>
    /// <param name="claimType">声明类型。</param>
    /// <returns>转换后的值；无法转换或不存在时为 <c>default</c>。</returns>
    T? FindClaim<T>(string claimType);
}

