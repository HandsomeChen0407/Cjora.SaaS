# Cjora.SaaS.Sys.Api

## 模块职责

**生产级 IAM 宿主**：只包含 Core + Sys + Sys.Web，不加载任何业务模块（CRM / PM 等）。  
负责将所有依赖装配为可运行的 ASP.NET Core 应用，并完成 SQLite CodeFirst 建表与默认租户初始化。

---

## 架构边界

| 负责 | 不负责 |
|------|--------|
| Program.cs DI 装配与管道组装 | 业务逻辑（委托给 Sys） |
| JWT 鉴权配置、Swagger 接入 | CRM/PM 模块注册（由 Host.Sample 负责） |
| SQLite CodeFirst 建表（仅 IAM 实体） | ORM 定义（由 Sys 的实体定义） |
| CORS 配置（`SysWebOrigins`） | 反向代理 / TLS 终止 |
| 环境变量 / `appsettings.json` 读取 | 多数据库（当前单 SQLite） |

---

## 依赖关系

```
Cjora.SaaS.Sys.Api
  → 依赖 Cjora.SaaS.Core
  → 依赖 Cjora.SaaS.Sys
  → 依赖 Cjora.SaaS.Sys.Web
  → 依赖 Cjora.SaaS.Caching
  → 依赖 Cjora.SaaS.Logging
```

不引用 Crm / Pm 程序集。

---

## 核心能力

- 完整 IAM API（用户 / 角色 / 部门 / 权限 / 字典 / 租户）
- JWT Bearer 鉴权 + `PermCode` 功能权限
- 结构化请求日志（`UseCjoraRequestLogging`），含 DataScope 领域字段
- 分布式缓存（Memory 默认，可切换 Redis）
- 全局 30s 请求超时（`UseRequestTimeouts`）
- 启动时 `ValidateSaaSOrThrow()` 验证 Provider 注册完整性

---

## 启动顺序（管道）

```
UseRequestTimeouts
UseCjoraSaaSSysInfrastructure  →  内含 UseCjoraRequestLogging（日志+异常处理）
UseCors
UseCjoraSaaSSysTenantResolution  →  从 X-Tenant-Id Header 解析当前租户
UseAuthentication
UseAuthorization
MapControllers
```

---

## 配置说明

```json
// appsettings.json
{
  "Cache": {
    "Provider": "Memory",          // 改为 "Redis" 启用分布式缓存
    "DefaultExpireMinutes": 7,
    "Redis": {
      "Configuration": "localhost:6379",
      "Database": 0
    }
  },
  "ConnectionStrings": {
    "SqlSugar": "DataSource=cjora_sys_api.db"  // SQLite，生产替换为 MySQL/PostgreSQL 连接串
  },
  "Jwt": {
    "Issuer": "CjoraSaaS",
    "Audience": "CjoraSaaS",
    "Secret": "【至少 32 字符的随机密钥】",
    "ExpiresHours": 8
  },
  "Cors": {
    "SysWebOrigins": [ "http://localhost:5173" ]
  }
}
```

---

## 使用方式

```bash
# 直接运行（开发）
dotnet run --project src/Cjora.SaaS.Sys.Api

# 切换 Redis 缓存
# appsettings.json -> Cache:Provider = "Redis"
# 确保 Redis 已启动，默认连接 localhost:6379
```

启动后：
- Swagger UI：`http://localhost:{port}/swagger`
- 登录接口：`POST /api/auth/login`
- 所有接口需要 `Authorization: Bearer {token}` + `X-Tenant-Id: {tenantCode}` Header

---

## 示例：最简 curl 验证

```bash
# 1. 登录
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: default" \
  -d '{"username":"admin","password":"123456"}'

# 2. 带 Token 查询用户列表
curl http://localhost:5000/api/users \
  -H "Authorization: Bearer {token}" \
  -H "X-Tenant-Id: default"
```

---

## 常见错误用法

| 错误 | 后果 | 正确做法 |
|------|------|----------|
| 在 Sys.Api 的 `Program.cs` 中注册 `AddCjoraSaaSCrmDataPermission` | 破坏"生产宿主只含 IAM"约束 | CRM/PM 数据权限只在 Host.Sample 中注册 |
| 不配置 `X-Tenant-Id` 直接调用接口 | `ITenantProvider.GetTenantId()` 返回空，可能 Fail-Fast | 每次请求必须带 `X-Tenant-Id` Header |
| 生产环境使用 SQLite | 不支持并发写入，无法多实例部署 | 生产替换 `ConnectionStrings:SqlSugar` 为 MySQL / PostgreSQL 连接串 |
| 多实例部署时仍用 `Cache:Provider=Memory` | 各实例缓存不共享，权限变更后部分实例仍读旧数据 | 多实例必须切换 `Cache:Provider=Redis` |
| JWT Secret 提交到版本库 | 密钥泄露，Token 可伪造 | 通过环境变量或 Secret Manager 注入 |
