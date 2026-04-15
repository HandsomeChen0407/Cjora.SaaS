using System.Security.Cryptography;
using System.Text;
using Cjora.SaaS.Core.DataProtection.Abstractions;
using Cjora.SaaS.Core.DataProtection.Models;
using Microsoft.Extensions.Options;

namespace Cjora.SaaS.Core.DataProtection.Providers;

/// <summary>
/// 基于 SHA-256 的确定性摘要服务，供等值查询列与写入侧 AOP 使用。
/// </summary>
/// <remarks>
/// <b>// CHANGED</b>：支持可选 <see cref="DataProtectionOptions.HashSalt"/>；线程安全（无共享可变状态）。
/// </remarks>
public sealed class DefaultHashService : IHashService
{
    private readonly IOptionsMonitor<DataProtectionOptions> _optionsMonitor;

    /// <summary>初始化 <see cref="DefaultHashService"/>。</summary>
    public DefaultHashService(IOptionsMonitor<DataProtectionOptions> optionsMonitor)
    {
        _optionsMonitor = optionsMonitor;
    }

    /// <inheritdoc />
    public string ComputeHash(string? input)
    {
        var normalized = input?.Trim() ?? string.Empty;
        if (normalized.Length == 0)
        {
            return string.Empty;
        }

        // COMPAT: HashSalt 为空时与历史字节序列一致
        var salt = _optionsMonitor.CurrentValue.HashSalt ?? string.Empty;
        var bytes = Encoding.UTF8.GetBytes(normalized + salt);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
