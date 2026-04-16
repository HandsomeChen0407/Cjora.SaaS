# Cjora.SaaS.Crm

## 模块职责

演示如何扩展 Core 框架，为 **CRM 客户域**（`DataScopeKind.Customer`）实现行级数据权限。  
本项目是业务模块实现 `ISqlSugarDataPermissionFilterProvider` 的参考范例，不包含完整 CRM 业务逻辑。

---

## 架构边界

| 负责 | 不负责 |
|------|--------|
| `ICustomerScopedEntity` 标记接口（供实体实现） | 客户 CRUD 业务接口 |
| `CrmSqlSugarDataPermissionFilterProvider`（Customer 行级过滤） | 用户、角色、权限等 IAM 功能 |
| `AddCjoraSaaSCrmDataPermission()` DI 注册入口 | 缓存、日志基础设施 |
| 示例实体（`CrmCustomer`、`CrmCustomerContact`、`CrmCustomerFollow`） | 完整的 CRM 产品功能 |

不引用 `Cjora.SaaS.Sys`、`Cjora.SaaS.Logging`、`Cjora.SaaS.Caching`，仅依赖 Core。

---

## 依赖关系

```
Cjora.SaaS.Crm
  → 依赖 Cjora.SaaS.Core（ISqlSugarDataPermissionFilterProvider 接口）
  ← 被 Host.Sample 按需引用（EnableCrmDataPermission=true 时）
```

---

## 核心能力

### `CrmSqlSugarDataPermissionFilterProvider`

- 处理 `DataScopeKind.Customer`
- 对所有实现 `ICustomerScopedEntity` 的表追加 EXISTS 子查询：

```sql
-- 伪 SQL
WHERE EXISTS (
  SELECT 1 FROM crm_customer c
  WHERE c.tenant_id = entity.tenant_id
    AND c.id = entity.customer_id
    AND c.creator_user_id = @currentUserId
)
```

- 不使用 IN（避免大量 Id 导致的 SQL 膨胀）
- `BypassRowLevelFilters = true` 时自动跳过

---

## 使用方式

```csharp
// 在宿主 Program.cs 中条件注册：
if (enableCrmDataPermission)
{
    builder.Services.AddCjoraSaaSCrmDataPermission();
}
```

注意：**未调用此方法**时，不得为用户颁发 `data_scope = Customer`，否则 Core 在创建 SqlSugar Client 时 Fail-Fast。

---

## 示例：自定义实体接入客户域过滤

```csharp
// 1. 定义实体，实现标记接口
public class CrmCustomerOrder : ITenantScopedEntity, ISoftDeleteEntity, ICustomerScopedEntity
{
    public long CustomerId { get; set; }  // ICustomerScopedEntity 要求
    // ... 其他字段
}

// 2. 无需额外配置，Provider 自动对所有 ICustomerScopedEntity 表生效
```

---

## 常见错误用法

| 错误 | 后果 | 正确做法 |
|------|------|----------|
| 在 Sys 或 Core 中引用 Crm 程序集 | 产生单向依赖循环，破坏分层架构 | Crm 只被宿主（Host.Sample）引用 |
| 实体未实现 `ICustomerScopedEntity` 但期望被 Client 域过滤 | 过滤器对此表不生效，数据全量可见 | 必须显式实现 `ICustomerScopedEntity` |
| 调用 `AddCjoraSaaSCrmDataPermission` 但颁发的用户 `data_scope` 仍为其他值 | Client 域过滤器注册了但当前用户 Scope 不匹配，过滤器条件自动短路（不生效） | 确保权限码 `data_scope` 与 Provider 的 `HandledDataScopes` 一致 |
