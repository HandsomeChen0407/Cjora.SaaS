namespace Cjora.SaaS.Core.SqlSugar.Abstractions;

/// <summary>
/// 防止同一 <c>ISqlSugarClient</c> 在同一异步流内被并发使用（生产硬约束）。
/// </summary>
public interface ISqlSugarClientGuard
{
    /// <summary>
    /// 进入一次 DB 执行区；若检测到并发使用则抛出异常。
    /// </summary>
    void Enter();
}

