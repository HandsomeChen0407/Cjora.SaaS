# Cjora.SaaS

本仓库包含：

| 项目 | 说明 |
|------|------|
| **Cjora.SaaS.Core** | 可复用的 .NET 8 SaaS 基础库：多租户、SqlSugar 全局过滤（租户 + **运行时**行级数据权限）、DataPermission / DataProtection、仓储与认证抽象。 |
| **Cjora.SaaS.Sys** | 系统管理 / IAM 示例实现。 |
| **Cjora.SaaS.Sys.Api** | API 宿主示例。 |

**工程级说明**（架构、Controller/后台正确用法、错误示例、`Disable()` 与生命周期坑、AES/Hash 边界）：见 [`Cjora.SaaS.Core/README.md`](Cjora.SaaS.Core/README.md)。
