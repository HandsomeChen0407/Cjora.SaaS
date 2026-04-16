# Cjora.SaaS.Sys.Api

## 职责

IAM HTTP 宿主：JWT、`PermCode` 接口授权、`Sys` + Core；可选 CRM/PM 模块开关见 `appsettings` `Modules:*`。

## 授权

- 全局 `FallbackPolicy`：已认证用户。
- `[AllowAnonymous]`：仅 `POST /api/auth/login`。
- 其余 Action：`[AuthorizePermCode("模块:资源:动作")]` → `PermCodePolicyProvider` → `PermCodeRequirement` → `PermCodeAuthorizationHandler`（`IsSuperAdmin` 直接通过）。

## bypass_row_filters

- 解析：`Cjora.SaaS.Sys` 中 `SysSecuredDataPermissionResolver`（替换默认 `IDataPermissionResolver`）。
- 规则：JWT 声明 `bypass_row_filters=1` **且** `ICurrentUser.IsSuperAdmin`（声明 `is_super_admin=1`）时生效；否则忽略并记 Warning。
- `is_super_admin`：`JwtTokenService` 在用户任一角色的 `IsSystem==true` 或 `Code==super_admin`（忽略大小写）时写入。

## 上线前

须在 `sys_permission` 中配置下表 **PermCode** 并与角色绑定；**至少**为登录用户角色授予 `sys:me:read`，否则 `GET /api/me` 403。

## 接口 → PermCode（高风险标 ※）

| 方法 | 路径 | PermCode | 风险 |
|------|------|----------|------|
| POST | /api/auth/login | （匿名） | |
| GET | /api/me | sys:me:read | |
| GET | /api/users | sys:user:list | |
| GET | /api/users/{id} | sys:user:detail | |
| POST | /api/users | sys:user:create | ※ |
| PUT | /api/users/{id} | sys:user:update | ※ |
| DELETE | /api/users/{id} | sys:user:delete | ※ |
| GET | /api/users/{userId}/roles | sys:user:role:list | |
| POST | /api/users/{userId}/roles | sys:user:role:assign | ※ |
| DELETE | /api/users/{userId}/roles/{roleId} | sys:user:role:remove | ※ |
| GET | /api/roles | sys:role:list | |
| GET | /api/roles/{id} | sys:role:detail | |
| POST | /api/roles | sys:role:create | ※ |
| PUT | /api/roles/{id} | sys:role:update | ※ |
| DELETE | /api/roles/{id} | sys:role:delete | ※ |
| GET | /api/roles/{roleId}/permissions | sys:role:permission:list | ※ |
| GET | /api/departments | sys:department:list | |
| GET | /api/departments/tree | sys:department:tree | |
| GET | /api/departments/{id} | sys:department:detail | |
| POST | /api/departments | sys:department:create | ※ |
| PUT | /api/departments/{id} | sys:department:update | ※ |
| DELETE | /api/departments/{id} | sys:department:delete | ※ |
| GET | /api/tenants | sys:tenant:list | |
| GET | /api/tenants/{tenantCode} | sys:tenant:detail | |
| POST | /api/tenants | sys:tenant:create | ※ |
| PUT | /api/tenants/{tenantCode} | sys:tenant:update | ※ |
| GET | /api/permissions | sys:permission:list | |
| GET | /api/permissions/tree | sys:permission:tree | |
| GET | /api/permissions/{id} | sys:permission:detail | |
| POST | /api/permissions | sys:permission:create | ※ |
| PUT | /api/permissions/{id} | sys:permission:update | ※ |
| DELETE | /api/permissions/{id} | sys:permission:delete | ※ |
| GET | /api/dict-types | sys:dict-type:list | |
| GET | /api/dict-types/{id} | sys:dict-type:detail | |
| POST | /api/dict-types | sys:dict-type:create | ※ |
| PUT | /api/dict-types/{id} | sys:dict-type:update | ※ |
| DELETE | /api/dict-types/{id} | sys:dict-type:delete | ※ |
| GET | /api/dict-types/{typeId}/items | sys:dict-item:list | |
| GET | /api/dict-types/{typeId}/items/{itemId} | sys:dict-item:detail | |
| POST | /api/dict-types/{typeId}/items | sys:dict-item:create | ※ |
| PUT | /api/dict-types/{typeId}/items/{itemId} | sys:dict-item:update | ※ |
| DELETE | /api/dict-types/{typeId}/items/{itemId} | sys:dict-item:delete | ※ |

## 残留风险

- 数据库未同步 PermCode 时除 SuperAdmin 外全部 403。
- `JwtTokenService` 的 `data_scope` 字符串与 `DataScopeKind` 解析一致性未在本轮修改（既有行为）。
