using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.Diagnostics;
using Cjora.SaaS.Core.Auth.Abstractions;
using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Microsoft.AspNetCore.Http;
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
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<DefaultDataPermissionScope> _logger;

    /// <summary>初始化 <see cref="DefaultDataPermissionScope"/>。</summary>
    public DefaultDataPermissionScope(
        DataPermissionScopeState state,
        ICurrentUser currentUser,
        ITenantProvider tenantProvider,
        IHttpContextAccessor httpContextAccessor,
        ILogger<DefaultDataPermissionScope> logger)
    {
        _state = state;
        _currentUser = currentUser;
        _tenantProvider = tenantProvider;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    /// <inheritdoc />
    public IDisposable Disable()
    {
        // P0 Fail-Fast：仅允许超级管理员或后台任务使用 Disable()。
        // 判定“后台任务”：当前不处于 HTTP 请求上下文（IHttpContextAccessor.HttpContext == null）。
        if (_httpContextAccessor.HttpContext is not null)
        {
            if (!_currentUser.IsSuperAdmin)
            {
                throw new UnauthorizedAccessException("DataPermission.Disable() is restricted to SuperAdmin or background execution.");
            }
        }

        // P2 审计：关闭行级过滤属于高危操作（租户过滤仍保留）。
        var tenantId = _tenantProvider.GetTenantId();
        SecurityAuditEventSource.Log.DataPermissionDisable(_currentUser.UserId, tenantId);
        _logger.LogWarning("DataPermission Disable invoked. UserId={UserId}, TenantId={TenantId}", _currentUser.UserId, tenantId);
        return _state.PushDisabled();
    }
}
