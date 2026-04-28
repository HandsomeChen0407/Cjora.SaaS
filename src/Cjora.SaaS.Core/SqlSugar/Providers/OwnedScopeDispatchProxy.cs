using System.Reflection;
using Microsoft.Extensions.DependencyInjection;

namespace Cjora.SaaS.Core.SqlSugar.Providers;

internal class OwnedScopeDispatchProxy<T> : DispatchProxy where T : class
{
    private T? _inner;
    private IServiceScope? _scope;

    public static T Create(T inner, IServiceScope scope)
    {
        var proxy = Create<T, OwnedScopeDispatchProxy<T>>();
        ((OwnedScopeDispatchProxy<T>)(object)proxy).Init(inner, scope);
        return proxy;
    }

    private void Init(T inner, IServiceScope scope)
    {
        _inner = inner;
        _scope = scope;
    }

    protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
    {
        ArgumentNullException.ThrowIfNull(targetMethod);
        var inner = _inner ?? throw new InvalidOperationException("Proxy not initialized.");

        // 确保释放时释放掉创建该 client 的 scope。
        if (targetMethod.Name.Equals(nameof(IDisposable.Dispose), StringComparison.Ordinal))
        {
            try
            {
                if (inner is IDisposable d)
                {
                    d.Dispose();
                }
            }
            finally
            {
                _scope?.Dispose();
                _scope = null;
                _inner = null;
            }

            return null;
        }

        try
        {
            return targetMethod.Invoke(inner, args);
        }
        catch (TargetInvocationException tie) when (tie.InnerException is not null)
        {
            throw tie.InnerException;
        }
    }
}

