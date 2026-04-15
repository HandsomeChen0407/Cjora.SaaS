# Cjora.SaaS.Core — 生产级工程说明（.NET 8）

本库为 **Cjora.SaaS** 提供 Core 能力层：多租户强隔离、SqlSugar 集成、数据权限上下文/Scope、DataProtection、仓储抽象。Sys 作为业务实现层提供数据权限表与 EXISTS/JOIN 过滤实现，并提供启动守门器。

---

## 一、核心能力（当前真实行为）

### 1) 多租户（强隔离 + Fail-Fast）

- **租户 QueryFilter**：所有实现 `ITenantScopedEntity` 的实体自动追加 `TenantId == tenantProvider.GetTenantId()`。
- **无 HttpContext 禁止隐式租户**：`HttpTenantProvider` 在无 `HttpContext` 且无 `ITenantContextSetter` 显式租户时直接抛 `InvalidOperationException`（除非显式配置允许回退）。
- **后台任务租户上下文**：通过 `ITenantContextSetter.Use(tenantId)` 或 `IBackgroundTenantExecutor.RunAsync(tenantId, ...)` 注入租户。

### 2) 数据权限（EXISTS/JOIN，无 JWT 权限集合）

- **Core 不包含业务权限表**：部门/项目/客户等数据域由业务层（Sys）实现 `ISqlSugarDataPermissionFilterProvider` 注入过滤器。
- **Department scope 安全门禁**：当 `IDataPermissionContext.Scope == Department` 且未注册任何 `ISqlSugarDataPermissionFilterProvider`，构建客户端时直接抛异常（Fail-Fast）。
- **Disable() 动态生效**：`IDataPermissionScope.Disable()` 通过 `IDataPermissionContext.IsDisabled` 在过滤表达式内短路为恒真，从 SQL 语义上取消行级限制（租户过滤仍生效）。

### 3) SqlSugar 集成策略（强约束）

- `ISqlSugarClient` 为 **Scoped** 工厂创建。
- **禁止并发使用同一个 `ISqlSugarClient`**：并发查询（如 `Task.WhenAll`）会触发 guard 并抛异常。
- **危险清过滤器 API 已封禁**：公开入口不可用（会抛异常或不存在 public 方法），框架内部入口仅允许超级管理员。

### 4) DataProtection（真实实现边界）

- AES 密文格式：`CJ1:` + Base64(随机IV||密文)；仅带 `CJ1:` 前缀才解密。
- Hash：`Trim + HashSalt + SHA-256` 小写十六进制；等值查询必须使用同一 `IHashService.ComputeHash`。

---

## 二、Core / Sys 分层边界（强约束）

- **Core（能力层）**：只提供接口/扩展点与通用机制，不包含任何业务权限表。
- **Sys（业务层）**：定义 `sys_user_data_scope` / `sys_department_closure` 等权限表，提供 EXISTS/JOIN 过滤实现与启动守门器 `ValidateSaaSOrThrow`。
- **跨层禁令**：Core 不引用 Sys 实体；Sys 不把权限集合写入 JWT。

---

## 三、企业级数据权限模型（无 IN 版，当前实现）

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

## 四、正确使用方式（必须按此执行）

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

### 2) 后台任务（必须显式传 tenant）

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

---

## 五、禁止行为（硬黑名单）

- ❌ 缓存/单例化 `ISqlSugarClient`
- ❌ 并发使用同一个 `ISqlSugarClient`（会直接抛异常）
- ❌ 依赖 JWT 携带权限集合实现数据权限
- ❌ 调用任何无鉴权上下文的“清过滤器”方法（会直接抛异常或不存在 public 入口）
