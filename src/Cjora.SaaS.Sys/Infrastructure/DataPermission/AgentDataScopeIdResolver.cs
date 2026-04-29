using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.DataPermission.Enums;
using Cjora.SaaS.Sys.DataPermission.Entities;
using SqlSugar;

namespace Cjora.SaaS.Sys.Infrastructure.DataPermission;

/// <summary>
/// 解析当前用户在 <see cref="DataScopeKind.Agent"/> 下可访问的代理商 Id 集合。
/// </summary>
/// <remarks>
/// 读取 <see cref="SysUserDataScope"/>（<c>scope_type = Agent</c>），由角色数据范围同步写入。
/// </remarks>
public sealed class AgentDataScopeIdResolver : IDataScopeIdResolver
{
    private const string AgentScopeType = "Agent";
    private readonly ISqlSugarClient _db;

    public AgentDataScopeIdResolver(ISqlSugarClient db)
    {
        _db = db;
    }

    /// <inheritdoc />
    public DataScopeKind Scope => DataScopeKind.Agent;

    /// <inheritdoc />
    public async Task<IReadOnlyList<long>> ResolveAccessibleIdsAsync(
        long userId, string tenantId, CancellationToken cancellationToken = default)
    {
        var ids = await _db.Queryable<SysUserDataScope>()
            .Where(s => s.TenantId == tenantId && s.UserId == userId && s.ScopeType == AgentScopeType)
            .Select(s => s.ScopeId)
            .Distinct()
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return ids.Count == 0 ? Array.Empty<long>() : ids;
    }
}
