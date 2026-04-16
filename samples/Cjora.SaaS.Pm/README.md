# Cjora.SaaS.Pm

## 模块职责

演示如何扩展 Core 框架，为 **PM 项目域**（`DataScopeKind.Project`）实现行级数据权限。  
本项目是业务模块实现 `IDataScopeIdResolver` 的参考范例，不包含完整 PM 业务逻辑。

---

## 架构边界

| 负责 | 不负责 |
|------|--------|
| `IProjectScopedEntity` 标记接口（供实体实现） | 项目 CRUD 业务接口 |
| `ProjectDataScopeIdResolver`（Project 行级过滤） | 用户、角色、权限等 IAM 功能 |
| `AddCjoraSaaSPmDataPermission()` DI 注册入口 | 缓存、日志基础设施 |
| 示例实体（`PmProject`、`PmProjectMember`、`PmProjectContract`） | 完整的 PM 产品功能 |

不引用 `Cjora.SaaS.Sys`、`Cjora.SaaS.Logging`、`Cjora.SaaS.Caching`，仅依赖 Core。

---

## 依赖关系

```
Cjora.SaaS.Pm
  → 依赖 Cjora.SaaS.Core（IDataScopeIdResolver 接口）
  ← 被 Host.Sample 按需引用（EnablePmDataPermission=true 时）
```

---

## 核心能力

### `ProjectDataScopeIdResolver`

- 处理 `DataScopeKind.Project`
- 对所有实现 `IProjectScopedEntity` 的表追加 EXISTS 子查询：

```sql
-- 伪 SQL
WHERE EXISTS (
  SELECT 1 FROM pm_project_member m
  WHERE m.tenant_id = entity.tenant_id
    AND m.project_id = entity.project_id
    AND m.user_id = @currentUserId
)
```

- 不使用 IN
- `BypassRowLevelFilters = true` 时自动跳过

---

## 使用方式

```csharp
// 在宿主 Program.cs 中条件注册：
if (enablePmDataPermission)
{
    builder.Services.AddCjoraSaaSPmDataPermission();
}
```

注意：**未调用此方法**时，不得为用户颁发 `data_scope = Project`，否则 Core 在创建 SqlSugar Client 时 Fail-Fast。

---

## 示例：自定义实体接入项目域过滤

```csharp
// 1. 定义实体，实现标记接口
public class PmTask : ITenantScopedEntity, ISoftDeleteEntity, IProjectScopedEntity
{
    public long ProjectId { get; set; }  // IProjectScopedEntity 要求
    // ... 其他字段
}

// 2. 无需额外配置，Provider 自动对所有 IProjectScopedEntity 表生效
```

---

## 常见错误用法

| 错误 | 后果 | 正确做法 |
|------|------|----------|
| 在 Sys 或 Core 中引用 Pm 程序集 | 产生单向依赖循环，破坏分层架构 | Pm 只被宿主（Host.Sample）引用 |
| 实体未实现 `IProjectScopedEntity` 但期望被项目域过滤 | 过滤器对此表不生效，数据全量可见 | 必须显式实现 `IProjectScopedEntity` |
| `PmProjectMember` 表缺失或未建立 | EXISTS 子查询无法执行 | 启用 PM 数据权限时必须先 CodeFirst 初始化 PM 实体表 |
| 同时在 Sys.Api（生产宿主）中调用 `AddCjoraSaaSPmDataPermission` | Sys.Api 产生对 Pm 程序集的引用，破坏"生产宿主只含 IAM"约束 | 只在 Host.Sample 按开关注册 |
