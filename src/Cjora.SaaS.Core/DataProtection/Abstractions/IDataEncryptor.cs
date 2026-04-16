namespace Cjora.SaaS.Core.DataProtection.Abstractions;

/// <summary>
/// 对称字段加解密抽象，默认由 <see cref="Providers.AesDataEncryptor"/> 实现（AES-CBC + PKCS7）。
/// </summary>
/// <remarks>
/// 设计为无状态或线程安全实现，供 SqlSugar AOP 在高并发下安全复用。
/// </remarks>
public interface IDataEncryptor
{
    /// <summary>将明文加密为可入库的密文字符串（含版本前缀，便于鉴别与解密）。</summary>
    string Encrypt(string plaintext);

    /// <summary>将 <see cref="Encrypt"/> 产出的密文还原为明文；非法输入抛出可读异常。</summary>
    string Decrypt(string ciphertext);
}
