namespace Cjora.SaaS.Core.DataPermission.Providers;

/// <summary>
/// Scoped 内共享的数据权限执行状态（禁用深度计数）。
/// </summary>
/// <remarks><b>// NEW</b>：供 <see cref="DefaultDataPermissionContext"/> 与 <see cref="DefaultDataPermissionScope"/> 共用。</remarks>
public sealed class DataPermissionScopeState
{
    private static readonly AsyncLocal<int> DisableDepth = new();

    /// <summary>为 <see langword="true"/> 时 SqlSugar 行级数据权限过滤器应短路（租户过滤除外）。</summary>
    public bool IsDisabled => DisableDepth.Value > 0;

    /// <summary>增加禁用深度并返回释放时递减的句柄。</summary>
    internal IDisposable PushDisabled()
    {
        DisableDepth.Value++;
        return new PopScope(this);
    }

    private sealed class PopScope : IDisposable
    {
        private readonly DataPermissionScopeState _owner;
        private int _disposed;

        public PopScope(DataPermissionScopeState owner) => _owner = owner;

        public void Dispose()
        {
            if (System.Threading.Interlocked.Exchange(ref _disposed, 1) != 0)
            {
                return;
            }

            DisableDepth.Value = Math.Max(0, DisableDepth.Value - 1);
        }
    }
}
