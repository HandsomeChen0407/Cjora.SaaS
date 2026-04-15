# Cjora.SaaS.Core — 生产级工程说明（.NET 8）

本库为 **Cjora.SaaS** 提供 Core 能力层：多租户强隔离、SqlSugar 集成、数据权限上下文/Scope、软删除全局过滤、DataProtection、仓储抽象。Sys 作为业务实现层提供数据权限表与 EXISTS/JOIN 过滤实现，并提供启动守门器。

---

## 一、核心能力（当前真实行为）

### 1) 多租户（强隔离 + Fail-Fast）

- **租户 QueryFilter**：所有实现 `ITenantScopedEntity` 的实体自动追加 `TenantId == tenantProvider.GetTenantId()`。
- **禁止默认租户 / 禁止静默回退**：`TenantMiddleware` / `HttpTenantProvider` 在解析不到租户时直接抛 `InvalidOperationException`（Fail-Fast）。
- **后台任务租户上下文**：通过 `ITenantContextSetter.Use(tenantId)` 或 `IBackgroundTenantExecutor.RunAsync(tenantId, ...)` 注入租户。

### 2) 软删除（全局 QueryFilter + 仓储自动拦截）

- **全局过滤器**：所有实现 `ISoftDeleteEntity` 的实体自动追加 `!IsDeleted`；查询侧无需手写 `!x.IsDeleted`。
- **仓储拦截**：`IRepository<TEntity>.DeleteAsync` 对实现 `ISoftDeleteEntity` 的实体自动转为 UPDATE（写入 `IsDeleted=true`、`DeletedAtUtc`、`DeleterUserId`），而非物理 DELETE。
- **管理场景**：需查询已删除行时，超级管理员可通过 `queryable.ClearSoftDeleteFilter(currentUser)` 在单次查询链上跳过。
- **Delete/Update 附加**：`SqlSugarSaaSOptions.EnableDeleteQueryFilter` / `EnableUpdateQueryFilter` 默认开启，SqlSugar 的 `Deleteable` / 表达式 `Updateable` 也会自动带上软删除 + 租户条件。

### 3) 数据权限（EXISTS/JOIN，无 JWT 权限集合）

- **Core 不包含业务权限表**：部门/项目/客户等数据域由业务层（Sys）实现 `ISqlSugarDataPermissionFilterProvider` 注入过滤器。
- **Department scope 安全门禁**：当 `IDataPermissionContext.Scope == Department` 且未注册任何 `ISqlSugarDataPermissionFilterProvider`，构建客户端时直接抛异常（Fail-Fast）。
- **Disable() 动态生效且受控**：`IDataPermissionScope.Disable()` 在过滤表达式内短路为恒真（租户过滤仍生效），并且 **仅允许超级管理员或后台任务使用**；HTTP 请求内非 SuperAdmin 调用将直接抛 `UnauthorizedAccessException`。

### 4) SqlSugar 集成策略（强约束）

- `ISqlSugarClient` 为 **Scoped** 工厂创建。
- **禁止并发使用同一个 `ISqlSugarClient`**：并发查询（如 `Task.WhenAll`）会触发 guard 并抛异常。
- **过滤器绕过在运行时做不到**：`QueryFilter` 访问在代理层被封锁，调用将直接抛 `UnauthorizedAccessException`。
- **并发安全工厂**：提供 `ISqlSugarClientFactory.Create()` 为并发场景创建隔离实例（每次创建独立 DI Scope，用完需 `Dispose()` 释放资源）。

### 5) DataProtection（真实实现边界）

- AES 密文格式：`CJ1:` + Base64(随机IV||密文)；仅带 `CJ1:` 前缀才解密。
- Hash：`Trim + Salt + SHA-256` 小写十六进制；Salt **必须来自配置**，且在进程启动后固定不变（运行时动态修改不生效）。等值查询必须使用同一 `IHashService.ComputeHash`。

---

## 二、全局 QueryFilter 叠加顺序

SqlSugar 客户端构建时注册的过滤器按以下顺序叠加（AND 关系）：

| 顺序 | 过滤器 | 接口 | 说明 |
|------|--------|------|------|
| 1 | 软删除 | `ISoftDeleteEntity` | `!IsDeleted` |
| 2 | 租户 | `ITenantScopedEntity` | `TenantId == current` |
| 3 | 部门域 | 业务注入 `ISqlSugarDataPermissionFilterProvider` | EXISTS/JOIN |
| 4 | 本人 | `ICreatorOwnedEntity` | `CreatorUserId == current` |

---

## 三、Core / Sys 分层边界（强约束）

- **Core（能力层）**：只提供接口/扩展点与通用机制，不包含任何业务权限表。
- **Sys（业务层）**：定义 `sys_user_data_scope` / `sys_department_closure` 等权限表，提供 EXISTS/JOIN 过滤实现与启动守门器 `ValidateSaaSOrThrow`。
- **跨层禁令**：Core 不引用 Sys 实体；Sys 不把权限集合写入 JWT。

---

## 四、企业级数据权限模型（无 IN 版，当前实现）

### 为什么不用 IN（当前系统行为）

- JWT 不携带部门/项目/客户集合（无 `dept_ids`）。
- 部门域过滤以 EXISTS/JOIN 形式生成（Subqueryable().Any())，不生成 `IN (...)`。

### EXISTS/JOIN SQL 形态（部门域）

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

---

## 五、正确使用方式（必须按此执行）

### 1) Controller / 请求内（Scoped）

```csharp
public sealed class OrdersController : ControllerBase
{
    private readonly ISqlSugarClient _db;
    private readonly IDataPermissionScope _scope;

    public OrdersController(ISqlSugarClient db, IDataPermissionScope scope)
    {
        _db = db;
        _scope = scope;
    }

    [HttpGet]
    public Task<List<Order>> ListAsync(CancellationToken ct)
        => _db.Queryable<Order>().ToListAsync(ct);
    // ↑ 自动带 !IsDeleted AND TenantId==current AND 数据权限条件

    [HttpGet("admin-export")]
    public Task<List<Order>> ExportAsync(CancellationToken ct)
    {
        using (_scope.Disable())
        {
            return _db.Queryable<Order>().ToListAsync(ct);
        }
    }
}
```

### 2) 仓储删除（自动软删除）

```csharp
// 对实现 ISoftDeleteEntity 的实体，自动转为 UPDATE 而非物理 DELETE：
await _repo.DeleteAsync(x => x.Id == id, ct);
// → UPDATE ... SET is_deleted=1, deleted_at_utc=@now, deleter_user_id=@uid WHERE ...
```

### 3) 查询已删除行（超级管理员）

```csharp
var deletedOrders = await _db.Queryable<Order>()
    .ClearSoftDeleteFilter(currentUser) // 仅 SuperAdmin 可调用
    .Where(x => x.IsDeleted)
    .ToListAsync(ct);
```

### 4) 后台任务（必须显式传 tenant）

```csharp
public sealed class MyWorker : BackgroundService
{
    private readonly IBackgroundTenantExecutor _exec;
    public MyWorker(IBackgroundTenantExecutor exec) => _exec = exec;

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
        => _exec.RunAsync("acme", async sp =>
        {
            var db = sp.GetRequiredService<ISqlSugarClient>();
            await db.Queryable<Order>().ToListAsync(stoppingToken);
        });
}
```

### 5) 并发查询（正确姿势）

同一 `ISqlSugarClient` 在同一异步流内禁止并发使用；并发场景必须用工厂创建隔离实例：

```csharp
await Task.WhenAll(
    _factory.Create().Queryable<A>().ToListAsync(),
    _factory.Create().Queryable<B>().ToListAsync()
);
```

---

## 六、禁止行为（硬黑名单）

- ❌ 缓存/单例化 `ISqlSugarClient`
- ❌ 并发使用同一个 `ISqlSugarClient`（会直接抛异常）
- ❌ 依赖 JWT 携带权限集合实现数据权限
- ❌ 调用任何无鉴权上下文的"清过滤器"方法（会直接抛异常或不存在 public 入口）
- ❌ 在查询中手写 `!x.IsDeleted`（由全局过滤器托管，重复写会导致双重条件）
