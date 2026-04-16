using Cjora.SaaS.Core.Auth.Abstractions;
using Cjora.SaaS.Sys.Permissions;
using Microsoft.AspNetCore.Authorization;

namespace Cjora.SaaS.Sys.Api.Auth;

public sealed class PermCodeRequirement : IAuthorizationRequirement
{
    public string PermCode { get; }

    public PermCodeRequirement(string permCode)
    {
        PermCode = permCode;
    }
}

public sealed class PermCodeAuthorizationHandler : AuthorizationHandler<PermCodeRequirement>
{
    private readonly IEffectivePermissionResolver _resolver;
    private readonly ICurrentUser _currentUser;

    public PermCodeAuthorizationHandler(IEffectivePermissionResolver resolver, ICurrentUser currentUser)
    {
        _resolver = resolver;
        _currentUser = currentUser;
    }

    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, PermCodeRequirement requirement)
    {
        if (!_currentUser.IsValidUser)
        {
            context.Fail();
            return;
        }

        if (_currentUser.IsSuperAdmin)
        {
            context.Succeed(requirement);
            return;
        }

        var codes = await _resolver.GetEffectivePermissionCodesAsync(_currentUser.UserId);
        if (codes.Contains(requirement.PermCode))
        {
            context.Succeed(requirement);
        }
        else
        {
            context.Fail();
        }
    }
}
