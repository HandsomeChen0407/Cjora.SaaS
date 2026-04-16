namespace Cjora.SaaS.Core.MultiTenancy.Abstractions;

/// <summary>
/// 后台任务在显式租户上下文下执行的强制入口（生产硬约束）。
/// </summary>
public interface IBackgroundTenantExecutor
{
    Task RunAsync(string tenantId, Func<IServiceProvider, Task> action);
}

