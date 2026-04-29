# Cjora.SaaS.Sys

## 模块职责

IAM（身份与访问管理）业务模块。  
实现 Core 定义的所有可插拔接口（数据权限解析、租户存储路由、Department 行级过滤器），  
并提供用户、角色、部门、权限码、字典等系统管理的完整业务逻辑。

---

## 架构边界

| 负责 | 不负责 |
|------|--------|
| 实现 `IDataPermissionResolver`（含缓存装饰器） | 数据权限的**框架合法性校验**（Core 负责） |
| 实现 `IDataScopeIdResolver`（Department、Agent） | CRM/PM 的 Provider（各业务模块自己注册） |
| 实现 `ITenantStorageRoutingProvider`（查目录库） | Core 的 QueryFilter 编排逻辑 |
| 用户、角色、部门、权限码、字典 CRUD | 任何 CRM/PM 业务实体 |
| 缓存权限结果（`CachingDataPermissionResolver`） | 缓存的技术实现（由 Caching 提供） |
| 注册 `DataPermissionRequestLogEnricher` | HTTP 日志的通用字段（由 Logging 负责） |
| 单请求超时（30s `RequestTimeouts`） | 全局熔断、限流 |

---

## 依赖关系

```
Cjora.SaaS.Sys
  → 依赖 Cjora.SaaS.Core（核心规则与抽象）
  → 依赖 Cjora.SaaS.Caching（ICachingService / ILockService）
  → 依赖 Cjora.SaaS.Logging（IRequestLogEnricher）
  ← 被 Cjora.SaaS.Sys.Web 依赖（Controller / DTO 层）
  ← 被 Cjora.SaaS.Sys.Api / Host.Sample 依赖（DI 注册入口）
```

---

## 核心能力

### 1. 数据权限解析链

```
IDataPermissionResolver（DI 注入）
    └─ CachingDataPermissionResolver（缓存装饰器，缓存 TTL 5~10 min）
           └─ SysSecuredDataPermissionResolver（真正解析，并收敛 bypass）
```

- `SysSecuredDataPermissionResolver`：从 JWT Claims 解析 `DataScopeKind` 与 `bypass_row_filters`；  
  **只有 `ICurrentUser.IsSuperAdmin = true` 时才允许 bypass，否则日志告警并忽略该 Claim**
- `CachingDataPermissionResolver`：`ICachingService` + `ILockService` 防止并发击穿；版本号失效机制实现手动清缓存

### 2. 行级数据域解析器（`IDataScopeIdResolver`）

- **`DepartmentDataScopeIdResolver`**：处理 `DataScopeKind.Department`，基于 `sys_user_data_scope`（ScopeType=Department）与部门闭包展开可访问部门 Id。
- **`AgentDataScopeIdResolver`**：处理 `DataScopeKind.Agent`；从 `sys_user_data_scope`（ScopeType=Agent）读取**根**代理商 Id，再按 `sys_agent.parent_id` 树形展开为「根 + 全部后代」的可访问 Id 集合。

二者均注册为 Scoped，与 SqlSugar Client 同生命周期。

### 3. 权限码解析（`IEffectivePermissionResolver`）

- `EffectivePermissionResolver`：从 DB 读取角色权限码，展开完整有效 PermCode 集合
- `CachingEffectivePermissionResolver`：同样有版本缓存装饰

### 4. 部门闭包（`ISysDepartmentExpansionService`）

- 将部门 ID 展开为含所有子部门的 ID 集合（使用 `sys_department_closure` 表）
- 带缓存，版本号失效

### 5. 租户存储路由（`SysTenantTableStorageRoutingProvider`）

- 替换 Core 默认的静态配置路由
- 从 `sys_tenant` 目录表动态查询租户连接串

### 6. 缓存版本控制（`SysSecurityCacheVersionStore`）

- 维护 `saas:sys:ver:*` 系列 Key
- 权限或部门变更时调用对应 invalidate 方法，触发分布式失效

---

## 使用方式

```csharp
// 在 Program.cs 中，AddCjoraSaaSWithSqlSugar 之后调用：
builder.Services.AddCjoraSaaSSys();
```

`AddCjoraSaaSSys()` 内部自动完成：
- 替换 `IDataPermissionResolver` 为带缓存的实现
- 替换 `ITenantStorageRoutingProvider` 为目录表查询实现
- 注册 `DepartmentDataScopeIdResolver`、`AgentDataScopeIdResolver`
- 注册 `DataPermissionRequestLogEnricher`
- 注册 30s 请求超时策略

---

## 示例

```csharp
// 应用服务中查询当前租户用户列表（自动带租户+数据权限过滤）：
var users = await _userRepo.GetListAsync(u => u.IsActive, ct);

// 手动失效用户权限缓存（权限变更后调用）：
await _cacheControl.InvalidatePermissionsAsync(tenantId, userId);

// 获取用户有效权限码：
var codes = await _effectivePermissionResolver.ResolveAsync(userId, tenantId, ct);
```

---

## 常见错误用法

| 错误 | 后果 | 正确做法 |
|------|------|----------|
| 在 Sys 中实现 CRM/PM 的 DataPermission Provider | 架构越界，Sys 不应知道 CRM/PM 的业务实体 | CRM/PM 各自实现 `IDataScopeIdResolver` |
| 绕过 `CachingDataPermissionResolver` 直接注入 `SysSecuredDataPermissionResolver` | 每次请求都查 DB，缺少缓存保护 | 通过 `IDataPermissionResolver` 接口注入（DI 已注册为带缓存的实现） |
| 权限变更后不调用缓存失效 | 用户看到旧权限，最长 5~10 分钟才自动过期 | 变更后调用 `ISysSecurityCacheControl.InvalidatePermissionsAsync` |
| `DataScopeKind.Department` / `Agent` 但未注册 Sys（含对应 `IDataScopeIdResolver`） | 解析时得到空 Id 列表，`.WithDataPermission()` 可能返回零行 | 必须调用 `AddCjoraSaaSSys()`；代理商主数据需先有 `sys_agent` 行 |
| 在 Sys 中直接引用 Caching 的实现类（如 `RedisCacheService`） | 绑定具体实现，无法切换 Memory/Redis | 只注入 `ICachingService` 接口 |
