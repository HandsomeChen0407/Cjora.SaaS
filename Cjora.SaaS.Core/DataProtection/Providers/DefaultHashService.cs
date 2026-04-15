using System.Security.Cryptography;
using System.Text;
using Cjora.SaaS.Core.DataProtection.Abstractions;

namespace Cjora.SaaS.Core.DataProtection.Providers;

/// <summary>
/// 基于 SHA-256 的确定性摘要服务，供等值查询列与写入侧 AOP 使用。
/// </summary>
/// <remarks>
/// 无状态、线程安全；与加密算法解耦，便于单独轮换哈希算法而不影响已落库密文。
/// </remarks>
public sealed class DefaultHashService : IHashService
{
    /// <inheritdoc />
    public string ComputeHash(string? input)
    {
        var normalized = input?.Trim() ?? string.Empty;
        if (normalized.Length == 0)
        {
            return string.Empty;
        }

        var bytes = Encoding.UTF8.GetBytes(normalized);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
