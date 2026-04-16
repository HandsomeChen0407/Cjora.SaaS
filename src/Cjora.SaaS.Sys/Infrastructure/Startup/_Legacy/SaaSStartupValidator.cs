using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Cjora.SaaS.Core.Repository.Abstractions;
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

        // 1) IDataScopeIdResolver 至少注册了 Department
        var resolvers = services.GetServices<IDataScopeIdResolver>().ToArray();
        if (resolvers.Length == 0)
        {
            throw new InvalidOperationException(
                "No IDataScopeIdResolver registered. Department scope will not work.");
        }
        LogOk(logger, $"[OK] IDataScopeIdResolver registered ({resolvers.Length} resolver(s))");

        // 2) 记录当前 tenant provider 类型。
        var tenantProvider = services.GetRequiredService<ITenantProvider>();
        LogOk(logger, $"[OK] TenantProvider={tenantProvider.GetType().Name}");

        // 3) 索引存在性检查（复用 DatabaseSchemaValidator + 扫描受控表）
        var db = services.GetRequiredService<ISqlSugarClient>();
        DatabaseSchemaValidator.ValidateIndexes(db);

        var deptTables = FindDepartmentScopedTableNames();
        foreach (var t in deptTables)
        {
            if (!HasIndex(db, t, "idx_tenant_dept"))
            {
                throw new Exception($"Missing required indexes: {t}.idx_tenant_dept");
            }
        }
        LogOk(logger, "[OK] Indexes verified");

        // 4) 危险 API 封禁检查
        var extType = typeof(Cjora.SaaS.Core.SqlSugar.Extensions.SqlSugarTenantQueryableExtensions);
        EnsureNoPublicExtension(extType, "ClearAllSaaSFilters");
        EnsureNoPublicExtension(extType, "ClearDataPermissionFilters");
        LogOk(logger, "[OK] Dangerous APIs sealed");

        // 5) 租户 QueryFilter 验证（数据权限 QueryFilter 已移除，仅验证租户）
        if (!HasTenantFilter(db))
        {
            throw new InvalidOperationException("Tenant QueryFilter is not correctly configured.");
        }
        LogOk(logger, "[OK] Tenant QueryFilter active");

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
            if (item is null) continue;

            if (item is string s)
            {
                if (string.Equals(s, indexName, StringComparison.OrdinalIgnoreCase))
                    return true;
                continue;
            }

            var prop = item.GetType().GetProperty("IndexName");
            var name = prop?.GetValue(item) as string;
            if (!string.IsNullOrWhiteSpace(name) && string.Equals(name, indexName, StringComparison.OrdinalIgnoreCase))
                return true;
        }

        return false;
    }

    private static bool HasTenantFilter(ISqlSugarClient db)
    {
        var sql = db.Queryable<SysDepartment>().ToSql().Key;
        return sql.Contains("tenant_id", StringComparison.OrdinalIgnoreCase);
    }
}
