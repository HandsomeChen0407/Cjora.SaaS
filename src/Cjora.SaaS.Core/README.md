# Cjora.SaaS.Core

## 模块职责

Core 是**规则层**，只做两件事：

1. 定义契约（接口、枚举、抽象类）
2. 将这些契约组装为 SqlSugar 全局 QueryFilter 管道

Core **不包含**：业务表实体、IAM/CRM/PM 业务逻辑、缓存实现、日志框架、Redis 等任何第三方基础设施。

---

## 架构边界

| 负责 | 不负责 |
|------|--------|
| 多租户识别与存储路由契约 | 租户数据在哪个库（由宿主配置） |
| 软删除 / 租户 / 数据权限 QueryFilter 注册 | 行级 SQL 的具体形态（EXISTS / JOIN） |
| `IDataPermissionContext` 的消费（过滤器侧） | `IDataPermissionContext` 的解析（由 Sys 实现） |
| `IRepository<T>` 抽象 | 仓储的 ORM 实现 |
| SqlSugar 字段加密 / Hash AOP | 加密算法选型 |

---

## 依赖关系

```
Core
  ← 被 Sys 依赖
  ← 被 Caching（无直接依赖，Caching 独立）
  ← 被 Crm / Pm 依赖（Provider 实现引用 Core 接口）
  → 依赖 SqlSugarCore（ORM）
  → 依赖 Microsoft.AspNetCore.App（HTTP 上下文、ILogger 等）
```

Core 不引用 Sys、Caching、Logging、Crm、Pm 中的任何程序集。

---

## 核心能力

### 1. 多租户（`MultiTenancy/`）

- `ITenantProvider`：当前请求的租户 ID 来源；HTTP 场景下从 `X-Tenant-Id` Header 读取
- `ITenantStorageRoutingProvider`：租户 → 数据库连接串映射（默认使用配置文件；Sys 替换为查目录库的实现）
- `ITenantContextSetter` / `IBackgroundTenantExecutor`：后台任务无 HTTP 上下文时手动绑定租户

### 2. 数据权限（`DataPermission/`）

- `DataScopeKind` 枚举（`All / Tenant / Department / Self / Project / Customer`）
- `IDataPermissionContext`：当前请求已确定的数据权限视图（Scope、BypassRowLevelFilters、CurrentUserId、可访问部门列表）
- `IDataPermissionResolver`：如何解析出 `IDataPermissionContext`（由宿主实现，默认从 JWT Claims 读取）
- `ISqlSugarDataPermissionFilterProvider`：可插拔的行级过滤器扩展点；业务模块（Sys/Crm/Pm）各自注册

### 3. SqlSugar 管道（`SqlSugar/`）

**QueryFilter 叠加顺序（AND，同一 SELECT 上生效）：**

```
1. ISoftDeleteEntity   → WHERE !is_deleted
2. ITenantScopedEntity → WHERE tenant_id = @current
3. 各 ISqlSugarDataPermissionFilterProvider.Apply() → 业务 EXISTS/子查询
4. ICreatorOwnedEntity → WHERE creator_user_id = @me（仅 DataScopeKind.Self）
```

- `ISqlSugarClientFactory`：并发场景（Task.WhenAll）下创建相互隔离的 Client 实例
- `ISqlSugarClientGuard`：检测同一 Client 被并发复用时抛出（AsyncLocal 实现）
- SqlSugar AOP：慢 SQL 警告（可配置阈值）、SQL 错误 `LogError`、字段加密/Hash 写入

### 4. 仓储（`Repository/`）

- `IRepository<TEntity>`：CRUD + 分页，自动带租户条件，删除转逻辑删除
- 不覆盖：多表联查、聚合、原生 SQL——这些直接用 `ISqlSugarClient`

### 5. 数据保护（`DataProtection/`）

- `IDataEncryptor`：AES-CBC 字段加解密（`[EncryptField]` 属性驱动 AOP）
- `IHashService`：SHA-256 摘要，用于等值查询列（`[HashField]` 属性）
- `IDataMasker`：展示侧脱敏（手机号、身份证等）

---

## 使用方式

```csharp
// Program.cs 最小注册（不含 SqlSugar）
builder.Services.AddSaaSCore();

// 含 SqlSugar 的标准注册（推荐）
builder.Services.AddCjoraSaaSWithSqlSugar(
    configureTenant: o => { /* 租户选项 */ },
    configureSqlSugar: o =>
    {
        o.DbType = DbType.MySql;
        o.MasterConnectionString = "...";
        o.SlowSqlWarningMilliseconds = 200;
    });
```

宿主还必须：

1. 注册 `IDataPermissionContext` / `IDataPermissionResolver`（由 `AddCjoraSaaSSys()` 提供）
2. 注册覆盖当前用户 `DataScopeKind` 的 `ISqlSugarDataPermissionFilterProvider`（Sys/Crm/Pm 各自提供）
3. 在管道中调用 `UseCjoraSaaSSysTenantResolution()`（设置 `ITenantProvider` 上下文）

---

## 示例

```csharp
// 业务服务中，直接注入 IRepository，不写 TenantId 条件：
var users = await _userRepo.GetListAsync(u => u.IsActive, ct);

// 并发查询使用 ISqlSugarClientFactory：
var client = _factory.Create();
await using (client as IAsyncDisposable ?? Disposable.Empty)
{
    var list = await client.Queryable<SysUser>().ToListAsync();
}

// 临时关闭行级过滤器（受控后台场景）：
using (_dataPermissionScope.Disable())
{
    var all = await _repo.GetListAsync(ct);
}
```

---

## 常见错误用法

| 错误 | 后果 | 正确做法 |
|------|------|----------|
| 在 Core 中引用 Sys/Crm/Pm | 循环依赖，架构崩溃 | Core 只提供接口，由宿主注册实现 |
| 多个并发 Task 共用同一 `ISqlSugarClient` | `SqlSugarClientGuard` 抛异常 | 用 `ISqlSugarClientFactory.Create()` 各自独立 |
| JWT 颁发了 `DataScopeKind.Department` 但未注册 Sys（含 `SysSqlSugarDataPermissionFilterProvider`） | 启动时 Fail-Fast，无法创建 Client | 按 DataScope 注册足够的 Provider |
| 在 `IRepository` 的 predicate 里手写 `TenantId == xxx` | 仓储已自动加，条件重复（无害但多余且可能干扰可读性） | 只写业务条件 |
| 在业务代码中直接 `new SqlSugarClient()` | 绕过所有全局 Filter 和 AOP | 通过 DI 注入 `ISqlSugarClient` |
| 对非 SuperAdmin 用户发放 `bypass_row_filters` 声明 | 行级隔离失效，数据越权 | Sys 的 `SysSecuredDataPermissionResolver` 会拒绝并记录审计日志 |
