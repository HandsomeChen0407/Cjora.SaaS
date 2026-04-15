# Cjora.SaaS.Core — 工程说明（.NET 8）

可复用 SaaS 基础库：**多租户**、**SqlSugar**、**数据权限**、**DataProtection**、**仓储**、**认证抽象**。

---

## 一、架构说明

### 1. 多租户

- **`ITenantIdentifierResolver` + `TenantMiddleware`**：把解析到的租户 Id 写入 `HttpContext.Items`。
- **`ITenantProvider`**（默认 `HttpTenantProvider`）：读缓存项；无缓存时同步再走一遍解析链。
- **全局租户 `QueryFilter`**：`entity.TenantId == tenantProvider.GetTenantId()`，在 **生成 SQL 时** 再次调用 `GetTenantId()`，**不是** Build 时把租户 Id 固化成常量。
- **`ITenantStorageRoutingProvider`**：决定共享库或独立连接串；`SqlSugarTenantClientFactory` 在创建 Scoped `ISqlSugarClient` 时解析路由。

### 2. 数据权限

- **`IDataPermissionResolver.ResolveAsync`** → **`DataPermissionResult`**（懒加载，Scoped 内至多一次）。
- **`IDataPermissionContext`**：供 `QueryFilter` 表达式直接读属性。
- **行级过滤**（本人 / 业务数据域）：过滤表达式必须在运行时读取 `IsDisabled`、`BypassRowLevelFilters`、`Scope`、`CurrentUserId`，确保 **`IDataPermissionScope.Disable()` 动态生效**（`IsDisabled` 来自 `DataPermissionScopeState` 深度计数）。
- **Core / Sys 边界**：Core 仅提供可插拔扩展点 `ISqlSugarDataPermissionFilterProvider`；Sys 作为业务实现层提供“部门/项目/客户”等数据域的 EXISTS/JOIN 过滤（无 IN）。

---

## 企业级数据权限模型（无 IN 版）

### 为什么不用 IN

- **Token 膨胀**：把部门/项目集合塞进 JWT 会导致体积过大、传播路径长、变更不实时。
- **SQL 不稳定**：`IN (@p1,@p2,...)` 参数随集合大小变化，计划缓存命中差，且存在长度/参数上限。

### EXISTS/JOIN 方案（推荐）

使用「授权关系表 + 维度闭包表」在 SQL 侧做存在性判断，SQL 文本稳定，权限变更实时生效。

- **Sys 表（业务实现层）**
  - `sys_user_data_scope(tenant_id, user_id, scope_type, scope_id)`：用户拥有的数据域根授权
  - `sys_department_closure(ancestor_id, descendant_id)`：部门祖先-后代闭包

典型 SQL（部门域）：

```sql
WHERE EXISTS (
    SELECT 1
    FROM sys_user_data_scope p
    JOIN sys_department_closure c
        ON c.ancestor_id = p.scope_id
    WHERE
        p.tenant_id = entity.tenant_id
        AND p.user_id = @userId
        AND p.scope_type = 'Department'
        AND c.descendant_id = entity.department_id
)
```

### Core vs Sys 分层（关键）

- **Core（纯能力层）**
  - 提供：`IDataPermissionContext`、`IDataPermissionScope`、Self 过滤、`ISqlSugarDataPermissionFilterProvider` 扩展点
  - 不包含：任何业务权限表、任何 SQL 业务语义
- **Sys（业务实现层）**
  - 定义：`sys_user_data_scope`、`sys_department_closure` 等业务表
  - 实现：`SysSqlSugarDataPermissionFilterProvider`（用 SqlSugar `Subqueryable().Any()` 生成 EXISTS/JOIN）

### 扩展 ScopeType（Department / Project / Customer / Custom）

Sys 在 `SysSqlSugarDataPermissionFilterProvider` 内按 `ScopeType` 分支追加过滤即可（推荐仍用 EXISTS/JOIN）。
Core 已提供标记接口：

- `IDepartmentScopedEntity`（已有）
- `IProjectScopedEntity`（新增）
- `ICustomerScopedEntity`（新增）

### 3. 加解密与哈希

- **写入**：`SqlSugarDataProtectionAop` 在 Insert/Update 时对 `[Encrypted]` 明文加密；新格式为 **`CJ1:` + Base64(随机 16 字节 IV ‖ 密文)**（随机 IV）。
- **读取**：`Decrypt` 仅当 `IsCiphertext`（`CJ1:` 前缀）为真才解密；否则原样返回，**不会**把任意字符串当密文解密。
- **`TryDecryptRandomIvPayload`**：仅捕获 **`CryptographicException`** 与 **`FormatException`**，其余异常向上抛出。
- **哈希**：`DefaultHashService` 为 `Trim(明文) + HashSalt` 后 UTF-8 字节 SHA-256 小写十六进制；与 AOP 写入一致，查询须用同一 `IHashService.ComputeHash`。

---

## 二、正确使用方式（必读）

### 1. Controller / 请求内（推荐）

依赖注入 **Scoped** 的 `ISqlSugarClient`、`IRepository<T>`、`IDataPermissionScope`，在同一请求作用域内使用：

```csharp
public sealed class OrdersController : ControllerBase
{
    private readonly ISqlSugarClient _db;
    private readonly IDataPermissionScope _dataPermissionScope;

    public OrdersController(ISqlSugarClient db, IDataPermissionScope dataPermissionScope)
    {
        _db = db;
        _dataPermissionScope = dataPermissionScope;
    }

    [HttpGet]
    public Task<List<OrderRow>> ListAsync(CancellationToken ct)
        => _db.Queryable<OrderRow>().ToListAsync(ct);

    [HttpGet("admin-export")]
    public async Task<List<OrderRow>> ExportAsync(CancellationToken ct)
    {
        using (_dataPermissionScope.Disable())
        {
            return await _db.Queryable<OrderRow>().ToListAsync(ct);
        }
    }
}
```

管道顺序：若租户来自 JWT，**必须先** `UseAuthentication()`，再 `UseTenantResolution()`（见下文「常见坑」）。

### 2. 后台任务（必须自建 Scope + 租户语义）

`HttpTenantProvider` 在 **`HttpContext == null`** 时返回 **`TenantOptions.DefaultTenantId`**。后台线程若直接解析根 `IServiceProvider` 并拿 `ISqlSugarClient`，会 **串租** 或读写错误库。

**正确做法**：每次任务执行使用 **`IServiceScopeFactory.CreateAsyncScope()`**（或 `CreateScope()`），在 Scope 内解析与 HTTP 请求相同的服务；并保证该 Scope 内 **`ITenantProvider` 能返回目标租户**（例如任务入口显式设置租户上下文、或使用不依赖 HttpContext 的 `ITenantProvider` 实现）。

```csharp
public sealed class MyWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;

    public MyWorker(IServiceScopeFactory scopeFactory) => _scopeFactory = scopeFactory;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ISqlSugarClient>();
        // 前提：该 Scope 内 ITenantProvider / ICurrentUser 已能表达「本任务要操作的租户与用户」
        await db.Queryable<SomeEntity>().ToListAsync(stoppingToken);
    }
}
```

若默认 `HttpTenantProvider` 无法满足后台租户，应注册 **任务感知的 `ITenantProvider`**（从队列消息、作业参数读取租户），而不是在任务里「裸用」默认租户。

---

## 三、错误示例 vs 正确示例

### ❌ 错误：缓存 `ISqlSugarClient`

```csharp
// 禁止：单例持有 Scoped 客户端 → 跨请求共享错误租户/错误权限上下文
services.AddSingleton<ISqlSugarClient>(sp => sp.GetRequiredService<ISqlSugarClient>());
```

### ✅ 正确：始终 Scoped

```csharp
// AddCjoraSqlSugarSaaS 已注册 Scoped ISqlSugarClient；业务只注入使用，不要单例缓存。
```

### ❌ 错误：在「另一个 Scope」里 `Disable()` 再查库

```csharp
IDataPermissionScope scopeA = /* scope A */;
ISqlSugarClient dbB = /* scope B 解析出来的客户端 */;
using (scopeA.Disable()) { await dbB.Queryable<X>().ToListAsync(); } // Disable 对 dbB 无效
```

### ✅ 正确：`Disable()` 与 `ISqlSugarClient` 同一 Scope

```csharp
// 同一请求或同一 CreateScope 内注入的 scope + db
using (_dataPermissionScope.Disable()) { await _db.Queryable<X>().ToListAsync(ct); }
```

### ❌ 错误：后台任务用根容器拿 Db、无租户

```csharp
var db = app.Services.GetRequiredService<ISqlSugarClient>(); // 无 Scope，且 HttpContext 为空 → 默认租户
```

### ✅ 正确：见上文 `CreateAsyncScope` + 可解析租户的用户实现。

---

## 四、常见坑

| 坑 | 说明 |
|----|------|
| **`Disable()` 曾「无效」的历史问题** | 旧实现若在 **Build 时**根据 `IsDisabled` 决定是否注册 `QueryFilter`，则客户端已创建后 `Disable()` 无效。**当前实现**行级条件始终在表达式内读 `IDataPermissionContext`，`Disable()` 动态生效。 |
| **不能缓存 `ISqlSugarClient`** | 工厂在 Build 时绑定当前 Scope 的 `ITenantProvider` / `IDataPermissionContext`；单例或静态缓存会导致跨请求 **租户与数据权限错乱**。 |
| **`ConfigureAwait(false)`** | `DefaultDataPermissionContext` 同步读快照、`SqlSugarTenantClientFactory` 同步等路由，内部已对 `Task` 使用 **`ConfigureAwait(false)`**；自定义 **`IDataPermissionResolver`**、**`ITenantStorageRoutingProvider`** 中若有 `await`，**也必须** `ConfigureAwait(false)`，否则在带同步上下文的宿主中可能 **死锁**。 |
| **JWT 租户与中间件顺序** | `EnableJwtClaimTenantResolution` 且租户必须来自令牌时，`UseTenantResolution` 须在 **`UseAuthentication()` 之后**。 |
| **目录库 Keyed Client** | Keyed `ISqlSugarClient` 同样挂载租户与行级过滤器；目录表若误实现 `IDepartmentScopedEntity` / `ICreatorOwnedEntity`，可能被业务权限误伤。 |
| **非法 `data_scope`** | 解析失败回退 `DataPermissionClaimOptions.DefaultScope`（默认 **`Tenant`**），行级上不追加部门/本人限制，面较大；生产应收紧颁发与默认值。 |

---

## 五、安全边界（AES / Hash）

| 项 | 边界 |
|----|------|
| **明文识别** | 仅 **`CJ1:`** 前缀视为可解密密文；无前缀字符串 **不解密**，直接当明文返回。 |
| **旧版密文** | 无 `CJ1:` 前缀的旧数据：`Decrypt` **不会**走随机 IV 分支；需兼容路径或数据迁移策略（见 `AesDataEncryptor` 中固定 IV 分支说明）。 |
| **`TryDecryptRandomIvPayload`** | 只吞 **密码学/格式** 异常；其它异常 **不吞**。 |
| **自动解密** | `EnableAutoDecryption` 在查询映射后对带前缀字段解密，有 CPU/反射成本；`DataExecuted` 中对 **`RuntimeBinderException`** 静默忽略，极端类型不匹配时可能 **不解密且无异常**。 |
| **Hash 查询** | 必须用 **`IHashService.ComputeHash`**，与写入相同规则（`Trim` + 可选 `HashSalt`）；**不可**对密文字段做 SQL 模糊查询。 |

---

## 六、注册与管道（摘要）

```csharp
using Cjora.SaaS.Core.Extensions;
using Cjora.SaaS.Core.MultiTenancy.Hosting;
using Cjora.SaaS.Core.Repository.Hosting;
using SqlSugar;

builder.Services.AddCjoraSaaSWithSqlSugar(
    configureTenant: o => { o.DefaultTenantId = "default"; },
    configureSqlSugar: o =>
    {
        o.DbType = DbType.Sqlite;
        o.MasterConnectionString = "Data Source=app.db";
    });

builder.Services.AddSqlSugarTenantRepository<YourEntity>();
```

```csharp
app.UseAuthentication();
app.UseTenantResolution();
```

DataProtection 可选：`configureDataProtection` 中设置 `EnableEncryption`、`AesKeyBase64`、`EnableHash`、`HashSalt`、`EnableAutoDecryption` 等。

---

## 七、模块与目录索引

| 模块 | 要点 |
|------|------|
| MultiTenancy | `ITenantProvider`、`ITenantIdentifierResolver`、`ITenantStorageRoutingProvider`、`TenantMiddleware` |
| DataPermission | `IDataPermissionContext`、`IDataPermissionResolver`、`IDataPermissionScope`、`DefaultDataPermissionResolver`（部门 Id 上限） |
| SqlSugar | `SqlSugarTenantClientFactory`、`SqlSugarSaaSClientBuilder`、`SqlSugarTenantQueryableExtensions`（清过滤器须上层鉴权） |
| DataProtection | `[Encrypted]`、`[HashField]`、`IDataEncryptor`、`IHashService`、`IDataMasker` |
| Repository | `IRepository<T>`、`SqlSugarRepository<T>` |

```text
Cjora.SaaS.Core/
├─ Hosting/  MultiTenancy/  Auth/  DataPermission/  DataProtection/  SqlSugar/  Repository/
```

替换解析器（在 `AddCjoraSqlSugarSaaS` 之后）：

```csharp
builder.Services.Replace(ServiceDescriptor.Scoped<IDataPermissionResolver, YourResolver>());
```

---

## 八、替换存储路由

```csharp
using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Cjora.SaaS.Core.MultiTenancy.Hosting;
using Cjora.SaaS.Core.MultiTenancy.Models;

builder.Services.ReplaceTenantStorageRoutingProvider<YourRoutingProvider>();
```

自定义 `ITenantStorageRoutingProvider` 中所有 `await` 须 **`ConfigureAwait(false)`**（与工厂内同步等待配合）。
