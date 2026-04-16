# Cjora.SaaS.Core

## 职责

- 多租户：`ITenantScopedEntity` → 全局 `tenant_id` 条件  
- 软删除：`ISoftDeleteEntity` → `!is_deleted`；仓储删除转 UPDATE  
- 数据权限：`IDataPermissionContext`、`DataScopeKind`、`ISqlSugarDataPermissionFilterProvider`（**仅契约与注册编排**）、`EnsureDataScopeHandledByProviders`（Department / Project / Customer 无 Provider 时 Fail-Fast）  
- SqlSugar：Scoped `ISqlSugarClient` 构建、`QueryFilter` 叠加顺序、AOP（`TenantId` / 可选 `CreatorUserId`）  
- 仓储抽象、租户/过滤器扩展（`ClearTenantFilters` 等，受 SuperAdmin 等约束）

**不包含**：任何业务表、业务 EXISTS SQL、IAM/CRM/PM 程序集引用。

## QueryFilter 叠加顺序（AND）

1. `ISoftDeleteEntity`  
2. `ITenantScopedEntity`  
3. 各 `ISqlSugarDataPermissionFilterProvider.Apply`  
4. `ICreatorOwnedEntity`（仅 `DataScopeKind.Self` 时收紧）

## 宿主必做

- 注册 `IDataPermissionContext` / `IDataPermissionResolver`  
- 按数据范围注册足够数量的 `ISqlSugarDataPermissionFilterProvider` 且 `HandledDataScopes` 覆盖当前用户 `Scope`  
- JWT `data_scope` 与已注册 Provider 一致，否则创建客户端失败

## 代码入口（查阅）

| 内容 | 路径 |
|------|------|
| 过滤器构建 | `SqlSugar/Providers/SqlSugarSaaSClientBuilder.cs` |
| Provider 接口 | `SqlSugar/Abstractions/ISqlSugarDataPermissionFilterProvider.cs` |
| 数据范围枚举 | `DataPermission/Enums/DataScopeKind.cs` |
| 租户过滤器扩展 | `SqlSugar/Extensions/SqlSugarTenantQueryableExtensions.cs` |

## 生产约束（违反即风险）

- 勿在 Core 引用业务模块  
- 勿用 JWT 携带大权限集合替代 EXISTS（当前设计为库侧子查询）  
- `bypass_row_filters` 声明仅用于受控账号；误发 = 行级隔离失效  
- 并发禁止共用同一 `ISqlSugarClient` 实例（见 Guard）
