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
    private readonly string _salt;

    /// <summary>初始化 <see cref="DefaultHashService"/>。</summary>
    public DefaultHashService(IOptions<DataProtectionOptions> optionsAccessor)
    {
        var options = optionsAccessor.Value;
        if (options.EnableHash && string.IsNullOrWhiteSpace(options.HashSalt))
        {
            throw new InvalidOperationException($"{nameof(DataProtectionOptions)}.{nameof(DataProtectionOptions.HashSalt)} 必须配置且不可为空白（EnableHash=true）。");
        }

        // 启动后固定（禁止动态变更）：只读取一次并缓存为只读字段。
        _salt = options.HashSalt ?? string.Empty;
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
        var bytes = Encoding.UTF8.GetBytes(normalized + _salt);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
