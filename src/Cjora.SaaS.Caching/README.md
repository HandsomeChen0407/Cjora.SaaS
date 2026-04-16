# Cjora.SaaS.Caching

## 模块职责

提供**与业务无关的缓存基础能力**：键值缓存、分布式锁、GEO 空间查询、Hash 数据结构。  
所有能力均有 Memory（单实例）和 Redis（多实例）两套实现，通过配置切换，上层代码无感知。

---

## 架构边界

| 负责 | 不负责 |
|------|--------|
| 缓存、锁、GEO、Hash 的抽象接口定义 | 业务缓存 Key 的业务语义（由使用方决定） |
| Memory / Redis 两套实现 | 缓存何时失效的业务策略 |
| `SaaSCacheKeys` 标准 Key 格式工具 | 权限计算、租户解析等业务逻辑 |
| `AddCjoraCaching` DI 注册入口 | 调用方如何使用缓存数据 |

本项目**不引用** `Cjora.SaaS.Core`、`Cjora.SaaS.Sys` 或任何业务程序集。

---

## 依赖关系

```
Cjora.SaaS.Caching（独立）
  ← 被 Sys 引用（权限解析层通过接口消费）
  ← 被 Sys.Api / Host.Sample 引用（DI 注册）
  → 依赖 StackExchange.Redis（Redis 实现）
  → 依赖 Newtonsoft.Json（序列化）
  → 依赖 Microsoft.Extensions.Caching.Memory（Memory 实现）
```

---

## 核心能力

### 接口一览

| 接口 | 说明 |
|------|------|
| `ICachingService` | 键值缓存（Get / Set / Remove） |
| `ILockService` | 分布式锁（TryAcquire，返回 `ILockHandle`，using 自动释放） |
| `IGeoService` | GEO 空间操作（Add / RadiusSearch） |
| `IHashMapService` | Redis Hash 结构（HGet / HSet / HDel / HGetAll） |
| `ICacheInvalidationBus` | 缓存失效广播总线（Publish / Subscribe，跨实例缓存一致性） |

### 实现对照

| 接口 | Memory 实现 | Redis 实现 |
|------|-------------|------------|
| `ICachingService` | `MemoryCacheService` | `RedisCacheService` |
| `ILockService` | `MemoryLockService`（进程内 `SemaphoreSlim`） | `RedisLockService`（SET NX PX + Lua 原子释放） |
| `IGeoService` | `MemoryGeoService`（Haversine 计算） | `RedisGeoService`（GEOADD / GEORADIUS） |
| `IHashMapService` | `MemoryHashMapService`（`ConcurrentDictionary`） | `RedisHashMapService` |
| `ICacheInvalidationBus` | `MemoryCacheInvalidationBus`（进程内事件） | `RedisCacheInvalidationBus`（Redis Pub/Sub） |

### Key 命名规范（`SaaSCacheKeys`）

```
saas:{module}:ver:{kind}:{tenantId}              ← 版本号（用于分布式失效）
saas:{module}:{type}:user:{tenantId}:{userId}:v{ver}  ← 用户维度数据
saas:{module}:dept:closure:{tenantId}:{rootId}:v{ver} ← 部门闭包树
saas:{module}:lock:{kind}:{id}                   ← 分布式锁 Key
```

---

## 使用方式

### 1. 注册（Program.cs）

```csharp
builder.Services.AddCjoraCaching(builder.Configuration);
```

### 2. 配置切换（appsettings.json）

```json
"Cache": {
  "Provider": "Memory",          // 单实例用 Memory；多实例用 Redis
  "DefaultExpireMinutes": 7,
  "Redis": {
    "Configuration": "localhost:6379",
    "Database": 0
  }
}
```

切换为 Redis 只需将 `Provider` 改为 `"Redis"`，无需修改业务代码。

### 3. 注入使用

```csharp
public class MyService(ICachingService cache, ILockService locks)
{
    public async Task<string?> GetCachedValueAsync(string key, CancellationToken ct)
    {
        var cached = await cache.GetAsync<string>(key);
        if (cached is not null) return cached;

        // 防缓存击穿：用分布式锁
        await using var handle = await locks.TryAcquireAsync(
            SaaSCacheKeys.Lock("mymod", "val", key), TimeSpan.FromSeconds(10), ct);

        if (handle is null) return null; // 未获锁，降级处理

        var value = /* ... 从 DB 加载 ... */ "result";
        await cache.SetAsync(key, value, TimeSpan.FromMinutes(5));
        return value;
    }
}
```

---

## 示例

```csharp
// 写入用户权限码集合（7 分钟过期）
var key = SaaSCacheKeys.UserScoped("sys", "permcodes", tenantId, userId, version);
await _cache.SetAsync(key, permCodes, TimeSpan.FromMinutes(7));

// GEO：添加门店位置并查询附近 3km
await _geo.AddAsync("stores", storeId.ToString(), lat, lon);
var nearby = await _geo.RadiusSearchAsync("stores", myLat, myLon, 3, "km");

// Hash：维护用户在线状态
await _hashMap.HSetAsync("online:users", userId.ToString(), new UserStatus { LastSeen = DateTime.UtcNow });

// 缓存失效广播：权限变更后主动通知所有实例
await _bus.PublishAsync(SaaSCacheKeys.Version("sys", "perm", tenantId));

// 订阅失效通知（通常在应用启动时注册）
await _bus.SubscribeAsync("saas:sys:ver:*", async key =>
{
    await _cache.RemoveAsync(key);
    // 可在此处触发本地缓存刷新
});
```

---

## 常见错误用法

| 错误 | 后果 | 正确做法 |
|------|------|----------|
| 缓存业务数据（客户列表、项目详情等） | 与 Caching 架构约束冲突，污染缓存边界 | 只缓存权限相关、配置类等基础数据 |
| Key 不含 `tenantId` / `userId` | 多租户下缓存命中错误租户的数据 | 使用 `SaaSCacheKeys.*` 工厂方法生成 Key |
| `ILockService` 返回 `null` 时继续执行 | 并发穿透，缓存击穿 | `null` 时降级或等待重试 |
| Memory 模式下 `ILockService` 跨进程协调 | `MemoryLockService` 只在进程内互斥，多实例下无效 | 多实例部署必须切换 `Provider=Redis` |
| 不 `await using` 释放 `ILockHandle` | 锁未释放，下次相同 Key 永远锁定 | 始终 `await using var handle = await locks.TryAcquireAsync(...)` |
| 直接构造 `RedisCacheService` / `MemoryCacheService` | 绕过配置切换，耦合实现 | 注入 `ICachingService` 接口 |
| `ICacheInvalidationBus.SubscribeAsync` 的回调中执行长时间阻塞操作 | 阻塞 Redis Pub/Sub 接收线程 | 回调中仅做轻量操作（清缓存、设标记），重操作异步排队 |
| Memory 模式下依赖 `ICacheInvalidationBus` 跨进程通知 | `MemoryCacheInvalidationBus` 仅进程内广播 | 多实例部署必须切换 `Provider=Redis` |
