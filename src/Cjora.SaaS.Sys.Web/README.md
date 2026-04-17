# Cjora.SaaS.Sys.Web

## 模块职责

IAM 的 HTTP 层：Controllers、DTO 契约、JWT 鉴权、功能权限（PermCode）校验。  
该层仅处理「HTTP 进出」，不包含业务逻辑，所有操作委托给 `Cjora.SaaS.Sys` 的 Application Service。

---

## 架构边界

| 负责 | 不负责 |
|------|--------|
| API 控制器（用户、角色、部门、权限码、字典、租户、`/me`） | 业务规则与数据查询（由 Sys 负责） |
| JWT 签发与验证（`JwtTokenService`、`JwtSettings`） | Token 刷新策略（当前为无状态单次有效） |
| `[AuthorizePermCode]` 功能权限特性与 Policy 解析 | 行级数据权限（由 Core/Sys 的 QueryFilter 负责） |
| 统一响应结构（`ApiResult<T>`） | 全局异常捕获（由 Logging 的 `RequestLoggingMiddleware` 负责） |
| 将 Controller 程序集注入宿主（`AddCjoraSysWebControllers`） | CORS、Swagger 配置（由宿主 Program.cs 负责） |

---

## 依赖关系

```
Cjora.SaaS.Sys.Web
  → 依赖 Cjora.SaaS.Sys（Application Service 接口）
  → 依赖 Cjora.SaaS.Core（ICurrentUser、ITenantProvider 等）
  ← 被 Cjora.SaaS.Sys.Api / Host.Sample 通过 AddCjoraSysWebControllers() 接入
```

---

## 核心能力

### 1. 控制器列表

| 控制器 | 路由 | 说明 |
|--------|------|------|
| `AuthController` | `POST /api/sys/auth/login` | 用户登录，返回 JWT Token |
| `MeController` | `GET /api/sys/me` | 当前用户信息与权限码 |
| `UsersController` | `/api/sys/users` | 用户 CRUD |
| `RolesController` | `/api/sys/roles` | 角色管理 |
| `DepartmentsController` | `/api/sys/departments` | 部门树管理 |
| `PermissionsController` | `/api/sys/permissions` | 权限码定义管理 |
| `DictTypesController` | `/api/sys/dict-types` | 字典类型管理 |
| `TenantsController` | `/api/sys/tenants` | 租户管理（SuperAdmin） |

> **路由约定**：Sys 服务下所有控制器统一以 `/api/sys/` 为前缀，便于未来接入网关按 `/api/sys/**` 做前缀路由分流（其他服务如 `/api/crm/**`、`/api/pm/**` 同理）。

### 2. 功能权限（PermCode）

```csharp
// Controller/Action 上声明：
[AuthorizePermCode("sys:users:edit")]
public async Task<ApiResult> UpdateUser(...) { }
```

工作原理：
1. `[AuthorizePermCode("sys:users:edit")]` 生成策略名 `"PermCode:sys:users:edit"`
2. `PermCodePolicyProvider` 将策略名解析为含 `PermCodeRequirement` 的 `AuthorizationPolicy`
3. `PermCodeAuthorizationHandler` 从 JWT Claims 中读取用户有效权限码，判断是否命中

### 3. JWT 签发（`JwtTokenService`）

- 签发时写入：`user_id`、`tenant_id`、`is_super_admin`、`data_scope`、`perm_codes`（权限码列表）
- 配置节：`Jwt:Issuer` / `Jwt:Audience` / `Jwt:Secret` / `Jwt:ExpiresHours`

---

## 使用方式

```csharp
// Program.cs
builder.Services.AddControllers().AddCjoraSysWebControllers();

// 注意：JWT 鉴权、PermCode DI、CORS 仍需宿主自行配置（见 Sys.Api/Program.cs）
builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermCodePolicyProvider>();
builder.Services.AddScoped<IAuthorizationHandler, PermCodeAuthorizationHandler>();
builder.Services.AddScoped<JwtTokenService>();
```

---

## 示例

```csharp
// 自定义控制器复用 PermCode 体系：
[ApiController]
[Route("api/crm/customers")]
public class CrmCustomersController : ControllerBase
{
    [HttpGet]
    [AuthorizePermCode("crm:customers:list")]
    public async Task<ApiResult<List<CustomerDto>>> GetList() { ... }
}
```

---

## 常见错误用法

| 错误 | 后果 | 正确做法 |
|------|------|----------|
| 在 Controller 中直接操作 `ISqlSugarClient` | 绕过 Application Service 的事务/日志/缓存 | 注入 Application Service 接口 |
| 不调用 `AddCjoraSysWebControllers()` 直接扫描 Controller | 宿主程序集中找不到 Controller 类 | 必须调用此方法注册程序集部件 |
| `[AuthorizePermCode]` 的权限码与 `sys_permission` 表中定义不一致 | 运行时永远鉴权失败（Handler 找不到匹配码） | 权限码字符串须与数据库 `Code` 字段完全一致 |
| JWT `Secret` 短于 32 字符 | `SymmetricSecurityKey` 不满足 HMAC-SHA256 最小密钥长度要求，启动时抛异常 | 生产环境使用随机生成的 64 字符以上密钥 |
| 生产环境暴露 `/api/sys/tenants` 而无 SuperAdmin 限制 | 任意已登录用户可管理租户 | 确保 `TenantsController` 加了 `[AuthorizePermCode("sys:tenants:manage")]` 且仅 SuperAdmin 拥有该权限 |
