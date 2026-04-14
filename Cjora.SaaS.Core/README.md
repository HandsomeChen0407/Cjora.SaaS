# Cjora.SaaS.Core

面向 **.NET 8** 的可复用 **SaaS Core 基础框架**，提供：

- **MultiTenancy**：租户识别（Header/JWT/子域）、请求级缓存、存储路由抽象（共享库/独立库/分片）
- **SqlSugar**：按租户创建 `ISqlSugarClient`、全局 `QueryFilter`（租户+数据权限）、写入 AOP（自动写入 `TenantId`/可选自动填充创建人）
- **DataPermission**：行级数据权限上下文（租户内 All/Tenant/Department/Self）
- **Repository**：租户仓储抽象 + SqlSugar 实现（分页模型、CRUD、按租户删除保护）
- **Auth**：`ICurrentUser`（声明读取与强类型解析）

本库的目标是**稳定抽象**与**可替换实现**：上层业务依赖 `Abstractions`，基础设施细节封装在 `Providers/Resolvers`，宿主通过 `Hosting` 一键注册。

---

## 核心模块说明

### MultiTenancy
- **租户识别链**：Header → JWT Claim → Subdomain → DefaultTenant
- **关键接口**
  - `MultiTenancy.Abstractions.ITenantProvider`：业务层获取当前租户
  - `MultiTenancy.Abstractions.ITenantIdentifierResolver`：解析租户标识
  - `MultiTenancy.Abstractions.ITenantStorageRoutingProvider`：解析“该租户数据应落哪里”（共享库/独立库/分片）
- **中间件**
  - `MultiTenancy.Middleware.TenantMiddleware`：将解析结果写入 `HttpContext.Items`，避免重复解析

### DataPermission
- **关键接口**
  - `DataPermission.Abstractions.IDataPermissionContext`
- **默认实现**
  - `DataPermission.Providers.DefaultDataPermissionContext`：从声明读取数据范围、部门列表与 bypass 标记

### SqlSugar
- **Options**
  - `SqlSugar.Models.SqlSugarSaaSOptions`
- **工厂**
  - `SqlSugar.Providers.SqlSugarTenantClientFactory`：按租户/路由创建 `ISqlSugarClient`，注册过滤器与 AOP
- **扩展**
  - `SqlSugar.Extensions.SqlSugarTenantQueryableExtensions`：清除过滤器（运维/平台管理员场景，需上层自行鉴权）

### Repository
- **抽象**
  - `Repository.Abstractions.IRepository<TEntity>`
  - `Repository.Abstractions.ITenantScopedEntity`
- **实现**
  - `Repository.Providers.SqlSugarRepository<TEntity>`
- **模型**
  - `Repository.Models.PagedRequest` / `Repository.Models.PagedResult<TEntity>`

### Auth
- **抽象**
  - `Auth.Abstractions.ICurrentUser`
- **实现**
  - `Auth.Providers.CurrentUser`

---

## 架构设计说明（分层思想）

每个模块统一采用以下分层（同名目录）：

- **Abstractions**：接口定义（`Ixxx`），业务层只依赖这里
- **Providers**：对外提供能力的实现（如 `HttpTenantProvider`、`SqlSugarTenantClientFactory`）
- **Resolvers**：解析逻辑（如租户标识解析器）
- **Models**：配置类、DTO、结果对象
- **Enums / Constants**
- **Middleware**
- **Extensions**：模块内扩展方法（避免把注册入口塞到 Extensions）
- **Hosting**：对宿主暴露的注册入口（`IServiceCollection`/`IApplicationBuilder`）

---

## 快速开始

### 1) 注册（推荐：一次注册 Core + SqlSugar）

```csharp
using Cjora.SaaS.Core.Extensions;
using Cjora.SaaS.Core.Repository.Hosting;
using SqlSugar;

builder.Services.AddCjoraSaaSWithSqlSugar(
    configureTenant: o =>
    {
        o.DefaultTenantId = "default";
        // o.TenantIdHeaderName = "X-Tenant-Id";
        // o.EnableJwtClaimTenantResolution = true;
        // o.EnableSubdomainTenantResolution = true;
    },
    configureSqlSugar: o =>
    {
        o.DbType = DbType.Sqlite;
        o.MasterConnectionString = "Data Source=app.db";
    });

// 仓储（按实体逐个注册）
builder.Services.AddSqlSugarTenantRepository<YourEntity>();
```

### 2) 管道：启用租户解析中间件

```csharp
using Cjora.SaaS.Core.MultiTenancy.Hosting;

app.UseTenantResolution();
```

> 若租户仅来自 JWT，请按你的认证顺序在 `UseAuthentication()` 之后注册。

---

## 示例代码

### 获取 TenantId

```csharp
using Cjora.SaaS.Core.MultiTenancy.Abstractions;

public sealed class DemoService
{
    private readonly ITenantProvider _tenantProvider;

    public DemoService(ITenantProvider tenantProvider) => _tenantProvider = tenantProvider;

    public string GetTenantId() => _tenantProvider.GetTenantId();
}
```

### 使用 SqlSugar（按租户自动连接 + 自动租户过滤）

```csharp
using SqlSugar;

public sealed class DemoQuery
{
    private readonly ISqlSugarClient _db;
    public DemoQuery(ISqlSugarClient db) => _db = db;

    public Task<List<YourEntity>> GetAsync(CancellationToken ct)
        => _db.Queryable<YourEntity>().ToListAsync(ct);
}
```

---

## 目录结构说明（Core）

```text
Cjora.SaaS.Core/
├─ Hosting/                 # 聚合入口（AddSaaSCore / AddCjoraSaaSWithSqlSugar）
├─ MultiTenancy/
│  ├─ Abstractions/ Providers/ Resolvers/ Models/ Constants/ Middleware/ Hosting/
├─ Auth/
│  ├─ Abstractions/ Providers/
├─ DataPermission/
│  ├─ Abstractions/ Providers/ Models/ Enums/
├─ SqlSugar/
│  ├─ Hosting/ Providers/ Models/ Extensions/
└─ Repository/
   ├─ Abstractions/ Providers/ Models/ Hosting/
```

---

## 扩展指南：自定义 `TenantStorageRoutingProvider`

> 目标：从“共享库”切换到“一租户一库/大客户独立库”，业务层代码不变。

```csharp
using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Cjora.SaaS.Core.MultiTenancy.Models;

public sealed class TenantStorageRoutingProvider : ITenantStorageRoutingProvider
{
    public ValueTask<TenantStorageRoutingContext> ResolveAsync(string tenantId, CancellationToken cancellationToken = default)
    {
        // 示例：从目录库/配置中心/缓存中查连接串（此处省略）
        var dedicated = GetConnectionStringForTenant(tenantId);
        return ValueTask.FromResult(new TenantStorageRoutingContext(
            tenantId: tenantId,
            usesSharedPhysicalDatabase: false,
            dedicatedConnectionString: dedicated,
            catalogOrShardKey: null));
    }

    private static string GetConnectionStringForTenant(string tenantId) => $"Data Source={tenantId}.db";
}
```

注册替换：

```csharp
using Cjora.SaaS.Core.MultiTenancy.Hosting;

builder.Services.ReplaceTenantStorageRoutingProvider<TenantStorageRoutingProvider>();
```
