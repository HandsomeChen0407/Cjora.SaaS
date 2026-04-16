# Cjora.SaaS

多租户 SaaS 框架基座：Core（规则与抽象）+ Caching（缓存能力）+ Logging（请求日志）+ Sys（IAM）+ 可插拔业务域（CRM / PM）。

---

## 解决方案结构

```
/src
  Cjora.SaaS.Core/          规则与抽象：多租户、数据权限契约、SqlSugar 管道、仓储
  Cjora.SaaS.Caching/       缓存基础设施：ICachingService / ILockService / IGeoService / IHashMapService
  Cjora.SaaS.Logging/       请求日志中间件：结构化日志 + 统一异常响应 + IRequestLogEnricher 扩展
  Cjora.SaaS.Sys/           IAM 业务层：用户、角色、部门、权限码、字典、数据权限解析
  Cjora.SaaS.Sys.Web/       HTTP 层：Controller、JWT、PermCode 功能权限
  Cjora.SaaS.Sys.Api/       生产宿主（仅 IAM，不含业务模块）
/samples
  Cjora.SaaS.Host.Sample/   示例宿主（可按开关加载 CRM/PM 数据权限扩展）
  Cjora.SaaS.Crm/           客户域 DataPermission Provider（可 dotnet pack 独立分发）
  Cjora.SaaS.Pm/            项目域 DataPermission Provider（可 dotnet pack 独立分发）
```

---

## 项目一览

| 项目 | 层次 | 依赖 | 主要职责 |
|------|------|------|---------|
| [Core](src/Cjora.SaaS.Core/README.md) | 规则层 | SqlSugar | 多租户、软删除、数据权限契约（ORM 过滤 + ORM 无关双路径）、QueryFilter 管道 |
| [Caching](src/Cjora.SaaS.Caching/README.md) | 基础设施 | StackExchange.Redis | 键值缓存、分布式锁、GEO、Hash、缓存失效广播，独立于 Core |
| [Logging](src/Cjora.SaaS.Logging/README.md) | 基础设施 | ASP.NET Core | 请求结构化日志（W3C Trace）、服务/实例标识、异常 JSON 响应，独立于 Core |
| [Sys](src/Cjora.SaaS.Sys/README.md) | 业务层 | Core + Caching + Logging | IAM 业务，实现 Core 所有可插拔接口 |
| [Sys.Web](src/Cjora.SaaS.Sys.Web/README.md) | HTTP 层 | Sys | Controller、JWT 签发、PermCode 鉴权 |
| [Sys.Api](src/Cjora.SaaS.Sys.Api/README.md) | 生产宿主 | Sys + Sys.Web + Caching + Logging | 纯 IAM 服务，无业务模块 |
| [Host.Sample](samples/Cjora.SaaS.Host.Sample/README.md) | 示例宿主 | Sys + CRM + PM | 框架扩展演示，不用于生产 |
| [Crm](samples/Cjora.SaaS.Crm/README.md) | 业务模块 | Core | 客户域 Provider（DataScopeKind.Customer） |
| [Pm](samples/Cjora.SaaS.Pm/README.md) | 业务模块 | Core | 项目域 Provider（DataScopeKind.Project） |

---

## 数据权限机制（核心设计）

数据权限由 **DataScopeKind 枚举** 描述，提供两条消费路径（并行存在）：

**路径 A：ORM 层自动过滤（单体 / SqlSugar 服务）**

```
租户过滤（ITenantScopedEntity）           — 所有查询强制带 tenant_id
    ↓ AND
行级过滤（IDataScopeIdResolver）  — 各业务模块注册，处理指定 DataScope
    ↓ AND
Self 过滤（ICreatorOwnedEntity）          — DataScopeKind.Self 时追加创建人条件
```

**路径 B：结构化数据返回（微服务 / 其他 ORM）**

```
IDataPermissionContext → IDataScopeIdResolver → DataPermissionResult
    → 返回部门 Id 列表 / 项目 Id 列表 / 是否全量等结构化数据
    → 消费方自行转化为 WHERE 条件、API 过滤或其他形态
```

| DataScopeKind | 含义 | 需要哪个 Provider |
|---------------|------|-----------------|
| `All / Tenant` | 租户内全量 | 无（不追加行级条件） |
| `Department` | 可访问部门树 | `DepartmentDataScopeIdResolver`（Sys 提供） |
| `Self` | 仅本人创建 | Core 内置 `ICreatorOwnedEntity` 过滤器 |
| `Customer` | 仅本人创建的客户及子资源 | `CustomerDataScopeIdResolver`（Crm 提供） |
| `Project` | 仅本人参与的项目及子资源 | `ProjectDataScopeIdResolver`（Pm 提供） |

如果用户 JWT 的 `data_scope` 声明了某个 Scope，但对应 Provider 未注册，Core 在创建 SqlSugar Client 时**立即 Fail-Fast**。

---

## 缓存（Cjora.SaaS.Caching）

独立项目，不依赖 Core/Sys。提供五类抽象与 Memory / Redis 双实现：

| 抽象 | Memory 实现 | Redis 实现 |
|------|-------------|------------|
| `ICachingService` | `MemoryCacheService` | `RedisCacheService` |
| `ILockService` | `MemoryLockService`（进程内） | `RedisLockService`（SET NX PX + Lua） |
| `IGeoService` | `MemoryGeoService`（Haversine） | `RedisGeoService`（GEOADD / GEORADIUS） |
| `IHashMapService` | `MemoryHashMapService` | `RedisHashMapService` |
| `ICacheInvalidationBus` | `MemoryCacheInvalidationBus`（进程内） | `RedisCacheInvalidationBus`（Pub/Sub） |

**配置切换**（`appsettings.json`）：

```json
"Cache": {
  "Provider": "Memory",
  "DefaultExpireMinutes": 7,
  "Redis": { "Configuration": "localhost:6379", "Database": 0 }
}
```

**多实例部署必须使用 `Provider=Redis`**，Memory 实现不跨进程共享。

---

## 请求日志（Cjora.SaaS.Logging）

独立项目，不依赖 Core/Sys。每个请求输出一条结构化日志：

```
TraceId / SpanId / ParentSpanId / ServiceName / InstanceId / Method / Path / StatusCode / ElapsedMs / UserId / TenantId
```

- W3C TraceContext 标准：`TraceId / SpanId / ParentSpanId` 自动与 `traceparent` 头对齐，跨服务调用链路可追踪
- `ServiceName / InstanceId`：微服务多实例部署时区分日志来源
- 通过 `IRequestLogEnricher` 扩展：Sys 已注册 `DataPermissionRequestLogEnricher`，额外输出 `DataScope / BypassRowLevelFilters`
- 未处理异常返回统一 JSON：`{ success: false, error: "unhandled", traceId, message }`

---

## 快速启动

```bash
# 生产宿主（仅 IAM）
dotnet run --project src/Cjora.SaaS.Sys.Api

# 示例宿主（含 CRM + PM 演示）
dotnet run --project samples/Cjora.SaaS.Host.Sample
```

最小化接入清单（新业务模块接入 Department 数据权限示例）：

```csharp
// 1. 实体标记接口
public class MyEntity : ITenantScopedEntity, IDepartmentScopedEntity { ... }

// 2. 模块使用 Sys 已有的 DepartmentDataScopeIdResolver
//    不需要额外注册（Sys 已覆盖 Department Scope）

// 3. Program.cs
builder.Services.AddCjoraSaaSWithSqlSugar(...);
builder.Services.AddCjoraSaaSSys();
builder.Services.AddCjoraCaching(builder.Configuration);
builder.Services.AddCjoraLogging(o => o.IncludeExceptionDetail = env.IsDevelopment());
```

---

## 文档索引

| 文档 | 内容 |
|------|------|
| [Core/README.md](src/Cjora.SaaS.Core/README.md) | QueryFilter 顺序、Provider 插件机制、仓储边界 |
| [Caching/README.md](src/Cjora.SaaS.Caching/README.md) | 四类缓存抽象、Key 规范、Memory vs Redis 选择 |
| [Logging/README.md](src/Cjora.SaaS.Logging/README.md) | 中间件字段、IRequestLogEnricher 扩展 |
| [Sys/README.md](src/Cjora.SaaS.Sys/README.md) | 数据权限解析链、缓存版本失效、Department 过滤 |
| [Sys.Web/README.md](src/Cjora.SaaS.Sys.Web/README.md) | Controller 列表、PermCode 功能权限、JWT 配置 |
| [Sys.Api/README.md](src/Cjora.SaaS.Sys.Api/README.md) | 生产宿主配置、管道顺序、curl 示例 |
| [Host.Sample/README.md](samples/Cjora.SaaS.Host.Sample/README.md) | 按开关启用 CRM/PM、示例测试用途 |
| [Crm/README.md](samples/Cjora.SaaS.Crm/README.md) | 客户域 Provider 实现参考 |
| [Pm/README.md](samples/Cjora.SaaS.Pm/README.md) | 项目域 Provider 实现参考 |
