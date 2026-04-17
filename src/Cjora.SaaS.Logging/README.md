# Cjora.SaaS.Logging — Observability 使用规范

基于 **Serilog + OpenTelemetry** 构建的可观测性基座，适用于 Cjora.SaaS 全服务体系（Sys / CRM / PM / Core）。
本模块**不自研 Logger**，只提供：

1. Serilog 宿主集成（`UseCjoraSerilog`）；
2. OpenTelemetry Tracing + Metrics 注册（`AddCjoraObservability`）；
3. 统一 HTTP 请求管道中间件：Serilog 请求日志 + 异常兜底 JSON + LogContext + HTTP 指标；
4. 共享 `ActivitySource` / `Meter` 命名（`Cjora.*`）。

> 规范条目标注：**【MUST】必须遵守** / **【SHOULD】建议**。违反 MUST 条目在 Code Review 中必须打回。

---

## 1. 技术选型（MUST）

| 维度     | 选型                                    | 禁止                                                    |
| -------- | --------------------------------------- | ------------------------------------------------------- |
| Logging  | Serilog（`Serilog.AspNetCore`）         | 自写 `LoggerHelper` / `LoggerWrapper` / 静态 `Log.Log` 包装 |
| Tracing  | OpenTelemetry + `System.Diagnostics.Activity` | 自写 `TracingClient` / 透传结构 / 重复生成 TraceId     |
| Metrics  | OpenTelemetry + `System.Diagnostics.Metrics.Meter` | Prometheus / App Insights SDK 直调；`StatsD` 私有协议   |
| 落地载体 | Console（默认）/ 文件（生产自行追加 Sink） | 引入 ELK / Jaeger / Zipkin / Loki 运行时依赖（保持最小基础设施） |

业务代码**直接使用 `ILogger<T>`**（DI 注入），由 Serilog 接管 Provider；严禁再封装一层。

---

## 2. 基础设施装配（MUST）

### 2.1 Program.cs 最小完整样例

```csharp
using Cjora.SaaS.Logging.Hosting;
using Serilog;

// 启动阶段的 Bootstrap Logger：保证 Builder 构建期异常能被记录
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.Console()
    .CreateBootstrapLogger();

var builder = WebApplication.CreateBuilder(args);

// ① 接管 ILogger Provider；从 "Serilog" 配置节读取；强制追加 FromLogContext / MachineName / ServiceName 等 Enricher
builder.UseCjoraSerilog(o => o.ServiceName = "sys-api");

// ② 注册 Logging Options + HttpRequestMetrics + OpenTelemetry Tracing/Metrics（自动埋点 AspNetCore/HttpClient/Runtime）
builder.Services.AddCjoraObservabilityStack(
    builder.Configuration,
    o =>
    {
        o.ServiceName = "sys-api";
        o.IncludeExceptionDetail = builder.Environment.IsDevelopment();
    });

var app = builder.Build();

// ③ 管道挂载：请求日志 + 异常兜底 + HTTP 指标（最外层）
app.UseCjoraRequestLogging();

// 业务管道
app.UseCors("SysWeb");
app.UseCjoraSaaSSysTenantResolution();   // 解析 X-Tenant-Id → HttpContext
app.UseAuthentication();
app.UseAuthorization();

// ④ 把 TraceId / TenantId / UserId / ServiceName 压入 Serilog LogContext（供控制器/仓储日志自动携带）
app.UseCjoraLogContext();

app.MapControllers();

try { app.Run(); }
catch (Exception ex) { Log.Fatal(ex, "host terminated unexpectedly"); throw; }
finally { Log.CloseAndFlush(); }
```

### 2.2 appsettings.json 最小完整样例

```json
{
  "CjoraObservability": {
    "ServiceName": "sys-api",
    "IncludeExceptionDetail": false,
    "ConsoleExporter": false,
    "ExcludePaths": [ "/health", "/swagger" ]
  },
  "Serilog": {
    "MinimumLevel": {
      "Default": "Information",
      "Override": {
        "Microsoft.AspNetCore": "Warning",
        "Microsoft.Hosting.Lifetime": "Information",
        "System.Net.Http.HttpClient": "Warning"
      }
    },
    "WriteTo": [
      {
        "Name": "Console",
        "Args": {
          "outputTemplate": "[{Timestamp:HH:mm:ss} {Level:u3}] trace={TraceId} tenant={TenantId} user={UserId} {SourceContext} {Message:lj}{NewLine}{Exception}"
        }
      }
    ]
  }
}
```

| 配置键                                   | 类型    | 默认值         | 说明                                                  |
| ---------------------------------------- | ------- | -------------- | ----------------------------------------------------- |
| `CjoraObservability:ServiceName`         | string  | 程序集名       | 写入日志 / Activity `service.name` / 指标资源标签 |
| `CjoraObservability:InstanceId`          | string  | 机器名         | 容器化部署应注入 `POD_NAME` 等                        |
| `CjoraObservability:IncludeExceptionDetail` | bool | `false`      | 生产必须 `false`，避免异常堆栈泄露                   |
| `CjoraObservability:ConsoleExporter`     | bool    | `false`        | 开启 OTel Tracing / Metrics 控制台导出（仅开发）      |
| `CjoraObservability:ExcludePaths`        | array   | `[/health, /swagger]` | 命中前缀的请求不进日志/指标/链路采样                  |
| `CjoraObservability:TraceIdHeader`       | string  | `X-Trace-Id`   | 响应头键名                                            |
| `Serilog.*`                              | object  | —              | 标准 [Serilog.Settings.Configuration](https://github.com/serilog/serilog-settings-configuration) 结构 |

---

## 3. Logging 规范

### 3.1 统一字段（MUST）

所有结构化日志**必须**自动携带：

| 字段         | 来源                                        | 谁负责注入                               |
| ------------ | ------------------------------------------- | ---------------------------------------- |
| `TraceId`    | `Activity.Current.TraceId`（W3C 32 Hex）    | `CjoraLogContextMiddleware`（压入 LogContext） |
| `SpanId`     | `Activity.Current.SpanId`                   | `CjoraLogContextMiddleware`              |
| `ParentSpanId` | `Activity.Current.ParentSpanId`           | `CjoraLogContextMiddleware`              |
| `TenantId`   | 请求头 `X-Tenant-Id` / `ITenantProvider`    | `CjoraLogContextMiddleware`              |
| `UserId`     | JWT Claim `user_id`                         | `CjoraLogContextMiddleware`              |
| `ServiceName` | `RequestLoggingOptions.ServiceName`        | `UseCjoraSerilog` 注入为全局属性         |
| `InstanceId` | `RequestLoggingOptions.InstanceId`          | `UseCjoraSerilog` 注入为全局属性         |
| `MachineName` | `Environment.MachineName`                  | `Enrich.WithMachineName()`               |
| `ThreadId`   | 当前线程 Id                                 | `Enrich.WithThreadId()`                  |

### 3.2 结构化写法（MUST）

✅ 正确 — 使用占位符让 Serilog 写入独立字段：

```csharp
_logger.LogInformation("User {UserId} bound role {RoleCode}", userId, roleCode);
```

❌ 严禁 — 任何字符串拼接（会丢失结构化字段、污染全文索引、导致高基数）：

```csharp
_logger.LogInformation($"User {userId} bound role {roleCode}");   // 禁止
_logger.LogInformation("User " + userId + " ...");                // 禁止
_logger.LogInformation(string.Format("User {0}", userId));        // 禁止
```

### 3.3 日志级别（MUST）

| 级别          | 使用场景                                                                             |
| ------------- | ------------------------------------------------------------------------------------ |
| `Trace`       | **禁止**在生产环境启用；仅本地临时追踪                                               |
| `Debug`       | 开发态内部状态；默认 `Debug` 被配置关闭                                              |
| `Information` | 关键业务状态变化（登录成功、角色变更、订单创建）；HTTP 2xx/3xx 请求完成日志          |
| `Warning`     | 可恢复的异常路径（缓存降级、重试、HTTP 4xx、请求取消）                               |
| `Error`       | 未处理异常；HTTP 5xx；外部依赖不可用；数据一致性被破坏                               |
| `Critical`    | 进程级事故（启动失败、线程池耗尽、数据库完全不可用）                                 |

HTTP 请求完成日志的级别由 `UseCjoraRequestLogging` 统一映射：2xx/3xx → Info，4xx → Warning，5xx → Error。

### 3.4 必须打日志的场景（MUST）

- 未处理异常（由 `UseSerilogRequestLogging` 唯一记录）；
- 外部依赖降级、熔断、重试耗尽；
- 权限 / 租户 / 认证失败（Warning，不带敏感数据）；
- 配置热更、缓存失效广播、分布式锁获取 / 释放；
- 关键业务状态变化（订单提交、支付成功、密钥轮换、角色授予 / 回收）。

### 3.5 禁止打日志的场景（MUST）

- 进入 / 退出函数的样板日志；
- 命中热路径的循环内日志（如每个数据库行、每个缓存读取）；
- 每次 HTTP 请求进入时的 `LogInformation("Incoming ...")`——Serilog 请求日志已覆盖；
- 把明文密码、JWT、身份证、银行卡号等敏感数据进日志；
- 以 `Information` 级别打印大对象（> 1 KB JSON）。

### 3.6 异常记录（MUST）

> **异常只允许统一记录一次**。

- 业务代码**不得**自己 `_logger.LogError(ex, ...)` 再把异常向上抛——这会导致双重日志。
- 唯一例外：确实需要吞异常（catch 后不 rethrow）时，本地写一条 `Warning` 并说明原因（如缓存降级），**严禁**再 rethrow。
- 未处理异常的完整堆栈由外层 `UseSerilogRequestLogging` 在中间件边界记录一次，`CjoraExceptionHandlingMiddleware` 仅负责兜底 JSON 响应。

---

## 4. Tracing 规范

### 4.1 TraceId 生成与透传（MUST）

- 采用 **W3C TraceContext** 标准（ASP.NET Core 8 默认）。`traceparent` 请求头由 `OpenTelemetry.Instrumentation.AspNetCore` 自动解析。
- 跨服务调用**必须**经由 `IHttpClientFactory` / 注入的 `HttpClient`——`OpenTelemetry.Instrumentation.Http` 会自动注入 `traceparent`。**严禁** `new HttpClient()`。
- 响应头自动写入 `X-Trace-Id`（由 `CjoraExceptionHandlingMiddleware` 负责），前端 / 日志平台凭此头定位整条链路。
- 非 HTTP 跨边界（Pub/Sub、后台任务）传递（SHOULD）：把 `Activity.Current?.Id`（含 `traceparent` 格式）写入消息 Header，消费侧通过 `ActivityContext.Parse` 恢复。

### 4.2 ActivitySource 使用（MUST）

- 共用 `CjoraTelemetry.HttpActivitySource`（名称 `Cjora.Http`）。
- 每个模块需要自建 Activity 时**必须**使用 `Cjora.{Module}` 命名的 ActivitySource，并在 `CjoraTelemetry.DefaultActivitySources` 中登记（或通过 `AddCjoraObservability(…, configureTracing: t => t.AddSource("Cjora.YourModule"))` 追加）。
- **禁止**直接持有第三方 APM SDK 的 Tracer 对象。

### 4.3 Activity 标签（SHOULD）

- 遵循 OpenTelemetry 语义约定：`http.method` / `http.route` / `db.system` / `db.statement` / `messaging.destination` 等。
- 自定义标签一律 `cjora.*` 前缀，如 `cjora.tenant.id`、`cjora.cache.provider`。
- 任何高基数字段（完整 UserId、全 URL、TraceId 自身）**禁止**作为 Tag。

---

## 5. Metrics 规范

### 5.1 必备指标（MUST）

| Meter           | 指标名                              | 类型      | 单位     | 发布者                        |
| --------------- | ----------------------------------- | --------- | -------- | ----------------------------- |
| `Cjora.Http`    | `cjora.http.server.requests`        | Counter   | `{request}` | `CjoraHttpMetricsMiddleware`  |
| `Cjora.Http`    | `cjora.http.server.errors`          | Counter   | `{error}`   | `CjoraHttpMetricsMiddleware`  |
| `Cjora.Http`    | `cjora.http.server.duration`        | Histogram | `ms`     | `CjoraHttpMetricsMiddleware`  |
| `Cjora.Caching` | `cjora.cache.hits` / `misses` / `evictions` / `errors` / `operation_duration` | Counter / Histogram | `{op}` / `ms` | `Cjora.SaaS.Caching.CacheMetrics` |
| *Auto*          | `http.server.request.duration`（Kestrel 内置） | Histogram | `s`      | ASP.NET Core 运行时           |
| *Auto*          | `process.runtime.dotnet.*`（GC、线程池）       | Counter   | 多种     | `OpenTelemetry.Instrumentation.Runtime` |

HTTP 指标 Tag：`method / status_class / route`（`route` 为路由模板，**不是**完整 URL）。

### 5.2 命名约定（MUST）

- Meter 名：`Cjora.{Domain}`（PascalCase + `.`），例：`Cjora.Http`、`Cjora.Caching`、`Cjora.Data`。
- Metric 名：`cjora.{domain}.{metric}`（全小写 + `.`），snake_case 分词用 `_`（例：`cjora.http.server.requests`）。
- 单位：使用 UCUM 约定（`ms` / `s` / `By` / `{request}`），在 `CreateCounter` / `CreateHistogram` 时显式传入。
- Tag key：snake_case，OTel 语义约定优先（`http.method`、`db.system`），自定义一律 `cjora.{name}`。

### 5.3 高基数防御（MUST）

- **禁止** 以下字段作为 Tag：`TraceId` / `UserId` / `TenantId`（> 1k 租户时）/ `Path`（完整 URL）/ `Query` / 任何自增 Id。
- 基数管控：`route` 必须是路由模板（ASP.NET Core 自动提供）；`TenantId` 若确需区分，**SHOULD** 做分桶（如前 2 位 Hash）。

---

## 6. 上下文传递

### 6.1 中间件顺序（MUST）

```
app.UseRequestTimeouts();
app.UseCjoraRequestLogging();     // ① Serilog 请求日志（最外层） + 异常兜底 + HTTP 指标
app.UseCors(...);
app.UseCjoraSaaSSysTenantResolution();   // ② 解析 TenantId 并写入 HttpContext.Items
app.UseAuthentication();           // ③ 解析 JWT → HttpContext.User
app.UseAuthorization();
app.UseCjoraLogContext();          // ④ 把 TraceId/TenantId/UserId 压入 Serilog LogContext
app.MapControllers();
```

错序后果：
- `UseCjoraLogContext` 放在 Auth 之前 → `UserId` 读不到；
- `UseCjoraRequestLogging` 放在业务中间件后 → 控制器内的异常无法进入统一日志。

### 6.2 自动注入的机制（规范说明）

- **Serilog LogContext**（`using (LogContext.PushProperty("TenantId", tenantId)) { ... }`）：在请求 Scope 内生效，所有 `_logger.LogXxx` 输出自动携带字段。
- **Serilog `IDiagnosticContext`**：`UseSerilogRequestLogging` 唯一发出的请求完成日志所携带的扩展字段，由 `CjoraLogContextMiddleware` 与 `EnrichDiagnosticContext` 回调合并。
- **OpenTelemetry Resource**：`service.name` / `service.instance.id` 通过 `ResourceBuilder` 注入所有 Activity 与 Metric，导出时自动成为资源级维度。

### 6.3 扩展点：`IRequestLogEnricher`（SHOULD）

向请求完成日志追加领域字段（如 `DataScope`、`ProviderList`）。接口保持同步、不做异步 IO；异常会被静默吞掉。

```csharp
public sealed class MyEnricher : IRequestLogEnricher
{
    public void Enrich(HttpContext context, IDictionary<string, object?> properties)
    {
        properties["MyField"] = "value";
    }
}
services.AddSingleton<IRequestLogEnricher, MyEnricher>();
```

### 6.4 后台任务（SHOULD）

脱离 HTTP 上下文的后台任务（HostedService、TimerJob）**必须**：

```csharp
using var activity = CjoraTelemetry.HttpActivitySource.StartActivity("BackgroundJob: SyncUsers");
using (LogContext.PushProperty("TraceId", activity?.TraceId.ToString()))
using (LogContext.PushProperty("TenantId", tenantId))
{
    await DoWorkAsync();
}
```

---

## 7. 约束与治理

### 7.1 禁止清单（MUST NOT）

- 不得新增任何 `LoggerHelper` / `LoggerWrapper` / `ILog` / 静态 `Log.Write(...)` 类型的包装。
- 不得在业务模块中直接引用 `Jaeger.Client` / `Zipkin.Tracer` / `Elastic.ECS` / `Serilog.Sinks.Elasticsearch` 等落地层 SDK——落地层在宿主项目按需引入。
- 不得在高频路径（循环、每行、每缓存读）使用 `Information` 及以上级别；仅 `Debug` 且被配置关闭时放行。
- 不得在任何日志中出现明文密码、JWT、密钥、身份证、卡号；若必须出现则显式脱敏。
- 不得在一个请求内对同一异常多次 `LogError`。

### 7.2 日志级别运行期调整（SHOULD）

生产环境通过修改 `appsettings.json` 中 `Serilog:MinimumLevel:Override` 即可调级，配合 `reloadOnChange: true` 热更，无需重启。

### 7.3 采样与成本（SHOULD）

- 开发环境：Trace 采样 100%，Metrics 全量。
- 生产环境：Trace **应**使用 `ParentBased(TraceIdRatioBased(0.1))` 之类采样策略（在宿主 `AddCjoraObservability(..., configureTracing: t => t.SetSampler(...))` 中追加）；Metrics 常量低开销，全量。

### 7.4 演进路线（非本期落地）

| 阶段   | 内容                                                        |
| ------ | ----------------------------------------------------------- |
| Now    | Serilog Console + OTel Console Exporter（可选）+ 全自动指标 |
| Next   | 宿主可选追加 `AddOtlpExporter()` 对接 Grafana Agent / Tempo |
| Future | `CurrentUser` 改为 `AsyncLocal`，使后台任务自动继承上下文   |

---

## 8. 架构边界

| 负责                                                                          | 不负责                                                            |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Serilog 宿主装配、强制 Enricher、Console 兜底 Sink                            | 具体 Sink（File / ES / Loki）—— 宿主按需在 `appsettings.Serilog` 添加 |
| OpenTelemetry Tracing/Metrics Provider 装配、Cjora.* 白名单注册               | Exporter 端点（OTLP/Jaeger）—— 宿主自行追加                       |
| HTTP 请求管道（请求日志、异常 JSON、指标、LogContext）                        | 业务异常分类、业务指标（由各模块自建 Meter）                      |
| `IRequestLogEnricher` 扩展点定义                                              | 领域字段采集（由业务模块实现 Enricher）                           |
| 共享 `CjoraTelemetry.HttpActivitySource` / `HttpMeter`                        | 各模块自己的 ActivitySource / Meter（需 Cjora.* 前缀并登记）      |

本项目**不引用** `Cjora.SaaS.Core` / `Cjora.SaaS.Sys` / `Cjora.SaaS.Caching`，以保持独立。

---

## 9. 快速自检清单

- [ ] Program.cs 调用了 `builder.UseCjoraSerilog(...)`；
- [ ] Program.cs 调用了 `services.AddCjoraObservabilityStack(configuration, ...)`；
- [ ] 管道里 `app.UseCjoraRequestLogging()` 在最外层，`app.UseCjoraLogContext()` 在 Auth 之后；
- [ ] `appsettings.json` 有 `Serilog` 节；生产 `IncludeExceptionDetail=false`；
- [ ] 代码里全部使用 `ILogger<T>` + 占位符结构化写法；
- [ ] 未处理异常由中间件统一记录，业务代码不再自己 `LogError`；
- [ ] 新增 Meter / ActivitySource 名称以 `Cjora.` 开头并登记到 `CjoraTelemetry.DefaultMeters` / `DefaultActivitySources`；
- [ ] Tag 维度不含高基数字段（UserId / TraceId / 完整 URL）。
