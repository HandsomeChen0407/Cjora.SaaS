# Cjora.SaaS

多租户 SaaS 基座：**Core（能力）** + **Sys（IAM）** + **CRM / PM（可插拔业务域类库）** + **Sys.Api（示例宿主）**。

## 解决方案结构

| 项目 | 说明 |
|------|------|
| [Cjora.SaaS.Core](Cjora.SaaS.Core/README.md) | 多租户、软删除、数据权限契约、`ISqlSugarDataPermissionFilterProvider`、QueryFilter 编排 |
| [Cjora.SaaS.Sys](Cjora.SaaS.Sys/README.md) | IAM：用户、角色、部门、租户、字典；部门域行级过滤 Provider |
| [Cjora.SaaS.Crm](Cjora.SaaS.Crm/README.md) | 客户域实体 + Customer 范围 Provider（可 `dotnet pack`） |
| [Cjora.SaaS.Pm](Cjora.SaaS.Pm/README.md) | 项目域实体 + Project 范围 Provider（可 `dotnet pack`） |
| **Cjora.SaaS.Sys.Api** | 宿主：组合 Core + Sys +（可选）CRM/PM；`appsettings` 中 `Modules:*` 开关 |

## 选择性启用 CRM / PM（示例）

在 `appsettings.json`：

```json
"Modules": {
  "EnableCrmDataPermission": false,
  "EnablePmDataPermission": false
}
```

在 `Program.cs`（已内置逻辑）：

- `true` → `AddCjoraSaaSCrmDataPermission()` / `AddCjoraSaaSPmDataPermission()`，并对相应实体 `CodeFirst.InitTables`。
- `false` → **不得**为用户颁发 `data_scope = 4 (Project)` / `5 (Customer)`，否则创建 SqlSugar 客户端 **Fail-Fast**（见 Core `EnsureDataScopeHandledByProviders`）。

**最小可运行组合**：

- **仅 IAM**：两开关均为 `false`；只需 Core + Sys（与当前默认一致）。
- **IAM + PM**：`EnablePmDataPermission: true`，并注册 PM Provider。
- **全量**：两开关均为 `true`。

**跨仓库复用**：同一目录下 `ProjectReference`；对外可 `dotnet pack` Crm/Pm 为 `Cjora.SaaS.Crm` / `Cjora.SaaS.Pm` NuGet，宿主 `PackageReference` + 同上 `Add*` 调用。

## 文档索引

| 文档 | 内容 |
|------|------|
| [Cjora.SaaS.Core/README.md](Cjora.SaaS.Core/README.md) | DataScope 全表、插件机制、执行链路、示例 |
| [Cjora.SaaS.Sys/README.md](Cjora.SaaS.Sys/README.md) | IAM 边界、功能权限 vs 数据权限 |
| [Cjora.SaaS.Crm/README.md](Cjora.SaaS.Crm/README.md) | 客户模型、Customer 范围、接入方式 |
| [Cjora.SaaS.Pm/README.md](Cjora.SaaS.Pm/README.md) | 项目模型、EXISTS 形态、IProjectScopedEntity |
