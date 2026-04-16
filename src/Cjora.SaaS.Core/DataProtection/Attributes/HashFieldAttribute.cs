namespace Cjora.SaaS.Core.DataProtection.Attributes;

/// <summary>
/// 与 <see cref="EncryptedAttribute"/> 联用，指定存储 SHA-256 摘要的<strong>同类型</strong>属性名，用于等值查询。
/// </summary>
/// <remarks>
/// 摘要算法与规范化规则由 <see cref="Abstractions.IHashService"/> 实现；默认实现为 UTF-8 字节上的 SHA-256 十六进制小写字符串。
/// </remarks>
[AttributeUsage(AttributeTargets.Property)]
public sealed class HashFieldAttribute : Attribute
{
    /// <summary>
    /// 初始化 <see cref="HashFieldAttribute"/>。
    /// </summary>
    /// <param name="hashPropertyName">哈希列属性名，如 <c>nameof(User.PhoneHash)</c>。</param>
    public HashFieldAttribute(string hashPropertyName)
    {
        HashPropertyName = hashPropertyName;
    }

    /// <summary>哈希列在实体上的属性名。</summary>
    public string HashPropertyName { get; }
}
