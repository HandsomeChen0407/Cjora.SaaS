using SqlSugar;

namespace Cjora.SaaS.Sys.SqlSugar;

public static class DatabaseSchemaValidator
{
    public static void ValidateIndexes(ISqlSugarClient db)
    {
        var missing = new List<string>();

        if (!HasIndex(db, "sys_user_data_scope", "idx_user_scope"))
        {
            missing.Add("sys_user_data_scope.idx_user_scope");
        }

        if (!HasIndex(db, "sys_department_closure", "idx_closure_ad"))
        {
            missing.Add("sys_department_closure.idx_closure_ad");
        }

        if (!HasIndex(db, "sys_department_closure", "idx_closure_d"))
        {
            missing.Add("sys_department_closure.idx_closure_d");
        }

        if (!HasIndex(db, "sys_department_scoped_setting", "idx_tenant_dept"))
        {
            // 示例业务表：本仓库唯一明确实现 IDepartmentScopedEntity 的实体表
            missing.Add("sys_department_scoped_setting.idx_tenant_dept");
        }

        if (missing.Count > 0)
        {
            throw new Exception("Missing required indexes: " + string.Join(",", missing));
        }
    }

    private static bool HasIndex(ISqlSugarClient db, string tableName, string indexName)
    {
        // DbMaintenance.GetIndexList 在不同 DbType 下返回不同结构，这里按名称匹配。
        var list = db.DbMaintenance.GetIndexList(tableName);
        foreach (var item in list)
        {
            if (item is null)
            {
                continue;
            }

            // SqlSugar 在部分实现中返回 string 列表
            if (item is string s)
            {
                if (string.Equals(s, indexName, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }

                continue;
            }

            // 其他实现返回带 IndexName 属性的对象
            var prop = item.GetType().GetProperty("IndexName");
            var name = prop?.GetValue(item) as string;
            if (!string.IsNullOrWhiteSpace(name) && string.Equals(name, indexName, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }
}

