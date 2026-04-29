using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.DataPermission.Enums;
using Cjora.SaaS.Sys.DataPermission.Entities;
using Cjora.SaaS.Sys.Entities;
using SqlSugar;

namespace Cjora.SaaS.Sys.Infrastructure.DataPermission;

/// <summary>
/// 解析当前用户在 <see cref="DataScopeKind.Agent"/> 下可访问的代理商 Id 集合。
/// </summary>
/// <remarks>
/// 读取 <see cref="SysUserDataScope"/>（<c>scope_type = Agent</c>）得到根代理商 Id，
/// 再按 <see cref="SysAgent.ParentId"/> 在内存中展开子树（含根），与部门数据权限「根 + 后代」语义一致。
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
        var rootIds = await _db.Queryable<SysUserDataScope>()
            .Where(s => s.TenantId == tenantId && s.UserId == userId && s.ScopeType == AgentScopeType)
            .Select(s => s.ScopeId)
            .Distinct()
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        if (rootIds.Count == 0)
            return Array.Empty<long>();

        var agents = await _db.Queryable<SysAgent>()
            .Where(a => a.TenantId == tenantId)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        if (agents.Count == 0)
            return Array.Empty<long>();

        var byParent = agents
            .GroupBy(a => a.ParentId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.Id).ToList());

        var result = new HashSet<long>();
        foreach (var root in rootIds)
        {
            foreach (var id in EnumerateSubtree(root, byParent))
                result.Add(id);
        }

        return result.Count == 0 ? Array.Empty<long>() : result.ToArray();
    }

    /// <summary>深度优先展开子树；遇环时跳过已访问节点，避免死循环。</summary>
    private static IEnumerable<long> EnumerateSubtree(
        long rootId,
        IReadOnlyDictionary<long?, List<long>> byParent)
    {
        var stack = new Stack<long>();
        var visited = new HashSet<long>();
        stack.Push(rootId);

        while (stack.Count > 0)
        {
            var id = stack.Pop();
            if (!visited.Add(id))
                continue;

            yield return id;

            if (!byParent.TryGetValue(id, out var children))
                continue;

            foreach (var child in children)
                stack.Push(child);
        }
    }
}
