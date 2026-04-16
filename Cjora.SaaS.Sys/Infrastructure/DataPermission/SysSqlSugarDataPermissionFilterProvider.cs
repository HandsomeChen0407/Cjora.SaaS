using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.DataPermission.Enums;
using Cjora.SaaS.Core.SqlSugar.Abstractions;
using Cjora.SaaS.Sys.DataPermission.Entities;
using SqlSugar;

namespace Cjora.SaaS.Sys.DataPermission;

/// <summary>
/// Sys 业务实现层的数据权限过滤器：使用 EXISTS/JOIN（Subqueryable + Closure），不使用 IN。
/// </summary>
public sealed class SysSqlSugarDataPermissionFilterProvider : ISqlSugarDataPermissionFilterProvider
{
    public void Apply(ISqlSugarClient client, IDataPermissionContext context)
    {
        // Department：EXISTS(sys_user_data_scope JOIN sys_department_closure)
        client.QueryFilter.AddTableFilter<IDepartmentScopedEntity>(
            entity =>
                context.IsDisabled
                || context.BypassRowLevelFilters
                || (
                    context.Scope == DataScopeKind.Department
                    && context.CurrentUserId > 0
                    && SqlFunc.Subqueryable<SysUserDataScope>()
                        .Where(p =>
                            p.TenantId == entity.TenantId
                            && p.UserId == context.CurrentUserId
                            && p.ScopeType == "Department"
                            && SqlFunc.Subqueryable<SysDepartmentClosure>()
                                .Where(c =>
                                    c.TenantId == entity.TenantId
                                    &&
                                    c.AncestorId == p.ScopeId
                                    && c.DescendantId == entity.DepartmentId)
                                .Any())
                        .Any()
                )
                || context.Scope != DataScopeKind.Department,
            QueryFilterProvider.FilterJoinPosition.Where);

        // Project/Customer/Custom：预留扩展点（同样应使用 EXISTS/JOIN，不使用 IN）。
    }
}

