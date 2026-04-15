# Cjora.SaaS — 生产级架构说明

本仓库包含：

| 项目 | 说明 |
|------|------|
| **Cjora.SaaS.Core** | 能力层：多租户强隔离、数据权限上下文/Scope、SqlSugar 集成、DataProtection、仓储抽象。 |
| **Cjora.SaaS.Sys** | 业务实现层：权限数据表（`sys_user_data_scope` / `sys_department_closure`）、EXISTS/JOIN 行级过滤 Provider、启动守门器（`ValidateSaaSOrThrow`）。 |
| **Cjora.SaaS.Sys.Api** | 示例宿主：启动阶段执行 `app.Services.ValidateSaaSOrThrow();`，缺索引/缺 Provider/生产 SQLite 等直接启动失败。 |

生产级细则见 Core 文档：[`Cjora.SaaS.Core/README.md`](Cjora.SaaS.Core/README.md)

## 上线前自检结论（基于当前代码）

- **多租户**：无租户直接 Fail-Fast（禁止默认租户/静默回退）。
- **数据权限**：部门范围由 Sys 的 `ISqlSugarDataPermissionFilterProvider` 以 EXISTS/JOIN 实现；`Disable()` 仅允许超级管理员或后台任务。
- **SqlSugar 并发**：同一 `ISqlSugarClient` 并发使用会直接抛异常；并发场景必须用 `ISqlSugarClientFactory.Create()` 创建隔离实例。
- **过滤器绕过**：运行时无法获取/操作 `QueryFilter` 或执行 `ClearFilter/DisableFilter` 类操作（直接抛异常）。
