using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.DataPermission.Enums;
using Cjora.SaaS.Core.DataPermission.Models;

namespace Cjora.SaaS.Core.DataPermission.Providers;

/// <summary>
/// 基于 <see cref="IDataPermissionResolver"/> 的默认 <see cref="IDataPermissionContext"/>：对业务层暴露稳定的运行时视图。
/// </summary>
/// <remarks>
/// 使用 <see cref="Lazy{T}"/> 包装 <c>Task&lt;DataPermissionResult&gt;</c>，在 Scoped 内至多触发一次
/// <see cref="IDataPermissionResolver.ResolveAsync"/>，且懒初始化线程安全；同步属性通过
/// <c>ConfigureAwait(false).GetAwaiter().GetResult()</c> 取值。
/// </remarks>
public sealed class DefaultDataPermissionContext : IDataPermissionContext
{
    private readonly IDataPermissionResolver _resolver;
    private readonly DataPermissionScopeState _scopeState;
    private readonly Lazy<Task<DataPermissionResult>> _lazySnapshot;

    /// <summary>
    /// 初始化 <see cref="DefaultDataPermissionContext"/>。
    /// </summary>
    public DefaultDataPermissionContext(IDataPermissionResolver resolver, DataPermissionScopeState scopeState)
    {
        _resolver = resolver;
        _scopeState = scopeState;
        _lazySnapshot = new Lazy<Task<DataPermissionResult>>(
            () => _resolver.ResolveAsync(),
            LazyThreadSafetyMode.ExecutionAndPublication);
    }

    private DataPermissionResult Snapshot => _lazySnapshot.Value.ConfigureAwait(false).GetAwaiter().GetResult();

    /// <inheritdoc />
    public bool IsDisabled => _scopeState.IsDisabled;

    /// <inheritdoc />
    public DataScopeKind Scope => Snapshot.Scope;

    /// <inheritdoc />
    public bool BypassRowLevelFilters => Snapshot.BypassRowLevelFilters;

    /// <inheritdoc />
    public long CurrentUserId => Snapshot.CurrentUserId;

    /// <inheritdoc />
    public IReadOnlyList<long> AccessibleDepartmentIds => Snapshot.AccessibleDepartmentIds;

    /// <inheritdoc />
    public IReadOnlyList<long> AccessibleProjectIds => Snapshot.AccessibleProjectIds;

    /// <inheritdoc />
    public IReadOnlyList<long> AccessibleCustomerIds => Snapshot.AccessibleCustomerIds;
}
