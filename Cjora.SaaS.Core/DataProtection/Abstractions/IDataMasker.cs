namespace Cjora.SaaS.Core.DataProtection.Abstractions;

/// <summary>
/// 面向 API 响应的脱敏工具；<strong>不在</strong>仓储或 ORM 层自动调用，由控制器/DTO 映射显式使用。
/// </summary>
/// <remarks>
/// 避免在持久化路径隐式脱敏导致审计/对账困难；与 <see cref="Models.DataProtectionOptions.EnableMasking"/> 仅作注册协同说明。
/// </remarks>
public interface IDataMasker
{
    /// <summary>中国大陆手机号常见掩码：保留前 3 后 4。</summary>
    string MaskPhone(string? phone);

    /// <summary>身份证号常见掩码：保留前 6 后 4。</summary>
    string MaskIdCard(string? idCard);

    /// <summary>邮箱掩码：保留首字符与域名。</summary>
    string MaskEmail(string? email);
}
