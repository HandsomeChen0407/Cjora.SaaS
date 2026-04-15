namespace Cjora.SaaS.Core.DataProtection.Attributes;

/// <summary>
/// 标记字符串列在持久化时应由 SqlSugar AOP 进行透明加密（需开启 <see cref="Models.DataProtectionOptions.EnableEncryption"/>）。
/// </summary>
/// <remarks>
/// <para>
/// 加密列<strong>不得</strong>直接用于 SQL 模糊查询或排序；等值查询应使用 <see cref="HashFieldAttribute"/> 声明的摘要列。
/// </para>
/// <para>
/// 元数据在进程内按 <see cref="T:System.Type"/> 缓存，避免每次写入反射扫描。
/// </para>
/// </remarks>
[AttributeUsage(AttributeTargets.Property)]
public sealed class EncryptedAttribute : Attribute
{
}
