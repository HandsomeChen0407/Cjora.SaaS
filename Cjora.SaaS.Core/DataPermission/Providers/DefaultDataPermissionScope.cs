using Cjora.SaaS.Core.DataPermission.Abstractions;

namespace Cjora.SaaS.Core.DataPermission.Providers;

/// <summary>
/// <see cref="IDataPermissionScope"/> 默认实现。
/// </summary>
/// <remarks><b>// NEW</b></remarks>
public sealed class DefaultDataPermissionScope : IDataPermissionScope
{
    private readonly DataPermissionScopeState _state;

    /// <summary>初始化 <see cref="DefaultDataPermissionScope"/>。</summary>
    public DefaultDataPermissionScope(DataPermissionScopeState state)
    {
        _state = state;
    }

    /// <inheritdoc />
    public IDisposable Disable()
    {
        return _state.PushDisabled();
    }
}
