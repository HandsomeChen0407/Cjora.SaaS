# Cjora.SaaS.Pm

## 模块职责

**项目域可复用类库**：项目、项目成员、项目合同；实现 **Project 数据范围** 的 SqlSugar 全局过滤（`DataScopeKind.Project`）。

**依赖**：仅 `Cjora.SaaS.Core`。

## 架构边界

- 与 CRM：**不 Join**；`PmProject.CustomerId` 为跨模块 **ID 引用** 仅。
- 与 Sys：`PmProjectMember.UserId` 引用 Sys 用户 **ID**，无外键、无程序集依赖。

## 项目域模型

| 实体 | 说明 |
|------|------|
| `PmProject` | 项目主表；`IProjectScopedEntity` 上 `ProjectId` 与主键 `id` 同义（`IsIgnore`）。 |
| `PmProjectMember` | 用户参与项目（`user_id` + `project_id`），**项目权限判定的核心表**。 |
| `PmProjectContract` | 合同；含 `project_id`。 |

## `IProjectScopedEntity` 的作用

标记「本行属于哪个项目」，供全局 `QueryFilter` 在 **`DataScopeKind.Project`** 下追加条件。实现类需暴露 **`ProjectId`**（项目主表可用忽略列与 `Id` 同步）。

## `PmSqlSugarDataPermissionFilterProvider` 详解

**文件**：`DataPermission/PmSqlSugarDataPermissionFilterProvider.cs`

**逻辑**：当 `IDataPermissionContext.Scope == Project` 且未 Bypass 时，对 `IProjectScopedEntity` 追加：

- **SQL 形态（概念）**：

```sql
AND EXISTS (
  SELECT 1 FROM pm_project_member m
  WHERE m.tenant_id = <主表>.tenant_id
    AND m.project_id = <主表>.project_id
    AND m.user_id = <当前用户>
    AND m.is_deleted = 0  -- 若子查询走全局过滤
)
```

实际由 SqlSugar `Subqueryable<PmProjectMember>().Where(...).Any()` 生成，**不使用 IN 列表**。

**HandledDataScopes**：`DataScopeKind.Project` 唯一。

## 如何接入 DataScope

1. `Modules:EnablePmDataPermission = true`
2. `services.AddCjoraSaaSPmDataPermission()`
3. 仅在此之后为用户颁发 **`data_scope = 4`（Project）**。

## 示例：宿主注册

```csharp
builder.Services.AddCjoraSaaSPmDataPermission();
```

## 常见错误用法

- ❌ 未注册 PM Provider 却颁发 `data_scope=Project(4)` → 创建 `ISqlSugarClient` 时抛异常。
- ❌ 在 SQL 层与 `crm_customer` 做 Join 聚合——应在上层应用聚合（当前代码库无此类 Join）。
