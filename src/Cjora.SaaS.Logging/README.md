# Cjora.SaaS.Logging

## 模块职责

提供**与业务无关的请求日志与异常处理中间件**。  
每个 HTTP 请求结束后输出一条结构化日志，未处理异常返回统一 JSON 错误响应。  
通过 `IRequestLogEnricher` 扩展点允许业务模块（如 Sys 的数据权限）向日志追加领域字段，而无需 Logging 项目直接依赖业务程序集。

---

## 架构边界

| 负责 | 不负责 |
|------|--------|
| 请求维度结构化日志（TraceId / SpanId / ServiceName / Path / ElapsedMs） | SQL 日志（由 Core SqlSugar AOP 负责） |
| W3C TraceContext 标准字段输出（TraceId / SpanId / ParentSpanId） | OpenTelemetry SDK 集成（由宿主按需添加） |
| 未处理异常捕获 + 统一 JSON 错误响应 | 业务异常分类（由业务层抛出特定异常） |
| `IRequestLogEnricher` 扩展接口定义 | 领域字段（DataScope 等）的具体收集 |
| 响应头写入 `X-Trace-Id` + 服务/实例标识 | 日志存储与可视化（Seq / ELK / Jaeger） |

本项目不引用 `Cjora.SaaS.Core`、`Cjora.SaaS.Sys`、`Cjora.SaaS.Caching`。

---

## 依赖关系

```
Cjora.SaaS.Logging（独立）
  ← 被 Sys 引用（DataPermissionRequestLogEnricher 实现 IRequestLogEnricher）
  ← 被 Sys.Api / Host.Sample 引用（DI 注册 + 管道挂载）
  → 依赖 Microsoft.AspNetCore.App
```

---

## 核心能力

### 中间件：`RequestLoggingMiddleware`

每个请求完成（或抛异常）后输出一条结构化日志，字段固定为：

| 字段 | 来源 |
|------|------|
| `TraceId` | W3C `Activity.Current?.TraceId`（32 位 Hex）或 `context.TraceIdentifier` |
| `SpanId` | `Activity.Current?.SpanId`（当前 Span 标识，链路追踪用） |
| `ParentSpanId` | `Activity.Current?.ParentSpanId`（父 Span 标识，跨服务追踪用） |
| `ServiceName` | `RequestLoggingOptions.ServiceName`（默认入口程序集名） |
| `InstanceId` | `RequestLoggingOptions.InstanceId`（默认机器名 / Pod 名） |
| `Method` | HTTP Method |
| `Path` | 请求路径 |
| `StatusCode` | 响应状态码 |
| `ElapsedMs` | 请求全程耗时（ms） |
| `UserId` | JWT Claim `user_id` |
| `TenantId` | 请求头 `X-Tenant-Id` |
| *(扩展字段)* | 各 `IRequestLogEnricher` 注入 |

**W3C TraceContext 支持**：ASP.NET Core 内置的 `ActivitySource` 自动解析上游 `traceparent` 头并传播到下游 `HttpClient` 调用，无需手写协议。未来接入 OpenTelemetry 时，日志中的 `TraceId / SpanId` 与 Jaeger / Zipkin 自动对齐。

异常时：响应状态码置 500，返回 JSON `{ success: false, error: "unhandled", traceId, message }`。  
开发环境开启 `IncludeExceptionDetail` 后 `message` 包含异常原始信息，生产环境固定为 `"Internal Server Error"`。

### 扩展接口：`IRequestLogEnricher`

```csharp
public interface IRequestLogEnricher
{
    void Enrich(HttpContext context, IDictionary<string, object?> properties);
}
```

实现此接口并注册为 DI Singleton/Scoped，中间件在每次请求结束时自动调用。  
Enricher 内部抛异常会被静默吞掉，不影响主管道。

---

## 使用方式

### 1. 注册服务

```csharp
builder.Services.AddCjoraLogging(o =>
{
    o.IncludeExceptionDetail = builder.Environment.IsDevelopment();
    // o.ExcludePaths.Add("/metrics");  // 可选：排除额外路径
    // o.ServiceName = "sys-api";       // 可选：微服务场景显式设置服务名（默认为程序集名）
    // o.InstanceId = Environment.GetEnvironmentVariable("POD_NAME") ?? Environment.MachineName;  // 可选：容器化部署设置 Pod 名
});
```

### 2. 挂载中间件（必须在 UseAuthentication 之前）

```csharp
app.UseCjoraRequestLogging();   // 放在最前，确保所有请求都被捕获
app.UseAuthentication();
app.UseAuthorization();
```

### 3. 实现自定义 Enricher

```csharp
// 在业务模块中实现，不在 Logging 项目中实现
public class MyEnricher : IRequestLogEnricher
{
    public void Enrich(HttpContext context, IDictionary<string, object?> properties)
    {
        properties["MyField"] = "value";
    }
}

// 注册
services.AddSingleton<IRequestLogEnricher, MyEnricher>();
```

---

## 示例

Sys 的 `DataPermissionRequestLogEnricher` 实现：

```csharp
// 从 IDataPermissionContext 读取当前 Scope 并追加到日志
properties["DataScope"] = context.Scope.ToString();
properties["BypassRowLevelFilters"] = context.BypassRowLevelFilters;
properties["DataPermissionProviders"] = providerNames;
```

输出日志示例（结构化，适配 Seq / ELK / Jaeger 等）：

```json
{
  "TraceId": "abc123def456789012345678abcdef00",
  "SpanId": "789abcdef0123456",
  "ParentSpanId": "456def0000000000",
  "ServiceName": "Cjora.SaaS.Sys.Api",
  "InstanceId": "pod-sys-api-1",
  "Method": "GET",
  "Path": "/api/users",
  "StatusCode": 200,
  "ElapsedMs": 42,
  "UserId": "1001",
  "TenantId": "default",
  "DataScope": "Department",
  "BypassRowLevelFilters": false
}
```

---

## 常见错误用法

| 错误 | 后果 | 正确做法 |
|------|------|----------|
| `UseCjoraRequestLogging()` 放在 `UseAuthentication` 之后 | 异常日志无法写入 `UserId`（认证上下文未建立） | 放在所有中间件最前面 |
| 生产环境开启 `IncludeExceptionDetail = true` | 异常堆栈信息泄露给调用方 | 仅在 `IsDevelopment()` 时开启 |
| 在 `IRequestLogEnricher.Enrich` 中执行异步操作（async/await） | 接口设计为同步，异步会阻塞或丢失上下文 | Enricher 仅读取已计算的同步状态（如 `HttpContext.Items`） |
| 将 Logging 项目引用 Core / Sys | 破坏 Logging 独立性，形成双向依赖 | Logging 只定义 `IRequestLogEnricher`，Sys 实现它 |
| 不注册任何 `IRequestLogEnricher` | 只输出通用字段，领域字段缺失 | Sys 的 `AddCjoraSaaSSys()` 已自动注册 `DataPermissionRequestLogEnricher` |
