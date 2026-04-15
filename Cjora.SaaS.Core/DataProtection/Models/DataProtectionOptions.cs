namespace Cjora.SaaS.Core.DataProtection.Models;

/// <summary>
/// 字段级保护（加密 / 哈希 / 查询后解密 / 脱敏注册）的全局开关与密钥材料。
/// </summary>
/// <remarks>
/// <para>
/// 所有布尔开关默认 <see langword="false"/>，宿主不显式配置时行为与未引入 DataProtection 模块前一致，满足「默认关闭、向后兼容」。
/// </para>
/// <para>
/// <see cref="AesKeyBase64"/> / <see cref="AesIvBase64"/> 应在密钥管理（Azure Key Vault、K8s Secret 等）中注入，避免写入源码仓库。
/// AES-256 需要 32 字节密钥与 16 字节 IV（均使用 Base64 编码配置）。
/// </para>
/// </remarks>
public sealed class DataProtectionOptions
{
    /// <summary>
    /// 是否在写入路径对标记 <see cref="Attributes.EncryptedAttribute"/> 的字符串列做 AES 加密。
    /// </summary>
    public bool EnableEncryption { get; set; }

    /// <summary>
    /// 是否在实体查询完成后尝试解密 <see cref="Attributes.EncryptedAttribute"/> 列（依赖 SqlSugar <c>DataExecuted</c>）。
    /// </summary>
    public bool EnableAutoDecryption { get; set; }

    /// <summary>
    /// 是否在写入路径为 <see cref="Attributes.HashFieldAttribute"/> 指向的列写入 SHA-256 摘要（等值查询）。
    /// </summary>
    public bool EnableHash { get; set; }

    /// <summary>
    /// 是否注册 <see cref="Abstractions.IDataMasker"/> 默认实现（脱敏仅在 API 层显式调用，本开关仅影响 DI 注册策略时可被宿主使用）。
    /// </summary>
    public bool EnableMasking { get; set; }

    /// <summary>AES-256 密钥（32 字节）的 Base64。</summary>
    public string? AesKeyBase64 { get; set; }

    /// <summary>AES CBC 初始化向量（16 字节）的 Base64。</summary>
    public string? AesIvBase64 { get; set; }
}
