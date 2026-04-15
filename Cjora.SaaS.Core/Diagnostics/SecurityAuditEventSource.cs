using System.Diagnostics.Tracing;

namespace Cjora.SaaS.Core.Diagnostics;

/// <summary>
/// 生产级安全审计事件源（高危操作与权限绕过路径）。
/// </summary>
[EventSource(Name = "Cjora-SaaS-SecurityAudit")]
public sealed class SecurityAuditEventSource : EventSource
{
    public static readonly SecurityAuditEventSource Log = new();

    private SecurityAuditEventSource()
    {
    }

    [Event(1, Level = EventLevel.Warning, Message = "ClearTenantFilters invoked. UserId={0}, TenantId={1}")]
    public void ClearTenantFilters(long userId, string tenantId) => WriteEvent(1, userId, tenantId);

    [Event(2, Level = EventLevel.Informational, Message = "DataPermission Disable invoked. UserId={0}, TenantId={1}")]
    public void DataPermissionDisable(long userId, string tenantId) => WriteEvent(2, userId, tenantId);

    [Event(3, Level = EventLevel.Warning, Message = "BypassRowLevelFilters enabled. UserId={0}, TenantId={1}")]
    public void BypassRowLevelFilters(long userId, string tenantId) => WriteEvent(3, userId, tenantId);
}

