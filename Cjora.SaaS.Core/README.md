# Cjora.SaaS.Core

面向 **.NET 8** 的 **SqlSugar 多租户**基础库：**共享库 + `TenantId`**、可选 **按租户切换连接串**、**数据权限**、**全局 `QueryFilter`**、**AOP**。

## 快速注册（推荐）

一次注册租户 + 用户 + SqlSugar + 数据权限：

```csharp
using Cjora.SaaS.Core.Extensions;
using SqlSugar;

builder.Services.AddCjoraSaaSWithSqlSugar(
    configureTenant: o => { o.DefaultTenantId = "default"; },
    configureSqlSugar: o =>
    {
        o.MasterConnectionString = "Data Source=app.db";
        o.DbType = DbType.Sqlite;
    });
builder.Services.AddSqlSugarTenantRepository<YourEntity>();
```

仅多租户（不用 SqlSugar 时）：

```csharp
builder.Services.AddSaaSCore();
```

管道：`app.UseTenantResolution();`（租户来自 JWT 时请放在 `UseAuthentication` 之后）。

示例项目：**`Cjora.SaaS.Sample.Host`**。

## 主要命名空间

| 区域 | 说明 |
|------|------|
| `MultiTenancy` | `ITenantProvider`、`TenantMiddleware`、`TenantIdentifierResolver`（头→JWT→子域）、`ITenantStorageRoutingProvider` |
| `DataPermission` | `IDataPermissionContext`、`DataScopeKind` |
| `SqlSugarInfrastructure` | `SqlSugarSaaSOptions`、`SqlSugarTenantClientFactory`、过滤器扩展 |
| `Repository` | `ITenantScopedEntity`、`IRepository<T>`、`SqlSugarRepository<T>` |
| `Auth` | `ICurrentUser` |
