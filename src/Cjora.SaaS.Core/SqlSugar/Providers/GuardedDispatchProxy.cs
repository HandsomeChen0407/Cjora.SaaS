using System.Reflection;
using Cjora.SaaS.Core.SqlSugar.Abstractions;

namespace Cjora.SaaS.Core.SqlSugar.Providers;

internal class GuardedDispatchProxy<T> : DispatchProxy where T : class
{
    private T? _inner;
    private ISqlSugarClientGuard? _guard;

    public static T Create(T inner, ISqlSugarClientGuard guard)
    {
        var proxy = Create<T, GuardedDispatchProxy<T>>();
        ((GuardedDispatchProxy<T>)(object)proxy).Init(inner, guard);
        return proxy;
    }

    private void Init(T inner, ISqlSugarClientGuard guard)
    {
        _inner = inner;
        _guard = guard;
    }

    protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
    {
        ArgumentNullException.ThrowIfNull(targetMethod);
        var inner = _inner ?? throw new InvalidOperationException("Proxy not initialized.");
        var guard = _guard;

        // P0 安全封锁：禁止外部获取/操作 QueryFilter（清除/禁用/绕过过滤器必须做不到）。
        // 配置 QueryFilter 仅允许在构建 ISqlSugarClient 的内部阶段通过真实 SqlSugarClient 实例完成。
        var methodName = targetMethod.Name;
        if (methodName.Equals("get_QueryFilter", StringComparison.Ordinal))
        {
            throw new UnauthorizedAccessException("Access to QueryFilter manipulation is forbidden by Core security policy.");
        }

        object? result;
        try
        {
            result = targetMethod.Invoke(inner, args);
        }
        catch (TargetInvocationException tie) when (tie.InnerException is not null)
        {
            throw tie.InnerException;
        }

        if (result is null || guard is null)
        {
            return result;
        }

        // 1) 若返回 Task/ValueTask：进入 guard 并在完成时退出
        var rt = targetMethod.ReturnType;
        if (typeof(Task).IsAssignableFrom(rt))
        {
            guard.Enter();
            var task = (Task)result;
            return task.ContinueWith(
                static (t, _) =>
                {
                    AsyncLocalSqlSugarClientGuard.Exit();
                    return t;
                },
                state: null,
                CancellationToken.None,
                TaskContinuationOptions.ExecuteSynchronously,
                TaskScheduler.Default).Unwrap();
        }

        if (rt == typeof(ValueTask))
        {
            guard.Enter();
            var vt = (ValueTask)result;
            return AwaitAndExit(vt);
        }

        // 2) 若返回接口实例（如 ISugarQueryable<> / IInsertable<> 等），继续包一层代理以覆盖后续执行。
        if (rt.IsInterface)
        {
            return CreateInterfaceProxy(result, guard, rt);
        }

        return result;
    }

    private static async ValueTask AwaitAndExit(ValueTask vt)
    {
        try
        {
            await vt.ConfigureAwait(false);
        }
        finally
        {
            AsyncLocalSqlSugarClientGuard.Exit();
        }
    }

    private static object CreateInterfaceProxy(object inner, ISqlSugarClientGuard guard, Type interfaceType)
    {
        var method = typeof(GuardedDispatchProxy<>)
            .MakeGenericType(interfaceType)
            .GetMethod(nameof(Create), BindingFlags.Public | BindingFlags.Static)!;
        return method.Invoke(null, new[] { inner, guard })!;
    }
}

