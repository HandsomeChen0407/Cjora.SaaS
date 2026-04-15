using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.DataPermission.Enums;
using Cjora.SaaS.Core.DataPermission.Models;

namespace Cjora.SaaS.Core.DataPermission.Providers;

/// <summary>
/// 基于 <see cref="IDataPermissionResolver"/> 的默认 <see cref="IDataPermissionContext"/>：对 SqlSugar 与业务暴露稳定的运行时视图。
/// </summary>
/// <remarks>
/// <para>
/// 本类不再内联声明解析逻辑，而是将「如何解析」委托给 <see cref="IDataPermissionResolver"/>，以便宿主替换解析来源（DB/RBAC/缓存）
/// 而保持 <see cref="IDataPermissionContext"/> 的公共 API 与升级前完全一致。
/// </para>
/// <para>
/// 使用 Scoped 内惰性缓存的 <see cref="Models.DataPermissionResult"/>，避免同一请求内重复解析；与旧实现对缓存粒度的期望一致。
/// </para>
/// </remarks>
public sealed class DefaultDataPermissionContext : IDataPermissionContext
{
    private readonly IDataPermissionResolver _resolver;
    private DataPermissionResult? _snapshot;

    /// <summary>
    /// 初始化 <see cref="DefaultDataPermissionContext"/>。
    /// </summary>
    /// <param name="resolver">数据权限解析器。</param>
    public DefaultDataPermissionContext(IDataPermissionResolver resolver)
    {
        _resolver = resolver;
    }

    private DataPermissionResult Snapshot => _snapshot ??= _resolver.Resolve();

    /// <inheritdoc />
    public DataScopeKind Scope => Snapshot.Scope;

    /// <inheritdoc />
    public bool BypassRowLevelFilters => Snapshot.BypassRowLevelFilters;

    /// <inheritdoc />
    public long CurrentUserId => Snapshot.CurrentUserId;

    /// <inheritdoc />
    public IReadOnlyList<long> AccessibleDepartmentIds => Snapshot.AccessibleDepartmentIds;
}
