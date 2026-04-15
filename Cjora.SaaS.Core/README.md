# Cjora.SaaS.Core

面向 **.NET 8** 的可复用 **SaaS Core 基础框架**，提供：

- **MultiTenancy**：租户识别（Header/JWT/子域）、请求级缓存、存储路由抽象（共享库/独立库/分片）；中间件带解析来源与 JWT 顺序诊断日志
- **SqlSugar**：按租户创建 `ISqlSugarClient`、全局 `QueryFilter`（租户 Id **运行时解析** + 数据权限）、写入 AOP（租户/创建人 + 可选字段加密）
- **DataPermission**：`IDataPermissionResolver` → `DataPermissionResult` → `IDataPermissionContext`（行级 All/Tenant/Department/Self，可替换解析）
- **DataProtection**（可选，默认全关）：`[Encrypted]` / `[HashField]`、AES 字段加密、SHA-256 查询哈希、`IDataMasker` 脱敏（API 层显式调用）
- **Repository**：租户仓储抽象 + SqlSugar 实现（分页模型、CRUD、按租户删除保护；复杂查询请直接用 `ISqlSugarClient`）
- **Auth**：`ICurrentUser`（声明读取与强类型解析）

本库的目标是**稳定抽象**与**可替换实现**：上层业务依赖 `Abstractions`，基础设施细节封装在 `Providers/Resolvers`，宿主通过 `Hosting` 一键注册。

---

## 企业级架构升级说明

### 1. QueryFilter 租户捕获修复

此前租户全局过滤器在注册时读取一次 `tenantId` 并写入表达式常量，若 `ISqlSugarClient` 被错误地跨作用域复用（例如长生命周期的后台任务误注入 Scoped 客户端），理论上存在与「当时捕获租户」不一致的风险。

**现状**：`SqlSugarSaaSClientBuilder` 中租户条件改为 `entity.TenantId == tenantProvider.GetTenantId()`，在 SqlSugar 生成/执行 SQL 时从当前 Scoped 的 `ITenantProvider` **重新取值**；`CreatorUserId` 条件使用 `dataPermission.CurrentUserId` 属性访问，与请求内上下文一致。

### 2. IDataPermissionResolver 解耦

- **`IDataPermissionResolver`**：负责把 `ICurrentUser` / Claim（未来可扩展 DB、缓存、RBAC）解析为不可变 **`DataPermissionResult`**。
- **`IDataPermissionContext`**：公共 API **保持不变**，默认实现 `DefaultDataPermissionContext` 内部委托 Resolver 并惰性缓存快照。
- **替换方式**：`services.Replace(ServiceDescriptor.Scoped<IDataPermissionResolver, YourResolver>())`（在 `AddCjoraSqlSugarSaaS` 之后）。

### 3. TenantMiddleware 与管道顺序

- 解析成功后会打 **Information**：`TenantId`、`Source`（Header / JwtClaim / Subdomain / DefaultFallback）、是否默认回退。
- 当 **`EnableJwtClaimTenantResolution = true` 且当前用户未认证** 时打 **Warning**，提示 JWT 分支不可用；若租户**必须**来自 JWT，务必：

```csharp
app.UseAuthentication();
app.UseTenantResolution(); // 其后
```

匿名接口流量会触发该 Warning，属预期；可关闭 JWT 租户解析或缩小中间件适用范围。

---

## DataProtection 使用指南

### 启用

在 `AddCjoraSaaSWithSqlSugar` 中传入 `configureDataProtection`，或单独 `AddCjoraDataProtection`：

```csharp
builder.Services.AddCjoraSaaSWithSqlSugar(
    configureTenant: o => { /* ... */ },
    configureSqlSugar: o => { /* ... */ },
    configureDataProtection: o =>
    {
        o.EnableEncryption = true;
        o.EnableHash = true;
        o.EnableAutoDecryption = true; // 按需：查询后自动解密实体字段
        o.AesKeyBase64 = "<32-byte key base64>";
        o.AesIvBase64 = "<16-byte iv base64>";
    });
```

### 实体标记

```csharp
using Cjora.SaaS.Core.DataProtection.Attributes;

public sealed class AppUser : ITenantScopedEntity
{
    public string TenantId { get; set; } = "";

    [Encrypted]
    [HashField(nameof(PhoneHash))]
    public string Phone { get; set; } = "";

    public string PhoneHash { get; set; } = "";
}
```

### 查询（必须用 Hash 列）

加密列 **不可** 用于 `Contains`/模糊查询；等值查询使用哈希列：

```csharp
public Task<AppUser?> FindByPhoneAsync(ISqlSugarClient db, IHashService hash, string phone, CancellationToken ct)
{
    var h = hash.ComputeHash(phone);
    return db.Queryable<AppUser>().Where(u => u.PhoneHash == h).FirstAsync(ct);
}
```

### 脱敏（API 层）

```csharp
public string ToMaskedDto(IDataMasker masker, AppUser u) => masker.MaskPhone(u.Phone);
```

> `IDataMasker` 已默认注册；**不会**在仓储层自动调用。

### 注意事项（重要）

1. **加密字段不可用于模糊查询**，也无法在 SQL 侧排序明文；需要展示序请使用独立排序键。
2. **等值查询必须走 Hash 列**（`IHashService.ComputeHash` 与写入时规范化规则一致：当前为 `Trim` + UTF-8 SHA-256 小写十六进制）。
3. **密钥与 IV** 与数据库备份同等敏感；建议使用密钥管理服务，并规划轮换与历史密文兼容策略。
4. 固定 IV（当前 `AesDataEncryptor` 实现）下相同明文密文相同；更高安全模型可自定义 `IDataEncryptor`（例如随机 IV 前缀写入密文负载）。

---

## 示例：用户手机号加密全流程

```csharp
// 1) 实体见上文 AppUser（Phone + PhoneHash）

// 2) 写入：Insert / Update 时 AOP 自动 Encrypt(Phone) 且 ComputeHash(Phone) -> PhoneHash（开关开启时）

// 3) 查询：
var user = await db.Queryable<AppUser>()
    .Where(u => u.PhoneHash == hashService.ComputeHash(inputPhone))
    .FirstAsync(ct);

// 4) 返回 API 前脱敏（若启用了自动解密，实体 Phone 已为明文；否则先 Decrypt 再 Mask）
var display = masker.MaskPhone(user.Phone);
```

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
├─ DataProtection/
│  ├─ Abstractions/ Attributes/ Providers/ Models/ Internals/ Hosting/
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
