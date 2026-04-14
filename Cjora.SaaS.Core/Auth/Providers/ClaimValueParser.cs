using System.Collections.Frozen;
using System.Globalization;

namespace Cjora.SaaS.Core.Auth.Providers;

/// <summary>
/// 声明字符串到强类型的防御式转换，供 <see cref="Abstractions.ICurrentUser.FindClaim{T}(string)"/> 使用。
/// </summary>
/// <remarks>
/// 内置类型通过 <see cref="FrozenDictionary{TKey,TValue}"/> 分派到无反射的 <c>TryParse</c> 委托；开放枚举在字典未命中时单独处理，避免为每种枚举注册条目。
/// </remarks>
internal static class ClaimValueParser
{
    /// <summary>
    /// 非枚举类型的解析策略表；键为「目标非可空类型」，值为「输入已 Trim 的文本 → 装箱结果或 <see langword="null"/>」。
    /// </summary>
    private static readonly FrozenDictionary<Type, Func<string, object?>> KnownParsers = BuildKnownParsers();

    /// <summary>
    /// 将原始文本解析为 <typeparamref name="T"/>；失败返回 <c>default</c>，不抛异常。
    /// </summary>
    /// <typeparam name="T">目标类型；可为可空值类型（如 <c>int?</c>）。</typeparam>
    /// <param name="raw">声明原始字符串。</param>
    /// <returns>解析结果或默认值。</returns>
    public static T? Parse<T>(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return default;
        }

        var trimmed = raw.Trim();
        var target = typeof(T);
        var underlying = Nullable.GetUnderlyingType(target) ?? target;

        try
        {
            var boxed = ParseToObject(underlying, trimmed);
            if (boxed is null)
            {
                return default;
            }

            if (Nullable.GetUnderlyingType(target) is not null)
            {
                var nullableInstance = Activator.CreateInstance(target, boxed);
                return nullableInstance is null ? default : (T)nullableInstance;
            }

            return (T)boxed;
        }
        catch
        {
            return default;
        }
    }

    private static object? ParseToObject(Type underlying, string trimmed)
    {
        if (KnownParsers.TryGetValue(underlying, out var parse))
        {
            return parse(trimmed);
        }

        if (underlying.IsEnum && Enum.TryParse(underlying, trimmed, ignoreCase: true, out var enumValue))
        {
            return enumValue;
        }

        return null;
    }

    private static FrozenDictionary<Type, Func<string, object?>> BuildKnownParsers()
    {
        var d = new Dictionary<Type, Func<string, object?>>(capacity: 16)
        {
            [typeof(string)] = static s => s,
            [typeof(bool)] = static s => bool.TryParse(s, out var v) ? v : null,
            [typeof(byte)] = static s => byte.TryParse(s, NumberStyles.Integer, CultureInfo.InvariantCulture, out var v) ? v : null,
            [typeof(short)] = static s => short.TryParse(s, NumberStyles.Integer, CultureInfo.InvariantCulture, out var v) ? v : null,
            [typeof(int)] = static s => int.TryParse(s, NumberStyles.Integer, CultureInfo.InvariantCulture, out var v) ? v : null,
            [typeof(long)] = static s => long.TryParse(s, NumberStyles.Integer, CultureInfo.InvariantCulture, out var v) ? v : null,
            [typeof(decimal)] = static s => decimal.TryParse(s, NumberStyles.Number, CultureInfo.InvariantCulture, out var v) ? v : null,
            [typeof(double)] = static s =>
                double.TryParse(s, NumberStyles.Float | NumberStyles.AllowThousands, CultureInfo.InvariantCulture, out var v) ? v : null,
            [typeof(float)] = static s =>
                float.TryParse(s, NumberStyles.Float | NumberStyles.AllowThousands, CultureInfo.InvariantCulture, out var v) ? v : null,
            [typeof(Guid)] = static s => Guid.TryParse(s, out var v) ? v : null,
            [typeof(DateTime)] = static s =>
                DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var v) ? v : null,
            [typeof(DateTimeOffset)] = static s =>
                DateTimeOffset.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var v) ? v : null,
        };

        return d.ToFrozenDictionary();
    }
}

