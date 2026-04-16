using Microsoft.AspNetCore.Authorization;

namespace Cjora.SaaS.Sys.Api.Auth;

/// <summary>
/// 功能权限：策略名 <c>PermCode:{模块:资源:动作}</c>，由 <see cref="PermCodePolicyProvider"/> 绑定 <see cref="PermCodeRequirement"/>。
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, Inherited = true, AllowMultiple = false)]
public sealed class AuthorizePermCodeAttribute : AuthorizeAttribute
{
    public const string PolicyPrefix = "PermCode:";

    public AuthorizePermCodeAttribute(string permCode)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(permCode);
        Policy = PolicyPrefix + permCode;
    }
}
