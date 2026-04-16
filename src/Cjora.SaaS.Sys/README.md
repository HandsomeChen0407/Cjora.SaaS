# Cjora.SaaS.Sys

## 职责

- IAM：用户、角色、部门、租户（业务侧）、字典、权限码与角色-权限  
- **部门域**行级过滤：`SysSqlSugarDataPermissionFilterProvider` → `HandledDataScopes = Department`  
- 数据权限表：`sys_user_data_scope`、`sys_department_closure` 等（EXISTS，非 JWT 列表）  
- 启动校验：`ValidateSaaSOrThrow`（由宿主调用）

**不包含**：CRM/PM 等业务实体；不引用 CRM/PM 类库。

## 依赖

- `Cjora.SaaS.Core` only

## 集成

```csharp
services.AddCjoraSaaSSys();
```

## 代码入口（查阅）

| 内容 | 路径 |
|------|------|
| 部门域 Provider | `Infrastructure/DataPermission/SysSqlSugarDataPermissionFilterProvider.cs` |
| DI 注册 | `SysServiceCollectionExtensions.cs` |

## 生产约束

- 功能权限（PermCode）与数据权限（`data_scope`）分离；宿主 API 若未按 PermCode 限制 Action，属**宿主层**风险，非本库可单独闭合  
