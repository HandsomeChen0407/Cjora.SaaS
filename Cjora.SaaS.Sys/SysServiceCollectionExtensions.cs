using Cjora.SaaS.Core.Repository;
using Cjora.SaaS.Sys.Entities;
using Cjora.SaaS.Sys.Permissions;
using Cjora.SaaS.Sys.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace Cjora.SaaS.Sys;

/// <summary>
/// IAM 模块依赖注入。
/// </summary>
public static class SysServiceCollectionExtensions
{
    /// <summary>
    /// 注册系统管理（用户、部门、角色、用户角色）租户仓储及 <see cref="IEffectivePermissionResolver"/>。
    /// </summary>
    /// <param name="services">服务集合。</param>
    /// <returns>服务集合。</returns>
    /// <remarks>
    /// 需已注册 <c>ISqlSugarClient</c> 与 <see cref="Cjora.SaaS.Core.MultiTenancy.ITenantProvider"/>（例如 <see cref="Cjora.SaaS.Core.Extensions.ServiceCollectionExtensions.AddCjoraSaaSWithSqlSugar"/>）。
    /// 建表请使用 SqlSugar <c>CodeFirst</c> 或迁移脚本。实现 <see cref="Entities.SysLongIdTenantAuditedEntity"/> 的实体在插入/更新时 <c>tenant_id</c> 由 Core SqlSugar AOP 写入，无需手动赋值；<c>created_at_utc</c> / <c>updated_at_utc</c> 仍由业务或宿主审计管线赋值。
    /// </remarks>
    public static IServiceCollection AddCjoraSaaSSys(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.AddScoped<ISysTenantRepository, SysTenantRepository>();

        services.AddSqlSugarTenantRepository<SysUser>();
        services.AddSqlSugarTenantRepository<SysDepartment>();
        services.AddSqlSugarTenantRepository<SysRole>();
        services.AddSqlSugarTenantRepository<SysUserRole>();
        services.AddScoped<IEffectivePermissionResolver, EffectivePermissionResolver>();

        return services;
    }
}
