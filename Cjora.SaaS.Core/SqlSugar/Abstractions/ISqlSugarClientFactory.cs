using SqlSugar;

namespace Cjora.SaaS.Core.SqlSugar.Abstractions;

/// <summary>
/// 并发安全的 SqlSugar Client 工厂：用于并发场景（如 Task.WhenAll）创建彼此隔离的 <see cref="ISqlSugarClient"/> 实例。
/// </summary>
public interface ISqlSugarClientFactory
{
    /// <summary>
    /// 创建一个新的 <see cref="ISqlSugarClient"/> 实例（来自独立的 DI Scope），调用方用完应 Dispose 以释放 scope/连接等资源。
    /// </summary>
    ISqlSugarClient Create();
}

