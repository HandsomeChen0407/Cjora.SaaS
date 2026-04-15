using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.Diagnostics;
using Cjora.SaaS.Core.Auth.Abstractions;
using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Microsoft.Extensions.Logging;

namespace Cjora.SaaS.Core.DataPermission.Providers;

/// <summary>
/// <see cref="IDataPermissionScope"/> 默认实现。
/// </summary>
/// <remarks><b>// NEW</b></remarks>
public sealed class DefaultDataPermissionScope : IDataPermissionScope
{
    private readonly DataPermissionScopeState _state;
    private readonly ICurrentUser _currentUser;
    private readonly ITenantProvider _tenantProvider;
    private readonly ILogger<DefaultDataPermissionScope> _logger;

    /// <summary>初始化 <see cref="DefaultDataPermissionScope"/>。</summary>
    public DefaultDataPermissionScope(
        DataPermissionScopeState state,
        ICurrentUser currentUser,
        ITenantProvider tenantProvider,
        ILogger<DefaultDataPermissionScope> logger)
    {
        _state = state;
        _currentUser = currentUser;
        _tenantProvider = tenantProvider;
        _logger = logger;
    }

    /// <inheritdoc />
    public IDisposable Disable()
    {
        // P2 审计：关闭行级过滤属于高危操作（租户过滤仍保留）。
        var tenantId = _tenantProvider.GetTenantId();
        SecurityAuditEventSource.Log.DataPermissionDisable(_currentUser.UserId, tenantId);
        _logger.LogWarning("DataPermission Disable invoked. UserId={UserId}, TenantId={TenantId}", _currentUser.UserId, tenantId);
        return _state.PushDisabled();
    }
}
