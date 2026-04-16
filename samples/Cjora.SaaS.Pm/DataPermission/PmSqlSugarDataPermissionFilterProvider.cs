using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.DataPermission.Enums;
using Cjora.SaaS.Core.SqlSugar.Abstractions;
using Cjora.SaaS.Pm.Entities;
using SqlSugar;

namespace Cjora.SaaS.Pm.DataPermission;

/// <summary>
/// PM 项目域：在 <see cref="DataScopeKind.Project"/> 下对 <see cref="IProjectScopedEntity"/> 追加 EXISTS（当前用户为项目成员）。
/// </summary>
public sealed class PmSqlSugarDataPermissionFilterProvider : ISqlSugarDataPermissionFilterProvider
{
    private static readonly DataScopeKind[] ProjectOnly = { DataScopeKind.Project };

    /// <inheritdoc />
    public IReadOnlyList<DataScopeKind> HandledDataScopes => ProjectOnly;

    /// <inheritdoc />
    public void Apply(ISqlSugarClient client, IDataPermissionContext context)
    {
        client.QueryFilter.AddTableFilter<IProjectScopedEntity>(
            entity =>
                context.IsDisabled
                || context.BypassRowLevelFilters
                || (
                    context.Scope == DataScopeKind.Project
                    && context.CurrentUserId > 0
                    && SqlFunc.Subqueryable<PmProjectMember>()
                        .Where(m =>
                            m.TenantId == entity.TenantId
                            && m.ProjectId == entity.ProjectId
                            && m.UserId == context.CurrentUserId)
                        .Any()
                )
                || context.Scope != DataScopeKind.Project,
            QueryFilterProvider.FilterJoinPosition.Where);
    }
}
