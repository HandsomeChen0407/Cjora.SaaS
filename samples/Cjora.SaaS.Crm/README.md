# Cjora.SaaS.Crm

## 模块职责

**客户域可复用类库**：客户主数据、联系人、跟进记录；实现 **Customer 数据范围** 的 SqlSugar 全局过滤（`DataScopeKind.Customer`）。

**依赖**：仅 `Cjora.SaaS.Core`（**不**依赖 Sys，便于多宿主复用与 NuGet 分发）。

## 架构边界

| 内容 | 说明 |
|------|------|
| 实体 | `CrmCustomer`、`CrmCustomerContact`、`CrmCustomerFollow`，均含租户与部门等 Core 基类字段。 |
| 数据隔离 | `ICustomerScopedEntity` + `CrmSqlSugarDataPermissionFilterProvider`（EXISTS `crm_customer`）。 |
| 与 Sys | 无程序集引用；`UserId`/`CreatorUserId` 与 Sys 用户表 **仅 ID 对应**，不 Join。 |

## 客户域模型

- **CrmCustomer**：客户主表；`DepartmentId` 表示归属部门；`CreatorUserId` 表示创建人。
- **CrmCustomerContact / CrmCustomerFollow**：含 `customer_id` 指向客户。

## 客户归属与 Customer 范围语义

- **部门维度**：实体继承 `TenantDepartmentEntityBase`，在 `DataScopeKind.Department` 下由 **Sys** 的部门 Provider 处理。
- **Customer 范围（`DataScopeKind.Customer`）**：当前实现为：仅可见 **创建人为当前用户** 的客户及其子行（EXISTS 子查询比对 `crm_customer.creator_user_id`）。**非**单独 Owner 表；若产品需要「负责人/共享团队」，需在 CRM 内扩展表结构并同步改 Provider。

## 如何接入 DataScope

1. 宿主配置 `Modules:EnableCrmDataPermission = true`（见 Sys.Api `Program.cs`）。
2. 调用 `services.AddCjoraSaaSCrmDataPermission()`。
3. JWT / 角色仅当启用 CRM Provider 后，才可为用户颁发 **`data_scope = 5`（Customer）**；否则 Core **Fail-Fast**。

## 示例：宿主注册

```csharp
builder.Services.AddCjoraSaaSCrmDataPermission();
```

## 示例：实体实现标记接口

```csharp
public sealed class CrmCustomerContact : TenantDepartmentEntityBase, ICustomerScopedEntity
{
    public long CustomerId { get; set; }
    // ...
}
```

## 常见错误用法

- ❌ 未启用 `AddCjoraSaaSCrmDataPermission` 却颁发 `data_scope=Customer(5)`。
- ❌ 把「客户功能权限」与「Customer 数据范围」混为一谈——前者用 PermCode，后者用 `DataScopeKind.Customer` + Provider。
