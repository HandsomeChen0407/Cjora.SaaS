using Cjora.SaaS.Core.SqlSugar.Abstractions;

namespace Cjora.SaaS.Core.SqlSugar.Providers;

/// <summary>
/// 基于 AsyncLocal 的并发执行守卫：同一异步流内禁止并发进入。
/// </summary>
public sealed class AsyncLocalSqlSugarClientGuard : ISqlSugarClientGuard
{
    private static readonly AsyncLocal<int> Depth = new();

    public void Enter()
    {
        // 若上层并发发起多个 DB 调用（Task.WhenAll 等），它们会继承同一 AsyncLocal 值，从而触发 Fail-Fast。
        if (Depth.Value > 0)
        {
            throw new InvalidOperationException("Concurrent ISqlSugarClient usage detected. Parallel queries on the same logical flow are запрещ止。");
        }

        Depth.Value = 1;
    }

    internal static void Exit()
    {
        Depth.Value = 0;
    }
}

