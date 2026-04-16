using System.Security.Cryptography;
using System.Text;
using Cjora.SaaS.Core.DataProtection.Abstractions;
using Cjora.SaaS.Core.DataProtection.Models;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Core.DataProtection.Providers;

/// <summary>
/// 使用 AES-256-CBC + PKCS7 的字段加解密器。
/// </summary>
/// <remarks>
/// <para>
/// <b>// CHANGED</b>：新密文格式为 <c>CJ1:</c> + Base64(随机 16 字节 IV || 密文)；解密优先按新格式拆分 IV，失败则回退旧格式（整段为密文 + 配置固定 IV）。
/// </para>
/// <para><b>// COMPAT</b>：旧库数据可继续解密。</para>
/// </remarks>
public sealed class AesDataEncryptor : IDataEncryptor
{
    /// <summary>与 <see cref="IsCiphertext"/> 一致的前缀。</summary>
    public const string CiphertextPrefix = "CJ1:";

    private const int IvLength = 16;

    private readonly IOptionsMonitor<DataProtectionOptions> _optionsMonitor;
    private readonly object _materialGate = new();
    private byte[]? _key;
    private byte[]? _legacyIv;

    /// <summary>初始化 <see cref="AesDataEncryptor"/>。</summary>
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

        EnsureKey();

        var iv = RandomNumberGenerator.GetBytes(IvLength);
        var plainBytes = Encoding.UTF8.GetBytes(plaintext);
        var cipher = EncryptCore(_key!, iv, plainBytes);

        var payload = new byte[IvLength + cipher.Length];
        Buffer.BlockCopy(iv, 0, payload, 0, IvLength);
        Buffer.BlockCopy(cipher, 0, payload, IvLength, cipher.Length);

        return CiphertextPrefix + Convert.ToBase64String(payload);
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

        EnsureKey();
        var b64 = ciphertext[CiphertextPrefix.Length..];
        var all = Convert.FromBase64String(b64);

        if (TryDecryptRandomIvPayload(all, _key!, out var plain))
        {
            return plain;
        }

        // COMPAT: 旧数据 — 整段为密文，使用配置 IV
        EnsureLegacyIv();
        return Encoding.UTF8.GetString(DecryptCore(_key!, _legacyIv!, all));
    }

    /// <summary>判断是否为带前缀的可解密负载。</summary>
    public static bool IsCiphertext(string? value)
        => !string.IsNullOrEmpty(value) && value.StartsWith(CiphertextPrefix, StringComparison.Ordinal);

    private static bool TryDecryptRandomIvPayload(byte[] all, byte[] key, out string plaintext)
    {
        plaintext = string.Empty;
        if (all.Length < IvLength + 16 || (all.Length - IvLength) % 16 != 0)
        {
            return false;
        }

        try
        {
            var iv = new byte[IvLength];
            Buffer.BlockCopy(all, 0, iv, 0, IvLength);
            var cipherLen = all.Length - IvLength;
            var cipher = new byte[cipherLen];
            Buffer.BlockCopy(all, IvLength, cipher, 0, cipherLen);
            var plain = DecryptCore(key, iv, cipher);
            plaintext = Encoding.UTF8.GetString(plain);
            return true;
        }
        catch (CryptographicException)
        {
            return false;
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private static byte[] EncryptCore(byte[] key, byte[] iv, byte[] plainBytes)
    {
        using var aes = Aes.Create();
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;
        aes.Key = key;
        aes.IV = iv;
        using var enc = aes.CreateEncryptor();
        return enc.TransformFinalBlock(plainBytes, 0, plainBytes.Length);
    }

    private static byte[] DecryptCore(byte[] key, byte[] iv, byte[] cipherBytes)
    {
        using var aes = Aes.Create();
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;
        aes.Key = key;
        aes.IV = iv;
        using var dec = aes.CreateDecryptor();
        return dec.TransformFinalBlock(cipherBytes, 0, cipherBytes.Length);
    }

    private void EnsureKey()
    {
        if (_key is not null)
        {
            return;
        }

        lock (_materialGate)
        {
            if (_key is not null)
            {
                return;
            }

            var o = _optionsMonitor.CurrentValue;
            if (string.IsNullOrWhiteSpace(o.AesKeyBase64))
            {
                throw new InvalidOperationException("启用字段加密时必须配置 DataProtectionOptions.AesKeyBase64（32 字节的 Base64）。");
            }

            _key = Convert.FromBase64String(o.AesKeyBase64.Trim());
            if (_key.Length != 32)
            {
                throw new InvalidOperationException("AesKeyBase64 解码后长度必须为 32 字节（AES-256）。");
            }
        }
    }

    private void EnsureLegacyIv()
    {
        if (_legacyIv is not null)
        {
            return;
        }

        lock (_materialGate)
        {
            if (_legacyIv is not null)
            {
                return;
            }

            var o = _optionsMonitor.CurrentValue;
            if (string.IsNullOrWhiteSpace(o.AesIvBase64))
            {
                throw new InvalidOperationException("解密旧版（固定 IV）密文需要配置 DataProtectionOptions.AesIvBase64（16 字节 Base64）。");
            }

            _legacyIv = Convert.FromBase64String(o.AesIvBase64.Trim());
            if (_legacyIv.Length != 16)
            {
                throw new InvalidOperationException("AesIvBase64 解码后长度必须为 16 字节。");
            }
        }
    }
}
