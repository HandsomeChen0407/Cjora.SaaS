namespace Cjora.SaaS.Core.DataProtection.Abstractions;

/// <summary>
/// 为加密字段提供<strong>确定性</strong>摘要，用于等值查询列（不可逆，不可还原明文）。
/// </summary>
/// <remarks>
/// 与 <see cref="Attributes.HashFieldAttribute"/> 配合：写入时 AOP 自动填充摘要，查询时使用
/// <c>repo.Get(x =&gt; x.PhoneHash == _hashService.ComputeHash(input))</c>。
/// </remarks>
public interface IHashService
{
    /// <summary>
    /// 对输入做规范化（修剪）后计算 SHA-256，返回十六进制小写字符串。
    /// </summary>
    /// <param name="input">明文或待哈希字符串；<see langword="null"/> 视为空。</param>
    string ComputeHash(string? input);
}
