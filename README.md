# Cjora.SaaS

多租户 SaaS 基座：**Core（规则与抽象）** + **Caching（缓存能力）** + **Sys（IAM）** + **CRM / PM（可插拔业务域）**。

## 解决方案结构

```
/src
  Cjora.SaaS.Core/          规则与抽象：多租户、数据权限、SqlSugar、仓储
  Cjora.SaaS.Caching/       缓存能力：ICachingService / ILockService / IGeoService / IHashMapService
  Cjora.SaaS.Sys/           IAM：用户、角色、部门、租户、字典
  Cjora.SaaS.Sys.Api/       生产宿主（仅 IAM）
  Cjora.SaaS.Sys.Web/       Web 层（控制器、中间件）
/samples
  Cjora.SaaS.Host.Sample/   示例宿主（可选 CRM/PM 扩展演示）
  Cjora.SaaS.Crm/           客户域 Provider（可 dotnet pack）
  Cjora.SaaS.Pm/            项目域 Provider（可 dotnet pack）
```

| 项目 | 说明 |
|------|------|
| [Cjora.SaaS.Core](src/Cjora.SaaS.Core/README.md) | 多租户、软删除、数据权限契约、`ISqlSugarDataPermissionFilterProvider`、QueryFilter 编排 |
| **Cjora.SaaS.Caching** | 缓存抽象与 Memory / Redis 双实现（零依赖 Core） |
| [Cjora.SaaS.Sys](src/Cjora.SaaS.Sys/README.md) | IAM 业务：部门域行级过滤 Provider、权限缓存、版本号失效 |
| [Cjora.SaaS.Crm](samples/Cjora.SaaS.Crm/README.md) | 客户域实体 + Customer 范围 Provider |
| [Cjora.SaaS.Pm](samples/Cjora.SaaS.Pm/README.md) | 项目域实体 + Project 范围 Provider |
| **Cjora.SaaS.Sys.Api** | 生产宿主：Core + Caching + Sys |
| **Cjora.SaaS.Host.Sample** | 示例宿主：Core + Caching + Sys + CRM + PM |

## 缓存能力（Cjora.SaaS.Caching）

独立项目，**不依赖 Core**。提供四类缓存抽象与 Memory / Redis 双实现：

| 抽象 | Memory 实现 | Redis 实现 | 说明 |
|------|------------|------------|------|
| `ICachingService` | `MemoryCacheService` | `RedisCacheService` | 键值缓存（STRING） |
| `ILockService` | `MemoryLockService` | `RedisLockService` | 分布式锁（SET NX PX + Lua） |
| `IGeoService` | `MemoryGeoService` | `RedisGeoService` | Geo 空间搜索（GEOADD / GEORADIUS） |
| `IHashMapService` | `MemoryHashMapService` | `RedisHashMapService` | Hash 字典结构（HSET / HGET / HDEL） |

### 接入方式

在 `Program.cs` 调用：

```csharp
builder.Services.AddCjoraCaching(builder.Configuration);
```

在 `appsettings.json` 切换提供者：

```json
"Cache": {
  "Provider": "Memory",
  "DefaultExpireMinutes": 7,
  "Redis": {
    "Configuration": "localhost:6379",
    "Database": 0
  }
}
```

- `Provider=Memory`（默认）：单机运行，无需 Redis。
- `Provider=Redis`：多实例共享，缓存可跨进程。

### Key 规范

`SaaSCacheKeys` 工厂生成统一格式 Key：

```
saas:{module}:ver:{kind}:{tenantId}         版本号（分布式失效）
saas:{module}:{type}:user:{tenantId}:{userId}:v{version}  用户维度
saas:{module}:dept:closure:{tenantId}:{rootId}:v{version}  部门闭包
saas:{module}:lock:{kind}:{id}              分布式锁
```

## 选择性启用 CRM / PM

在 `appsettings.json`（仅 `Host.Sample` 使用）：

```json
"Modules": {
  "EnableCrmDataPermission": false,
  "EnablePmDataPermission": false
}
```

- `true` → 注册对应 Provider + `CodeFirst.InitTables`。
- `false` → **不得**为用户颁发 `data_scope = 4 (Project)` / `5 (Customer)`，否则 Fail-Fast。

**最小可运行组合**：

- **仅 IAM**：两开关均 `false`；只需 Core + Caching + Sys。
- **IAM + PM**：`EnablePmDataPermission: true`。
- **全量**：两开关均 `true`。

## 文档索引

| 文档 | 内容 |
|------|------|
| [Cjora.SaaS.Core/README.md](src/Cjora.SaaS.Core/README.md) | DataScope 全表、插件机制、执行链路 |
| [Cjora.SaaS.Sys/README.md](src/Cjora.SaaS.Sys/README.md) | IAM 边界、功能权限 vs 数据权限 |
| [Cjora.SaaS.Crm/README.md](samples/Cjora.SaaS.Crm/README.md) | 客户模型、Customer 范围、接入方式 |
| [Cjora.SaaS.Pm/README.md](samples/Cjora.SaaS.Pm/README.md) | 项目模型、EXISTS 形态、IProjectScopedEntity |
