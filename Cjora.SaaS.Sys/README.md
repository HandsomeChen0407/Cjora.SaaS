# Cjora.SaaS.Sys

## 模块职责

**IAM（身份与访问管理）**：用户、角色、部门、租户主数据、字典、权限定义与角色-权限绑定；提供 **部门域** 行级数据权限所需的 **Sys 侧表**（如 `sys_user_data_scope`、`sys_department_closure`）及 `SysSqlSugarDataPermissionFilterProvider`。

**不负责**：客户、项目等业务实体；业务域 EXISTS 由 CRM/PM 等模块实现。

## 架构边界

| 边界 | 说明 |
|------|------|
| 与 Core | 仅依赖 `Cjora.SaaS.Core`；实现 `ISqlSugarDataPermissionFilterProvider` 中 **Department** 范围。 |
| 与 CRM/PM | **无项目引用**；业务模块不引用 Sys（当前 CRM/PM 仅引用 Core）。用户 Id、租户编码在应用层以 **long / string** 传递。 |
| 功能权限 vs 数据权限 | **功能权限**：PermCode、角色-权限，用于「能否访问某 API / 菜单」。**数据权限**：`DataScopeKind` + QueryFilter，用于「能看哪些行」。二者解耦，勿混用同一套表表达。 |

## 权限模型（简述）

- **功能权限**：`SysPermission`、`SysRolePermission` 等，解析为有效 PermCode 集合（见 `IEffectivePermissionResolver`）。
- **数据权限**：用户/角色在 `sys_user_data_scope` 等与部门闭包表配合；JWT 携带 `data_scope`（数值枚举），**不**携带大量部门 Id 列表（当前实现为 EXISTS）。

## 与 Core 集成

1. `SysServiceCollectionExtensions.AddCjoraSaaSSys()`：注册 Sys 服务与 `SysSqlSugarDataPermissionFilterProvider`。
2. 宿主在 `AddCjoraSaaSWithSqlSugar` 之后调用上述扩展。
3. 部门域过滤实现位置：`Infrastructure/DataPermission/SysSqlSugarDataPermissionFilterProvider.cs`。

## 示例：宿主注册（节选）

```csharp
builder.Services.AddCjoraSaaSWithSqlSugar(/* ... */);
builder.Services.AddCjoraSaaSSys();
```

## 常见错误用法

- ❌ 在 Sys 实体中增加 `CustomerId`/`ProjectId` 等业务外键列 → **污染 IAM 边界**。
- ❌ 假设「登录即可管理所有 IAM 接口」——宿主 API 应额外配置 **PermCode** 级授权（当前 Sys.Api 需补强，见 `docs/LAUNCH_ACCEPTANCE_REPORT.md`）。
