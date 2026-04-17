namespace Cjora.SaaS.Caching.Internal;

/// <summary>
/// <see cref="Abstractions.ICacheInvalidationBus"/> 的订阅模式匹配规则（Memory / Redis 实现共用）。
/// </summary>
/// <remarks>
/// <para>匹配规则（故意保持极简，避免各实现产生差异）：</para>
/// <list type="bullet">
///   <item><description><c>pattern == "*"</c>：匹配全部 Key；</description></item>
///   <item><description><c>pattern</c> 以 <c>*</c> 结尾：去掉星号后做前缀匹配；</description></item>
///   <item><description>其余：<b>精确等于</b> 匹配（不再做默认前缀匹配，避免<c>"a:b"</c> 订阅意外命中 <c>"a:bad"</c>）。</description></item>
///   <item><description>中缀含 <c>*</c>（如 <c>"a*b"</c>）：<see cref="Validate"/> 会直接抛错，避免退化为"永远命不中"的死订阅。</description></item>
/// </list>
/// </remarks>
internal static class SubscriptionPatternMatcher
{
    /// <summary>
    /// 校验订阅模式合法性；不合法（如中缀 <c>*</c>）抛 <see cref="ArgumentException"/>。
    /// </summary>
    public static void Validate(string pattern, string paramName)
    {
        if (string.IsNullOrWhiteSpace(pattern))
            throw new ArgumentException("Subscription pattern cannot be null or whitespace.", paramName);

        var first = pattern.IndexOf('*');
        if (first < 0)
            return;

        var last = pattern.LastIndexOf('*');
        if (first != last)
            throw new ArgumentException(
                $"Subscription pattern '{pattern}' contains multiple '*'; only trailing wildcard or exact '*' is supported.",
                paramName);

        if (first != pattern.Length - 1)
            throw new ArgumentException(
                $"Subscription pattern '{pattern}' has '*' in the middle; only trailing wildcard is supported.",
                paramName);
    }

    public static bool IsMatch(string pattern, string key)
    {
        if (string.IsNullOrEmpty(pattern) || string.IsNullOrEmpty(key))
            return false;

        if (pattern == "*")
            return true;

        if (pattern.EndsWith('*'))
        {
            var prefix = pattern[..^1];
            return key.StartsWith(prefix, StringComparison.Ordinal);
        }

        return string.Equals(pattern, key, StringComparison.Ordinal);
    }
}
