using System.Text.RegularExpressions;

namespace Cjora.SaaS.Caching.Models;

/// <summary>
/// 强类型缓存 Key，必须通过 <see cref="SaaSCacheKeys"/> 或 <see cref="Raw"/> 工厂方法构造。
/// </summary>
/// <remarks>
/// <para><see cref="Module"/> 会参与 <c>CacheOptions.ModuleExpireMinutes</c> 的 TTL 策略选择，
/// 故对格式有强约束：仅允许小写字母、数字、下划线、短横线，长度 1-32。</para>
/// <para>提供 <c>implicit operator string</c> 以保持对既有 <see cref="Abstractions.ICachingService"/> 字符串 API 的兼容。</para>
/// <para><b>禁止 default(CacheKey)</b>：<see cref="Value"/> / <see cref="Module"/> 为空时调用 <see cref="EnsureValid"/> 或任何使用隐式转换的 API 会抛 <see cref="InvalidOperationException"/>。</para>
/// </remarks>
public readonly partial struct CacheKey : IEquatable<CacheKey>
{
    /// <summary>单个 Key 的最大长度（字符数），超过将被拒绝以防 Redis Key 空间膨胀。</summary>
    public const int MaxKeyLength = 512;

    private static readonly Regex ModulePattern = BuildModulePattern();

#if NET8_0_OR_GREATER
    [GeneratedRegex("^[a-z0-9][a-z0-9_-]{0,31}$", RegexOptions.CultureInvariant)]
    private static partial Regex BuildModulePattern();
#else
    private static Regex BuildModulePattern()
        => new("^[a-z0-9][a-z0-9_-]{0,31}$", RegexOptions.Compiled | RegexOptions.CultureInvariant);
#endif

    /// <summary>完整缓存 Key 字符串。</summary>
    public string Value { get; }

    /// <summary>所属业务模块（参与按模块 TTL 选择）。</summary>
    public string Module { get; }

    internal CacheKey(string value, string module)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("CacheKey value cannot be null or whitespace.", nameof(value));
        if (value.Length > MaxKeyLength)
            throw new ArgumentException(
                $"CacheKey value length {value.Length} exceeds MaxKeyLength {MaxKeyLength}.",
                nameof(value));
        if (string.IsNullOrWhiteSpace(module))
            throw new ArgumentException("CacheKey module is required.", nameof(module));
        if (!ModulePattern.IsMatch(module))
            throw new ArgumentException(
                $"CacheKey module '{module}' is invalid. Must match ^[a-z0-9][a-z0-9_-]{{0,31}}$.",
                nameof(module));

        Value = value;
        Module = module;
    }

    /// <summary>是否为未初始化的 <c>default(CacheKey)</c>。</summary>
    public bool IsDefault => Value is null || Module is null;

    /// <summary>
    /// 逃生通道：从原始字符串构造 <see cref="CacheKey"/>。仅推荐用于迁移期或框架内部桥接，
    /// 业务代码应使用 <see cref="SaaSCacheKeys"/> 工厂方法。
    /// <paramref name="module"/> 仍会做格式校验。
    /// </summary>
    public static CacheKey Raw(string value, string module) => new(value, module);

    /// <summary>确保当前 <see cref="CacheKey"/> 已合法初始化，否则抛异常。框架内部在 API 入口调用。</summary>
    public void EnsureValid()
    {
        if (IsDefault)
            throw new InvalidOperationException(
                "CacheKey is default(CacheKey). Use SaaSCacheKeys factory or CacheKey.Raw(...) to construct.");
    }

    /// <inheritdoc />
    public override string ToString() => Value ?? string.Empty;

    /// <inheritdoc />
    public bool Equals(CacheKey other) => string.Equals(Value, other.Value, StringComparison.Ordinal);

    /// <inheritdoc />
    public override bool Equals(object? obj) => obj is CacheKey other && Equals(other);

    /// <inheritdoc />
    public override int GetHashCode() => Value?.GetHashCode(StringComparison.Ordinal) ?? 0;

    /// <summary>相等比较。</summary>
    public static bool operator ==(CacheKey left, CacheKey right) => left.Equals(right);

    /// <summary>不等比较。</summary>
    public static bool operator !=(CacheKey left, CacheKey right) => !left.Equals(right);

    /// <summary>
    /// 隐式转换为 <see cref="string"/>。若为 <c>default(CacheKey)</c> 会抛 <see cref="InvalidOperationException"/>，
    /// 保证任何字符串 API 都不会收到 <c>null</c>。
    /// </summary>
    public static implicit operator string(CacheKey key)
    {
        key.EnsureValid();
        return key.Value;
    }
}
