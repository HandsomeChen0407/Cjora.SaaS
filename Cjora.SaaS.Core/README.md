# Cjora.SaaS.Core

**模块职责**：提供多租户、软删除、数据权限**契约与运行时编排**、SqlSugar 全局 `QueryFilter`、仓储抽象、AOP 钩子；**不包含**任何业务表或业务域 EXISTS SQL（部门/项目/客户等由业务模块实现 `ISqlSugarDataPermissionFilterProvider`）。

**架构边界**

| Core 负责 | 业务模块（Sys / CRM / PM）负责 |
|-----------|-------------------------------|
| `ITenantScopedEntity`、租户过滤器 | 业务实体定义 |
| `ISqlSugarDataPermissionFilterProvider` 契约与统一调用 | 具体 `EXISTS`/`JOIN` SQL 形态 |
| `EnsureDataScopeHandledByProviders` Fail-Fast | 声明 `HandledDataScopes` 并注册 DI |
| `IDataPermissionContext` / `DataScopeKind` | JWT 中 `data_scope` 与角色配置一致 |
| `SqlSugarDataProtectionAop` 中 `TenantId`（及可选 `CreatorUserId`）注入 | 业务写入路径、是否开启 `AutoFillCreatorUserIdOnInsert` |

---

## 核心能力

### 多租户

- 所有实现 `ITenantScopedEntity` 的实体自动追加 `tenant_id = 当前租户`（由 `ITenantProvider` 提供）。
- 解析租户失败时策略由宿主中间件决定（通常 Fail-Fast）。

### 软删除

- `ISoftDeleteEntity`：`!is_deleted` 全局过滤；仓储删除转 UPDATE。

### 数据权限（DataScope）

**枚举 `DataScopeKind`（与 JWT `data_scope` 数值一致）**：

| 值 | 含义 | Core/过滤器行为概要 |
|----|------|---------------------|
| All / Tenant | 租户内不按部门/本人/项目/客户缩行 | 不追加 Department/Self/Project/Customer 条件（仍受租户+软删除约束） |
| Department | 部门树 | 需 **Sys** 的 Provider 注册 |
| Self | 仅本人创建 | `ICreatorOwnedEntity` → `creator_user_id = 当前用户` |
| **Project** | 项目域 | 需 **PM** 模块注册 Provider，否则 **Fail-Fast** |
| **Customer** | 客户域 | 需 **CRM** 模块注册 Provider，否则 **Fail-Fast** |

> **说明**：设计上是「租户隔离 + 可选行级子范围」；Project/Customer 与 All/Department/Self **并列**，由不同业务模块通过插件实现，**不要把 Customer 误写成 DataScope 枚举外的魔法数**——应使用 `DataScopeKind.Customer` 与 CRM Provider 配套。

### `ISqlSugarDataPermissionFilterProvider` 插件机制

1. 业务模块实现接口：`Apply(ISqlSugarClient, IDataPermissionContext)` 内 `AddTableFilter<IMarkerEntity>(...)`。
2. 实现 `HandledDataScopes`：声明本类库处理哪些 `DataScopeKind`（如 Sys → `Department`，PM → `Project`）。
3. 宿主 `services.AddScoped<ISqlSugarDataPermissionFilterProvider, YourProvider>()` 注册多个实例。
4. Core 在 `SqlSugarSaaSClientBuilder` 中先执行 `EnsureDataScopeHandledByProviders`，再遍历 `Apply`。

**扩展 Project / Customer 业务维度**：在独立类库中定义 `IProjectScopedEntity` / `ICustomerScopedEntity` 的实现实体与 Provider；Core **只提供接口名**，**不负责** EXISTS 内容。

### 执行链路（请求 → SQL）

```
HTTP 请求
  → JWT / ICurrentUser
  → IDataPermissionResolver.ResolveAsync()
  → IDataPermissionContext（Scope、CurrentUserId、Bypass…）
  → Scoped ISqlSugarClient 工厂
  → SqlSugarSaaSClientBuilder.ApplyGlobalQueryFilters
      → EnsureDataScopeHandledByProviders（Department/Project/Customer 必须有 Provider）
      → 各 ISqlSugarDataPermissionFilterProvider.Apply
      → ICreatorOwnedEntity（Self）
  → Queryable<T>() 生成 SQL（多段 AND）
```

---

## 示例：业务模块注册过滤器（伪代码）

业务模块内（非 Core）：

```csharp
public sealed class PmSqlSugarDataPermissionFilterProvider : ISqlSugarDataPermissionFilterProvider
{
    public IReadOnlyList<DataScopeKind> HandledDataScopes => new[] { DataScopeKind.Project };

    public void Apply(ISqlSugarClient client, IDataPermissionContext context)
    {
        client.QueryFilter.AddTableFilter<IProjectScopedEntity>(
            entity => /* ... EXISTS 子查询 ... */ true,
            QueryFilterProvider.FilterJoinPosition.Where);
    }
}
```

宿主：

```csharp
services.AddScoped<ISqlSugarDataPermissionFilterProvider, PmSqlSugarDataPermissionFilterProvider>();
```

---

## 常见错误用法

- ❌ 给用户颁发 `data_scope = Project(4)` / `Customer(5)`，但宿主未注册对应 Provider → **启动或首次建连时抛异常**（Fail-Fast，预期行为）。
- ❌ 在 Core 中写死 CRM/PM 的表名或 EXISTS → **破坏边界**；应放在各业务类库。
- ❌ 认为「只有 All / Department / Self」——忽略 `Tenant` 与插件扩展范围；以 `DataScopeKind` 源码为准。

---

## 全局过滤器叠加顺序（简表）

1. `ISoftDeleteEntity`  
2. `ITenantScopedEntity`  
3. 各 `ISqlSugarDataPermissionFilterProvider`（部门 / 客户 / 项目等）  
4. `ICreatorOwnedEntity`（Self）

更细的工程说明与禁止项见上文历史章节；上线前请同步阅读仓库 `docs/LAUNCH_ACCEPTANCE_REPORT.md`。
