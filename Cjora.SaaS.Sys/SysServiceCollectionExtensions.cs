using Cjora.SaaS.Core.DataPermission.Models;
using Cjora.SaaS.Core.MultiTenancy.Hosting;
using Cjora.SaaS.Core.Repository.Hosting;
using Cjora.SaaS.Core.SqlSugar.Abstractions;
using Cjora.SaaS.Sys.Application.Departments;
using Cjora.SaaS.Sys.Application.Dicts;
using Cjora.SaaS.Sys.Application.Permissions;
using Cjora.SaaS.Sys.Application.Roles;
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
/// IAM 模块依赖注入。
/// </summary>
public static class SysServiceCollectionExtensions
{
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
        services.AddScoped<ISqlSugarDataPermissionFilterProvider, SysSqlSugarDataPermissionFilterProvider>();

        services.AddScoped<ISysTenantRepository, SysTenantRepository>();

        services.AddSqlSugarTenantRepository<SysUser>();
        services.AddSqlSugarTenantRepository<SysDepartment>();
        services.AddSqlSugarTenantRepository<SysDepartmentScopedSetting>();
        services.AddSqlSugarTenantRepository<SysRole>();
        services.AddSqlSugarTenantRepository<SysUserRole>();
        services.AddSqlSugarTenantRepository<SysRolePermission>();
        services.AddSqlSugarTenantRepository<SysRoleDataScope>();
        services.AddSqlSugarTenantRepository<SysPermission>();
        services.AddSqlSugarTenantRepository<SysDictType>();
        services.AddSqlSugarTenantRepository<SysDictItem>();

        services.AddScoped<ISysDepartmentExpansionService, SysDepartmentExpansionService>();
        services.AddScoped<IEffectivePermissionResolver, EffectivePermissionResolver>();

        // Application Services
        services.AddScoped<IUserRepository, SqlSugarUserRepository>();
        services.AddScoped<IUserAppService, UserAppService>();
        services.AddScoped<IRoleAppService, RoleAppService>();
        services.AddScoped<IDepartmentAppService, DepartmentAppService>();
        services.AddScoped<IPermissionAppService, PermissionAppService>();
        services.AddScoped<IDictAppService, DictAppService>();

        return services;
    }
}
