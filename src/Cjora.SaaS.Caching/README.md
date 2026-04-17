# Cjora.SaaS.Caching

## 模块职责

提供**与业务无关的缓存基础能力**：键值缓存、分布式锁、GEO 空间查询、Hash 数据结构、失效广播。  
所有能力均有 Memory（单实例开发）和 Redis（微服务生产）两套实现，通过配置切换，上层代码无感知。

---

## 一致性模型（重要）

本模块承担以下一致性保证：

| 保证级别 | 机制 | 用法 |
|---|---|---|
| **强一致**（跨实例） | 共享后端 + 版本号 Key | 读取用带版本后缀的 Key；变更后 Bump 版本号（`SaaSCacheKeys.Version`），旧 Key 凭版本差异自然过期 |
| **最终一致**（外部 L1 失效加速） | `ICacheInvalidationBus` | 业务主动 `InvalidateAsync(key)`，外部 L1 观察者自行订阅清理 |
| **自愈**（所有场景兜底） | TTL | 所有缓存项必须有合理 TTL |

### 本模块**不做**的事（明确声明）

- ❌ **不**在写入 / 删除时悄悄广播到 Bus：
  那会让其他实例的订阅者反向删除刚写入的 key（Redis 共享存储场景 = 数据丢失）。
  广播是调用方的显式决定，通过 `InvalidateAsync(key)`。
- ❌ **不**自动订阅 Bus 后清理 `ICachingService`：
  同样的数据丢失 bug。业务层有独立 L1 时请自行 `_bus.SubscribeAsync(...)`。
- ❌ **不**伪装 Pub/Sub 的可靠性：Redis Pub/Sub 无持久化，离线期间消息丢失。
  强一致场景必须用版本号 Key，不能依赖 Bus。

### 典型一致性模式：版本号失效

```csharp
// 读：用当前版本号拼 Key
var ver = await versionStore.GetPermVersionAsync(tenantId);
var key = SaaSCacheKeys.UserScoped("sys", "perm", tenantId, userId, ver);
var value = await cache.GetAsync<List<string>>(key);
if (value is not null) return value;
value = await LoadFromDbAsync();
await cache.SetAsync(key, value);

// 写：Bump 版本号（原子 HINCRBY；不依赖本机时钟，规避多机钟差造成的版本号倒退）
await versionStore.BumpPermVersionAsync(tenantId);
// 旧 key 继续被 TTL 清理；新请求自动拿到新版本号 → 读到新 key → 落空 → 回源
await cache.InvalidateAsync(verKey);  // 可选：主动通知外部 L1 观察者
```

### 版本号 Bump 的放大效应（运维必读）

版本号 Bump 是"租户维度一次性作废所有相关缓存"，效果等同于局部缓存雪崩：

- 触发后，该 tenant 下所有相关 key 都会落到冷启动；
- 若该 tenant 在线用户 N 很大，第 N 个读请求会集中回源 DB，形成**局部 thundering herd**；
- `CachingEffectivePermissionResolver` / `CachingDataPermissionResolver` 已经用 `ILockService` 做了**单飞保护**，未抢到锁的请求会直接重算一次（不写入）——这在 tenant 内的并发读会降为 DB 单位时间 1~2 次；
- **其它新增的"读-回源"业务如果没加 lock**，Bump 后在高并发 tenant 上仍会打爆 DB。写这类代码时请 review：`GetAsync` miss → `LoadFromDb` 中间必须有 `ILockService.TryAcquireAsync`。

### `SetAsync` 与 `RemoveAsync` 的顺序语义（并发调用请注意）

`SetAsync` 与 `RemoveAsync` 是两条独立请求，在跨实例并发时存在经典的 "write-after-delete" 窗口：

```
t0  Instance A: reads from DB → gets OLD value, prepares SetAsync(key, OLD)
t1  Instance B: writes to DB (updates row)
t2  Instance B: RemoveAsync(key)
t3  Instance A: SetAsync(key, OLD)   ← 把刚被清掉的 key 写回了旧值
```

缓存里会短暂保留 OLD 值直到 TTL 过期。这是**所有 cache-aside 模式共有的**固有问题，本模块**不**在这一层做解决（做了反而会把 Remove 性能压垮）。正确的解法是：

1. **首选**：走版本号 Key 模式——写路径只 Bump 版本号，读路径按新版本组 Key，根本不存在"写回旧值"的 key；
2. **次选**：写路径 Remove 后延迟 DTTL 再 Remove 一次（double-delete），牺牲一些延迟换取窗口收敛；
3. **强要求**：调用 `ICacheManager.RemoveWithBroadcastAsync` 让失效广播失败时向业务抛出（见下）。

### `RemoveAsync` vs `RemoveWithBroadcastAsync` vs `InvalidateAsync`（错误语义对齐）

| API | 是否删底层 | 是否广播 | 广播失败时 |
|-----|-----------|---------|-----------|
| `ICacheManager.RemoveAsync` | ✅ | ✅ | **best-effort**（仅日志+打点，不抛） |
| `ICacheManager.RemoveWithBroadcastAsync` | ✅ | ✅ | **严格**（向业务抛出） |
| `ICacheManager.InvalidateAsync` | ❌ | ✅ | **严格**（向业务抛出） |
| `ICachingService.RemoveAsync` | ✅ | ❌ | 不适用（不广播） |

**选型建议：**
- 普通业务删除 → `RemoveAsync`（避免因 bus 临时抖动把业务也带崩）；
- 权限下沉 / 风控标记这类"失效必须下发" → `RemoveWithBroadcastAsync`，业务可据失败重试；
- 版本号 Bump 后只是想通知外部 L1 → `InvalidateAsync`。

---

## 架构边界

| 负责 | 不负责 |
|------|--------|
| 缓存 / 锁 / GEO / Hash / 失效广播抽象 | 业务缓存 Key 的业务语义 |
| Memory / Redis 两套实现 | 何时失效的业务策略 |
| `SaaSCacheKeys` 标准 Key 格式工厂 | 权限计算、租户解析等业务逻辑 |
| `AddCjoraCaching` DI 注册入口 | Bus 的可靠性（Pub/Sub 无持久化） |

本项目**不引用** `Cjora.SaaS.Core`、`Cjora.SaaS.Sys` 或任何业务程序集。

---

## 核心能力

### 接口一览

| 接口 | 说明 |
|------|------|
| **`ICacheManager`**（推荐业务入口） | 强类型 `CacheKey` + 按模块 TTL + 显式失效广播 + 全链路 `CancellationToken` 透传 + `KeyPrefix` 自动叠加 |
| `ICachingService` | 低层键值缓存（Get / Set / Remove / SetIfAbsent / KeyExists / GetTtl / GetTtlResult） |
| `ILockService` / `ILockHandle` | 分布式锁；`ILockHandle.LockLost` 取消令牌在续租失败时触发 |
| `IGeoService` | GEO 空间操作（Add / RadiusSearch） |
| `IHashMapService` | Hash 结构（HGet / HSet / HDel / HGetAll / HIncrBy），`GetAllAsync` 保留 `null` 语义与 Redis 一致 |
| `ICacheInvalidationBus` | 纯 pub/sub 失效广播总线，`SubscribeAsync` 返回 `IAsyncDisposable`，Dispose 精细反订阅本 handler |

### 实现对照

| 接口 | Memory 实现 | Redis 实现 |
|------|-------------|------------|
| `ICacheManager` | `CacheManager`（与 Provider 无关） | 同左 |
| `ICachingService` | `MemoryCacheService`（私有锁写路径原子，**反**脏数据遇到返回 default） | `RedisCacheService`（原子 SET NX PX、PTTL、脏数据 JSON 反序列化失败自动 DEL 自愈） |
| `ILockService` | `MemoryLockService`（Token 校验 + `ConcurrentDictionary` 原子获取） | `RedisLockService`（SET NX PX + Lua 释放 + `PeriodicTimer` 续租 + `LockLost` 取消令牌 + `DisposeWaitTimeoutMs` 上限） |
| `IGeoService` | `MemoryGeoService`（自维护 `ConcurrentDictionary`，Haversine，可配溢出策略） | `RedisGeoService`（GEOADD / GEORADIUS，TTL 仅在新 Key 设） |
| `IHashMapService` | `MemoryHashMapService`（自维护字典，带类型标签 JSON，可配溢出策略） | `RedisHashMapService`（同类型标签 JSON，TTL 仅在新 Key 设，反序列化失败自愈字段） |
| `ICacheInvalidationBus` | `MemoryCacheInvalidationBus`（快照遍历 + 带 Logger 的异常暴露） | `RedisCacheInvalidationBus`（Redis Pub/Sub，**只反订阅自己**，不会误伤共享 `ISubscriber`） |

### Key 命名规范（`SaaSCacheKeys`）

所有工厂返回强类型 `CacheKey`（可隐式转 `string`）。`CacheKey.Module` 经正则 `^[a-z0-9][a-z0-9_-]{0,31}$` 校验。

```
saas:{module}:ver:{kind}:{tenantId}                     ← 版本号（用于分布式失效）
saas:{module}:{type}:user:{tenantId}:{userId}:v{ver}    ← 用户维度数据
saas:{module}:dept:closure:{tenantId}:{rootId}:v{ver}   ← 部门闭包树
saas:{module}:lock:{kind}:{id}                          ← 分布式锁 Key
```

`CacheKey.Module` 会参与 `ICacheManager` 的 TTL 解析——`CacheOptions.ModuleExpireMinutes[module]` 命中时覆盖全局默认 TTL。

---

## 使用方式

### 1. 注册（Program.cs）

```csharp
builder.Services.AddCjoraCaching(builder.Configuration);
```

### 2. 配置（appsettings.json）

```json
"Cache": {
  "Provider": "Memory",
  "DefaultExpireMinutes": 7,
  "KeyPrefix": "",
  "ModuleExpireMinutes": {
    "sys":  5,
    "perm": 3,
    "dept": 30
  },
  "Memory": {
    "GeoMaxMembersPerKey":   10000,
    "HashMapMaxFieldsPerKey": 10000,
    "OverflowPolicy": "Throw"
  },
  "Lock": {
    "EnableAutoRenewal": true,
    "RenewalIntervalRatio": 0.33,
    "DisposeWaitTimeoutMs": 2000
  },
  "Redis": {
    "Configuration": "localhost:6379",
    "Database": 0,
    "InvalidationChannel": "saas:cache:invalidation"
  }
}
```

> 配置校验：注册时会挂载 `IValidateOptions<CacheOptions>`，`ValidateOnStart()` 首次解析即生效。
> `DefaultExpireMinutes` / `ModuleExpireMinutes[*]` 超出 `[1, 1440]`、`RenewalIntervalRatio` 超出 `[0.05, 0.5]`、`Provider` 非 `Memory/Redis` 等将直接抛 `OptionsValidationException`——不再静默 Clamp 成非预期值。

> `KeyPrefix`：多环境 / 多应用共享 Redis 时按需填（如 `dev.tenantA`），`ICacheManager` 会在 `CacheKey.Value` 前自动拼接 `{prefix}:`；本地 / 单实例留空即可。

### 3. 典型用法（推荐注入 `ICacheManager`）

```csharp
public class PermissionReader(ICacheManager cache, ILockService locks)
{
    private const string Module = "perm";

    public async Task<List<string>> ResolveAsync(string tenantId, long userId, string ver, CancellationToken ct)
    {
        var key = SaaSCacheKeys.UserScoped(Module, "codes", tenantId, userId, ver);

        var cached = await cache.GetAsync<List<string>>(key, ct);
        if (cached is not null) return cached;

        var lockKey = SaaSCacheKeys.Lock(Module, "codes", $"{tenantId}:{userId}");
        await using var handle = await locks.TryAcquireAsync(lockKey, TimeSpan.FromSeconds(10), ct);
        if (handle is null)
            return Array.Empty<string>().ToList(); // 降级

        // 长任务监听 LockLost：续租失败时主动退出
        using var linked = CancellationTokenSource.CreateLinkedTokenSource(ct, handle.LockLost);

        var codes = await LoadFromDbAsync(linked.Token);
        await cache.SetAsync(key, codes, cancellationToken: ct);
        return codes;
    }
}
```

### 4. 外部 L1 观察者（自行订阅 Bus）

```csharp
// 业务层有独立的 in-memory L1 缓存，希望在他实例 Invalidate 时清本地
services.AddHostedService<MyL1InvalidationSubscriber>();

public sealed class MyL1InvalidationSubscriber : IHostedService
{
    private readonly ICacheInvalidationBus _bus;
    private readonly MyLocalCache _l1;
    public MyL1InvalidationSubscriber(ICacheInvalidationBus bus, MyLocalCache l1) { _bus = bus; _l1 = l1; }

    private IAsyncDisposable? _sub;

    public async Task StartAsync(CancellationToken ct)
    {
        _sub = await _bus.SubscribeAsync("saas:sys:ver:*", key =>
        {
            _l1.Remove(key);
            return Task.CompletedTask;
        }, ct);
    }

    public async Task StopAsync(CancellationToken ct)
    {
        if (_sub is not null) await _sub.DisposeAsync();
    }
}
```

---

## Provider 语义差异速查

| 方面 | Memory | Redis |
|---|---|---|
| 跨进程可见性 | ❌（仅本进程） | ✅ 共享 |
| `ICachingService.GetTtlAsync` | 返回 `null`（IMemoryCache 不暴露剩余 TTL） | 返回 PTTL |
| `ICachingService.GetTtlResultAsync` | `KeyNotExists` / `Unsupported` | `KeyNotExists` / `NoExpiry` / `HasExpiry(ttl)` |
| `SetIfAbsentAsync` | 私有 `_writeGate` 锁覆盖所有写路径，**进程内原子** | Redis 原生 `SET NX PX` 原子 |
| `ILockService` | Token + `ConcurrentDictionary` 原子获取，Dispose 按 token 校验释放 | SET NX PX + Lua 释放 + `PeriodicTimer` 续租 + `LockLost` |
| `ILockHandle.LockLost` | 永远 `None` | 续租失败 / 锁已丢时 Cancel |
| GEO / HashMap TTL | **仅在 Key 首次创建时设置**（与 Redis 对齐，避免热写永不过期） | TTL 仅在 key 无过期时设置（`ExpireWhen.HasNoExpiry`） |
| 过期条目清理 | 后台 `MemoryExpirationReaper` 每分钟扫描 + 惰性过期双管 | Redis 引擎自持 |
| 多实例一致性 | ❌ **进程内语义**；容器集群下 `Lock`/`SetIfAbsent`/`InvalidationBus` 都失效，启动时会发出告警日志 | ✅ 跨实例 |
| GEO / HashMap 容量上限 | 受 `MemoryCacheLimitsOptions` 控制，超限按 `OverflowPolicy` | 无（按 Redis 存储配额） |
| 脏数据 | 记录 + 打点 + 返回 `default` | 记录 + 打点 + **DEL 自愈**（不再重复抛） |

---

## 可观测性（Meter）

模块内置 `System.Diagnostics.Metrics.Meter`，名称：`Cjora.SaaS.Caching`，业务侧通过 OpenTelemetry 一行代码接入即可。

| 指标 | 类型 | 维度 | 含义 |
|------|------|------|------|
| `cjora.cache.hits` | Counter | `cjora.cache.provider`, `cjora.cache.op` | 读命中次数 |
| `cjora.cache.misses` | Counter | 同上 | 读未命中次数 |
| `cjora.cache.deserialization_errors` | Counter | 同上 | 反序列化失败（Redis 端配合脏数据 DEL 自愈）|
| `cjora.cache.invalidation_publish_failures` | Counter | `cjora.cache.provider`, `cjora.cache.op` | `ICacheInvalidationBus.PublishAsync` 失败次数 |
| `cjora.cache.invalidation_handler_errors` | Counter | `cjora.cache.provider` | 订阅回调抛异常次数 |
| `cjora.cache.locks_acquired` | Counter | `cjora.cache.provider` | 锁获取成功 |
| `cjora.cache.locks_contended` | Counter | 同上 | 锁被竞争失败 |
| `cjora.cache.locks_lost` | Counter | 同上 | 续租检测到锁已丢（仅 Redis） |
| `cjora.cache.evicted_overflow` | Counter | `cjora.cache.provider`, `cjora.cache.op` | Memory 溢出淘汰次数 |

生产排障关注：
- `invalidation_publish_failures`（尤其 `op=enqueue-drop`）：外部 L1 失效被丢，可能 stale；
- `locks_lost`：续租检测到本 handle 已失去锁归属，临界区业务可能与他实例并发；
- `deserialization_errors` 在短时间内剧增：通常是序列化格式升级；Redis 端有 `:__heal__` 单飞锁，不会二次雪崩。

---

## 常见错误用法

| 错误 | 后果 | 正确做法 |
|------|------|----------|
| 期望 `SetAsync` 自动通知他实例清缓存 | 不会。本模块刻意不做这事，避免 Redis 共享存储下误删 | 显式 `InvalidateAsync(key)` |
| 在 Redis 提供者下自建"订阅 Bus → 删 `ICachingService`"的闭环 | 删掉的是共享 Redis 里的刚写入的值 | 仅在有独立 L1 时订阅；共享存储下靠版本号 |
| 依赖 Bus 保证"一定送达" | Pub/Sub 无持久化，离线期间丢消息 | 用版本号 Key + TTL 兜底 |
| 绕过 `ICacheManager`，业务直接注入 `ICachingService` | 失去 Key 规范、按模块 TTL | 注入 `ICacheManager` |
| 自己拼 Key 字符串 | Key 体系散落 | 用 `SaaSCacheKeys.*` |
| 同一 HashMap field 先写 `int` 后读 `string` | 抛 `CacheTypeMismatchException`（故意）| 同一 field 类型稳定；需异构请用不同 field |
| GEO / HashMap 超 Max 限制 | 默认抛 `CacheCapacityExceededException` | 显式改 `OverflowPolicy=EvictOldest` 或拆 Key |
| 持长锁后不监听 `LockLost` | 续租失败仍在临界区，可能与他人并发 | `CancellationTokenSource.CreateLinkedTokenSource(ct, handle.LockLost)` |
| 不 `await using` 释放 `ILockHandle` | 续租任务继续、锁直到 TTL 才释放 | 始终 `await using var handle = ...` |
| `ICacheInvalidationBus.SubscribeAsync` 回调中做重活 | 阻塞 Pub/Sub 接收线程 | 回调中仅做轻量操作，重任务入队异步处理 |
| Memory 模式下跨进程依赖 Bus | 进程内总线不跨进程 | 多实例部署必须切换 `Provider=Redis`；本模块会在启动时检测集群环境并告警 |
| 运行期通过 configmap 热更 `KeyPrefix` / `InvalidationChannel` / `Provider` / `Redis:Configuration` | 已建立的连接 / 订阅不重绑 → 新旧前缀错位或 Pub/Sub 静默脱钩 | 走滚动重启；运行期变更会触发 `CacheOptionsRuntimeGuard` 告警日志 |
| 用 `IHashMapService.IncrementAsync` 做大于 2<sup>53</sup> 的计数（订单号 / 全局序列） | Memory 抛 `OverflowException`、Redis Lua 返回 `CJORA_INC_OVERFLOW` 被翻译为 `OverflowException` | 确实需要巨大计数请拆位或换方案（例如分桶 + `long`） |
| 依赖 `SysSecurityCacheVersionStore.BumpXxx` 的返回值 | 当前实现为 `Task`，不返回新版本号；新版本号通过 `GetXxxVersion` 在下次读路径自然拿到 | 不要依赖 Bump 的返回值做业务联动 |
