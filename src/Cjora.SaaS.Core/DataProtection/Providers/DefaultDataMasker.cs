using Cjora.SaaS.Core.DataProtection.Abstractions;

namespace Cjora.SaaS.Core.DataProtection.Providers;

/// <summary>
/// 面向展示层的轻量脱敏实现；不含外呼与配置依赖，便于单元测试与默认注册。
/// </summary>
public sealed class DefaultDataMasker : IDataMasker
{
    /// <inheritdoc />
    public string MaskPhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
        {
            return string.Empty;
        }

        var s = phone.Trim();
        if (s.Length < 7)
        {
            return new string('*', s.Length);
        }

        return string.Concat(s.AsSpan(0, 3), "****", s.AsSpan(s.Length - 4, 4));
    }

    /// <inheritdoc />
    public string MaskIdCard(string? idCard)
    {
        if (string.IsNullOrWhiteSpace(idCard))
        {
            return string.Empty;
        }

        var s = idCard.Trim();
        if (s.Length < 10)
        {
            return new string('*', s.Length);
        }

        return string.Concat(s.AsSpan(0, 6), "********", s.AsSpan(s.Length - 4, 4));
    }

    /// <inheritdoc />
    public string MaskEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return string.Empty;
        }

        var s = email.Trim();
        var at = s.IndexOf('@');
        if (at <= 0 || at == s.Length - 1)
        {
            return "***";
        }

        var local = s[..at];
        var domain = s[(at + 1)..];
        var first = local.Length > 0 ? local[0] : '*';
        return string.Concat(first, "***@", domain);
    }
}
