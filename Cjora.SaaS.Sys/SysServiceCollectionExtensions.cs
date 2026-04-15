using Cjora.SaaS.Core.DataPermission.Models;
using Cjora.SaaS.Core.MultiTenancy.Hosting;
using Cjora.SaaS.Core.Repository.Hosting;
using Cjora.SaaS.Core.SqlSugar.Abstractions;
using Cjora.SaaS.Sys.Application.Users;
using Cjora.SaaS.Sys.DataPermission;
using Cjora.SaaS.Sys.MultiTenancy;
using Cjora.SaaS.Sys.Departments;
using Cjora.SaaS.Sys.Entities;
using Cjora.SaaS.Sys.Permissions;
using Cjora.SaaS.Sys.Repositories;
using Cjora.SaaS.Sys.Infrastructure.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace Cjora.SaaS.Sys;

/// <summary>
/// IAM 模块依赖注入：与 <see cref="Cjora.SaaS.Core"/> 的多租户、SqlSugar、仓储、数据权限声明对齐。
/// </summary>
public static class SysServiceCollectionExtensions
{
    /// <summary>
    /// 注册系统管理（租户主数据、用户、部门、部门级配置、角色、用户角色）、部门树展开服务及 <see cref="IEffectivePermissionResolver"/>。
    /// </summary>
    /// <param name="services">服务集合。</param>
    /// <param name="configureDataPermissionClaims">可选：与 Core <see cref="DefaultDataPermissionContext"/> 对齐的声明名/默认值（多次 <c>Configure</c> 会合并）。</param>
    /// <returns>服务集合。</returns>
    /// <remarks>
    /// <para>
    /// 需已注册 <c>ISqlSugarClient</c>、<see cref="Cjora.SaaS.Core.MultiTenancy.ITenantProvider"/> 与 <see cref="Cjora.SaaS.Core.Auth.ICurrentUser"/>（例如 <see cref="Cjora.SaaS.Core.Extensions.ServiceCollectionExtensions.AddCjoraSaaSWithSqlSugar"/>）。
    /// 本方法会将 Core 默认的 <c>ITenantStorageRoutingProvider</c> 替换为基于主库 <c>sys_tenant.dedicated_database_connection_string</c> 的实现；独立库连接串请写入该列而非 appsettings。
    /// </para>
    /// <para>
    /// 建表请使用 SqlSugar <c>CodeFirst</c> 或迁移脚本。实现 <see cref="SysLongIdTenantAuditedEntity"/> / <see cref="SysLongIdDepartmentOwnedAuditedEntity"/> 的实体在插入/更新时 <c>tenant_id</c> 由 Core SqlSugar AOP 写入；<c>creator_user_id</c> 在开启 <see cref="Cjora.SaaS.Core.SqlSugarInfrastructure.SqlSugarSaaSOptions.AutoFillCreatorUserIdOnInsert"/> 且插入值为 <c>0</c> 时由 AOP 填充。
    /// </para>
    /// <para>
    /// 数据权限声明名建议使用 <see cref="SysDataPermissionClaims"/> 与 <see cref="SysDataPermissionClaimBuilder"/>，以便与 <see cref="DataPermissionClaimOptions"/> 默认一致。
    /// </para>
    /// </remarks>
    public static IServiceCollection AddCjoraSaaSSys(
        this IServiceCollection services,
        Action<DataPermissionClaimOptions>? configureDataPermissionClaims = null)
    {
        ArgumentNullException.ThrowIfNull(services);

        if (configureDataPermissionClaims is not null)
        {
            services.Configure(configureDataPermissionClaims);
        }

        services.AddOptions();
        services.Configure<SysDepartmentOptions>(_ => { });

        services.ReplaceTenantStorageRoutingProvider<SysTenantTableStorageRoutingProvider>();

        // Sys 业务实现层提供行级数据权限过滤器（EXISTS/JOIN），Core 只负责调用。
        services.AddScoped<ISqlSugarDataPermissionFilterProvider, SysSqlSugarDataPermissionFilterProvider>();

        services.AddScoped<ISysTenantRepository, SysTenantRepository>();

        services.AddSqlSugarTenantRepository<SysUser>();
        services.AddSqlSugarTenantRepository<SysDepartment>();
        services.AddSqlSugarTenantRepository<SysDepartmentScopedSetting>();
        services.AddSqlSugarTenantRepository<SysRole>();
        services.AddSqlSugarTenantRepository<SysUserRole>();
        services.AddSqlSugarTenantRepository<SysPermission>();
        services.AddSqlSugarTenantRepository<SysDictType>();
        services.AddSqlSugarTenantRepository<SysDictItem>();
        services.AddScoped<ISysDepartmentExpansionService, SysDepartmentExpansionService>();
        services.AddScoped<IEffectivePermissionResolver, EffectivePermissionResolver>();

        // Application / Infrastructure
        services.AddScoped<IUserRepository, SqlSugarUserRepository>();
        services.AddScoped<IUserAppService, UserAppService>();

        return services;
    }
}
