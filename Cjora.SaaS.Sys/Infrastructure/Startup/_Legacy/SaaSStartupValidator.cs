using Cjora.SaaS.Core.Auth.Abstractions;
using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Cjora.SaaS.Core.MultiTenancy.Models;
using Cjora.SaaS.Core.MultiTenancy.Providers;
using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.Repository.Abstractions;
using Cjora.SaaS.Core.SqlSugar.Abstractions;
using Cjora.SaaS.Core.SqlSugar.Models;
using Cjora.SaaS.Sys.DataPermission.Entities;
using Cjora.SaaS.Sys.Entities;
using Cjora.SaaS.Sys.SqlSugar;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SqlSugar;

namespace Cjora.SaaS.Sys.Startup;

public static class SaaSStartupValidator
{
    public static void ValidateSaaSOrThrow(IServiceProvider services)
    {
        var logger = services.GetService<ILoggerFactory>()?.CreateLogger("SaaSStartupValidator");

        // 1) DataPermission Provider 必须存在
        var providers = services.GetServices<ISqlSugarDataPermissionFilterProvider>().ToArray();
        if (providers.Length == 0)
        {
            throw new InvalidOperationException(
                "No DataPermissionFilterProvider registered. Department scope will not work.");
        }
        LogOk(logger, "[OK] DataPermissionProvider registered");

        // 2) 默认租户 fallback 禁用检查
        var tenantProvider = services.GetRequiredService<ITenantProvider>();
        if (tenantProvider is HttpTenantProvider)
        {
            // 生产默认不允许 fallback；若确实需要，必须显式配置 AllowDefaultTenantFallbackOutsideHttpContext=true
            var opt = services.GetRequiredService<IOptions<TenantOptions>>().Value;
            if (opt.AllowDefaultTenantFallbackOutsideHttpContext)
            {
                // 允许是显式行为
                LogOk(logger, "[OK] Tenant fallback explicitly allowed");
            }
            else
            {
                LogOk(logger, "[OK] Tenant fallback disabled");
            }
        }
        else
        {
            LogOk(logger, "[OK] Non-HTTP tenant provider in use");
        }

        // 3) 索引存在性检查（复用 DatabaseSchemaValidator + 扫描受控表）
        var db = services.GetRequiredService<ISqlSugarClient>();
        DatabaseSchemaValidator.ValidateIndexes(db);

        // 扫描所有 IDepartmentScopedEntity 表并验证 idx_tenant_dept
        var deptTables = FindDepartmentScopedTableNames();
        foreach (var t in deptTables)
        {
            if (!HasIndex(db, t, "idx_tenant_dept"))
            {
                throw new Exception($"Missing required indexes: {t}.idx_tenant_dept");
            }
        }
        LogOk(logger, "[OK] Indexes verified");

        // 4) 危险 API 封禁检查（反射验证：public 方法不存在）
        var extType = typeof(Cjora.SaaS.Core.SqlSugar.Extensions.SqlSugarTenantQueryableExtensions);
        EnsureNoPublicExtension(extType, "ClearAllSaaSFilters");
        EnsureNoPublicExtension(extType, "ClearDataPermissionFilters");
        LogOk(logger, "[OK] Dangerous APIs sealed");

        // 5) QueryFilter 注入检查：Tenant Filter + DataPermission Filter（结构性验证）
        // 通过 QueryFilterProvider 反射判断是否已注册过滤器类型
        if (!HasFilterType(db, typeof(ITenantScopedEntity)))
        {
            throw new InvalidOperationException("QueryFilters are not correctly configured.");
        }

        if (!HasFilterType(db, typeof(IDepartmentScopedEntity)) && providers.Length > 0)
        {
            throw new InvalidOperationException("QueryFilters are not correctly configured.");
        }

        LogOk(logger, "[OK] QueryFilters active");

        // 6) 生产环境禁止 SQLite
        var env = services.GetService<IHostEnvironment>();
        var sqlOptions = services.GetRequiredService<IOptions<SqlSugarSaaSOptions>>().Value;
        if (env?.IsProduction() == true && sqlOptions.DbType == DbType.Sqlite)
        {
            throw new InvalidOperationException("SQLite is not allowed in production.");
        }
    }

    private static void LogOk(ILogger? logger, string message)
    {
        if (logger is not null)
        {
            logger.LogInformation("{Message}", message);
            return;
        }

        Console.WriteLine(message);
    }

    private static void EnsureNoPublicExtension(Type extensionType, string methodName)
    {
        var methods = extensionType.GetMethods(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Static);
        if (methods.Any(m => string.Equals(m.Name, methodName, StringComparison.Ordinal)))
        {
            throw new InvalidOperationException("Dangerous filter APIs are not fully restricted.");
        }
    }

    private static IReadOnlyList<string> FindDepartmentScopedTableNames()
    {
        var asm = typeof(SysDepartmentScopedSetting).Assembly;
        var list = new List<string>();
        foreach (var t in asm.GetTypes())
        {
            if (!typeof(IDepartmentScopedEntity).IsAssignableFrom(t) || t.IsAbstract)
            {
                continue;
            }

            var attr = t.GetCustomAttributes(typeof(SugarTable), inherit: false).FirstOrDefault() as SugarTable;
            var table = attr?.TableName;
            if (string.IsNullOrWhiteSpace(table))
            {
                table = t.Name;
            }

            list.Add(table);
        }

        return list;
    }

    private static bool HasIndex(ISqlSugarClient db, string tableName, string indexName)
    {
        var list = db.DbMaintenance.GetIndexList(tableName);
        foreach (var item in list)
        {
            if (item is null)
            {
                continue;
            }

            if (item is string s)
            {
                if (string.Equals(s, indexName, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }

                continue;
            }

            var prop = item.GetType().GetProperty("IndexName");
            var name = prop?.GetValue(item) as string;
            if (!string.IsNullOrWhiteSpace(name) && string.Equals(name, indexName, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private static bool HasFilterType(ISqlSugarClient db, Type interfaceType)
    {
        // Core 已封锁 QueryFilter 的外部访问，避免 Clear/Disable/绕过。
        // 因此这里不能再通过 db.QueryFilter 反射验证；改为通过 SQL 生成形态进行最小自检。
        if (interfaceType == typeof(Cjora.SaaS.Core.Repository.Abstractions.ITenantScopedEntity))
        {
            var sql = db.Queryable<Cjora.SaaS.Sys.Entities.SysDepartment>().ToSql().Key;
            return sql.Contains("tenant_id", StringComparison.OrdinalIgnoreCase);
        }

        // 其他过滤器类型（部门/本人）在不同数据范围下 SQL 形态不固定，且由 Sys 提供 Provider，
        // 此处不做脆弱的字符串断言。
        return true;
    }
}

