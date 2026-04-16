using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.DataPermission.Enums;
using Cjora.SaaS.Pm.Entities;
using SqlSugar;

namespace Cjora.SaaS.Pm.DataPermission;

/// <summary>
/// 解析当前用户在 <see cref="DataScopeKind.Project"/> 下可访问的项目 Id 集合（用户为项目成员）。
/// </summary>
public sealed class ProjectDataScopeIdResolver : IDataScopeIdResolver
{
    private readonly ISqlSugarClient _db;

    public ProjectDataScopeIdResolver(ISqlSugarClient db) => _db = db;

    /// <inheritdoc />
    public DataScopeKind Scope => DataScopeKind.Project;

    /// <inheritdoc />
    public async Task<IReadOnlyList<long>> ResolveAccessibleIdsAsync(
        long userId, string tenantId, CancellationToken cancellationToken = default)
    {
        var ids = await _db.Queryable<PmProjectMember>()
            .Where(m => m.TenantId == tenantId && m.UserId == userId)
            .Select(m => m.ProjectId)
            .Distinct()
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return ids;
    }
}
