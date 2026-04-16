namespace Cjora.SaaS.Sys.Infrastructure.Caching;

/// <summary>
/// 手动失效 IAM 相关内存缓存（权限码、数据权限解析快照、部门结构缓存）。
/// </summary>
public interface ISysSecurityMemoryCacheControl
{
    /// <summary>角色/权限分配变更后调用。</summary>
    void InvalidatePermissionCaches();

    /// <summary>用户 data_scope 声明可能变化时调用（如角色分配）。</summary>
    void InvalidateDataPermissionCaches();

    /// <summary>部门或闭包表变更后调用。</summary>
    void InvalidateDepartmentCaches();
}
