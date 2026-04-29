using SqlSugar;
using System.Data;

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

        if (!HasIndex(db, "sys_agent", "idx_sys_agent_parent"))
        {
            missing.Add("sys_agent.idx_sys_agent_parent");
        }

        if (missing.Count > 0)
        {
            throw new Exception("Missing required indexes: " + string.Join(",", missing));
        }
    }

    private static bool HasIndex(ISqlSugarClient db, string tableName, string indexName)
    {
        // SQLite 下 DbMaintenance.GetIndexList 的返回结构/字段名不稳定，容易误判。
        // 直接查询 sqlite_master / PRAGMA 以真实索引名为准。
        if (db.CurrentConnectionConfig.DbType == global::SqlSugar.DbType.Sqlite)
        {
            try
            {
                // PRAGMA 不支持参数化表名；这里 tableName 为内部常量，风险可控。
                var dt = db.Ado.GetDataTable($"PRAGMA index_list('{tableName}')");
                foreach (DataRow row in dt.Rows)
                {
                    var name = row["name"]?.ToString();
                    if (!string.IsNullOrWhiteSpace(name) && string.Equals(name, indexName, StringComparison.OrdinalIgnoreCase))
                    {
                        return true;
                    }
                }

                return false;
            }
            catch
            {
                // 兜底：若 PRAGMA 失败再尝试 sqlite_master
                var master = db.Ado.GetDataTable(
                    $"SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='{tableName}'");
                foreach (DataRow row in master.Rows)
                {
                    var name = row["name"]?.ToString();
                    if (!string.IsNullOrWhiteSpace(name) && string.Equals(name, indexName, StringComparison.OrdinalIgnoreCase))
                    {
                        return true;
                    }
                }

                return false;
            }
        }

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

