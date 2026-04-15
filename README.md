# Cjora.SaaS — 生产级架构说明

本仓库包含：

| 项目 | 说明 |
|------|------|
| **Cjora.SaaS.Core** | 能力层：多租户强隔离、数据权限上下文/Scope、SqlSugar 集成、DataProtection、仓储抽象。 |
| **Cjora.SaaS.Sys** | 业务实现层：权限数据表（`sys_user_data_scope` / `sys_department_closure`）、EXISTS/JOIN 行级过滤 Provider、启动守门器（`ValidateSaaSOrThrow`）。 |
| **Cjora.SaaS.Sys.Api** | 示例宿主：启动阶段执行 `app.Services.ValidateSaaSOrThrow();`，缺索引/缺 Provider/生产 SQLite 等直接启动失败。 |

生产级细则见 Core 文档：[`Cjora.SaaS.Core/README.md`](Cjora.SaaS.Core/README.md)
