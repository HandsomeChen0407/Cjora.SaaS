# Cjora.SaaS.Host.Sample

## 模块职责

**示例宿主**：演示如何在 IAM 之外接入业务模块（CRM / PM）的数据权限。  
不作为生产宿主使用，仅用于验证框架扩展能力与集成测试。

---

## 架构边界

| 负责 | 不负责 |
|------|--------|
| 装配 IAM + 可选 CRM/PM 数据权限模块 | 任何生产级部署配置 |
| 演示 `Modules:Enable*DataPermission` 特性开关 | 生产业务逻辑 |
| CRM/PM 实体 CodeFirst 建表（按开关） | CRM/PM 的 CRUD 业务接口 |

生产宿主使用 `Cjora.SaaS.Sys.Api`；本项目仅用于框架演示与 E2E 测试。

---

## 依赖关系

```
Cjora.SaaS.Host.Sample
  → 依赖 Cjora.SaaS.Core / Sys / Sys.Web / Caching / Logging
  → 依赖 Cjora.SaaS.Crm（可选，按配置开关）
  → 依赖 Cjora.SaaS.Pm（可选，按配置开关）
```

---

## 核心能力

- 与 `Sys.Api` 完全相同的 IAM API
- 通过配置动态开启 CRM / PM 数据权限扩展，开启后：
  - 注册对应的 `ISqlSugarDataPermissionFilterProvider`
  - CodeFirst 创建业务实体表

---

## 配置说明

```json
// appsettings.json
{
  "Modules": {
    "EnableCrmDataPermission": false,  // 改为 true 启用 CRM 客户域数据权限
    "EnablePmDataPermission": false    // 改为 true 启用 PM 项目域数据权限
  }
}
```

---

## 使用方式

```bash
dotnet run --project samples/Cjora.SaaS.Host.Sample
```

开启 CRM 数据权限后，如果用户的 `data_scope` 声明为 `Customer`，  
`CrmSqlSugarDataPermissionFilterProvider` 会自动对 `ICustomerScopedEntity` 表追加 EXISTS 子查询过滤。

---

## 示例：同时开启 CRM + PM

```json
{
  "Modules": {
    "EnableCrmDataPermission": true,
    "EnablePmDataPermission": true
  }
}
```

启动后，Core 的 `EnsureDataScopeHandledByProviders` 校验通过（三个 Provider 分别覆盖 Department / Customer / Project）。

---

## 常见错误用法

| 错误 | 后果 | 正确做法 |
|------|------|----------|
| 将此宿主用于生产 | 示例项目无生产级安全加固（如审计、限流） | 生产使用 `Sys.Api`，按需参考示例做扩展 |
| 开启 `EnableCrmDataPermission` 后为用户颁发 `data_scope=Customer` 但未重启服务 | Provider 未注册，Fail-Fast | 必须重启使配置生效 |
| `Modules:Enable*DataPermission = true` 但对应程序集未被引用 | 编译错误（`AddCjoraSaaSCrmDataPermission` 找不到） | 确保 `Cjora.SaaS.Crm` / `Cjora.SaaS.Pm` 已被 `Host.Sample.csproj` 引用 |
