using System.Security.Cryptography;
using System.Text;
using Cjora.SaaS.Core.DataProtection.Abstractions;
using Cjora.SaaS.Core.DataProtection.Models;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Core.DataProtection.Providers;

/// <summary>
/// 使用 AES-256-CBC + PKCS7 的字段加解密器；密钥与 IV 来自 <see cref="DataProtectionOptions"/>。
/// </summary>
/// <remarks>
/// <para>
/// 实现为线程安全：每次操作使用 <see cref="Aes.Create()"/> 独立实例，避免共享可变 <see cref="Aes"/> 状态。
/// </para>
/// <para>
/// 密文格式：<c>CJ1:</c> + Base64(密文)，其中 CBC 的 IV 固定取自配置（与密钥一并管理）。
/// 生产环境应通过密钥轮换与访问审计降低固定 IV 下相同明文产生相同密文的可观测风险；更高安全模型可替换为带随机 IV 前缀的自定义 <see cref="IDataEncryptor"/>。
/// </para>
/// </remarks>
public sealed class AesDataEncryptor : IDataEncryptor
{
    /// <summary>与 <see cref="IsCiphertext"/> 一致的前缀，用于识别可解密负载。</summary>
    public const string CiphertextPrefix = "CJ1:";

    private readonly IOptionsMonitor<DataProtectionOptions> _optionsMonitor;
    private readonly object _keyInitGate = new();
    private byte[]? _key;
    private byte[]? _iv;

    /// <summary>
    /// 初始化 <see cref="AesDataEncryptor"/>。
    /// </summary>
    public AesDataEncryptor(IOptionsMonitor<DataProtectionOptions> optionsMonitor)
    {
        _optionsMonitor = optionsMonitor;
    }

    /// <inheritdoc />
    public string Encrypt(string plaintext)
    {
        if (string.IsNullOrEmpty(plaintext))
        {
            return plaintext;
        }

        EnsureMaterial();

        using var aes = Aes.Create();
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;
        aes.Key = _key!;
        aes.IV = _iv!;
        using var enc = aes.CreateEncryptor();
        var plainBytes = Encoding.UTF8.GetBytes(plaintext);
        var cipher = enc.TransformFinalBlock(plainBytes, 0, plainBytes.Length);
        return CiphertextPrefix + Convert.ToBase64String(cipher);
    }

    /// <inheritdoc />
    public string Decrypt(string ciphertext)
    {
        if (string.IsNullOrEmpty(ciphertext))
        {
            return ciphertext;
        }

        if (!IsCiphertext(ciphertext))
        {
            return ciphertext;
        }

        EnsureMaterial();

        var b64 = ciphertext[CiphertextPrefix.Length..];
        var cipherBytes = Convert.FromBase64String(b64);

        using var aes = Aes.Create();
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;
        aes.Key = _key!;
        aes.IV = _iv!;
        using var dec = aes.CreateDecryptor();
        var plain = dec.TransformFinalBlock(cipherBytes, 0, cipherBytes.Length);
        return Encoding.UTF8.GetString(plain);
    }

    /// <summary>判断字符串是否为当前实现产出的密文前缀格式。</summary>
    public static bool IsCiphertext(string? value)
        => !string.IsNullOrEmpty(value) && value.StartsWith(CiphertextPrefix, StringComparison.Ordinal);

    private void EnsureMaterial()
    {
        if (_key is not null && _iv is not null)
        {
            return;
        }

        lock (_keyInitGate)
        {
            if (_key is not null && _iv is not null)
            {
                return;
            }

            var o = _optionsMonitor.CurrentValue;
            if (string.IsNullOrWhiteSpace(o.AesKeyBase64) || string.IsNullOrWhiteSpace(o.AesIvBase64))
            {
                throw new InvalidOperationException(
                    "启用字段加密时必须配置 DataProtectionOptions.AesKeyBase64 与 AesIvBase64（分别为 32 字节与 16 字节的 Base64）。");
            }

            _key = Convert.FromBase64String(o.AesKeyBase64.Trim());
            _iv = Convert.FromBase64String(o.AesIvBase64.Trim());
            if (_key.Length != 32)
            {
                throw new InvalidOperationException("AesKeyBase64 解码后长度必须为 32 字节（AES-256）。");
            }

            if (_iv.Length != 16)
            {
                throw new InvalidOperationException("AesIvBase64 解码后长度必须为 16 字节（AES CBC 块大小）。");
            }
        }
    }
}
