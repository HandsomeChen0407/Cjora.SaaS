using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Sys.Api.Auth;

/// <summary>
/// 将 <c>PermCode:*</c> 策略名解析为带 <see cref="PermCodeRequirement"/> 的 <see cref="AuthorizationPolicy"/>。
/// </summary>
public sealed class PermCodePolicyProvider : IAuthorizationPolicyProvider
{
    private readonly DefaultAuthorizationPolicyProvider _fallback;

    public PermCodePolicyProvider(IOptions<AuthorizationOptions> options)
    {
        _fallback = new DefaultAuthorizationPolicyProvider(options);
    }

    /// <inheritdoc />
    public Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        if (policyName.StartsWith(AuthorizePermCodeAttribute.PolicyPrefix, StringComparison.Ordinal))
        {
            var code = policyName[AuthorizePermCodeAttribute.PolicyPrefix.Length..];
            var policy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .AddRequirements(new PermCodeRequirement(code))
                .Build();
            return Task.FromResult<AuthorizationPolicy?>(policy);
        }

        return _fallback.GetPolicyAsync(policyName);
    }

    /// <inheritdoc />
    public Task<AuthorizationPolicy> GetDefaultPolicyAsync() => _fallback.GetDefaultPolicyAsync();

    /// <inheritdoc />
    public Task<AuthorizationPolicy?> GetFallbackPolicyAsync() => _fallback.GetFallbackPolicyAsync();
}
