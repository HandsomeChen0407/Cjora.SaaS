using System.Collections.Concurrent;
using System.Reflection;
using Cjora.SaaS.Core.DataProtection.Attributes;

namespace Cjora.SaaS.Core.DataProtection.Internals;

/// <summary>
/// 描述单个需加密（及可选哈希）的字符串属性。
/// </summary>
internal sealed class EncryptedFieldDescriptor
{
    internal required string PropertyName { get; init; }

    internal required PropertyInfo Property { get; init; }

    internal PropertyInfo? HashProperty { get; init; }
}

/// <summary>
/// 进程内缓存实体类型上 <see cref="EncryptedAttribute"/> / <see cref="HashFieldAttribute"/> 元数据，避免 AOP 热路径反射。
/// </summary>
internal static class EntityFieldEncryptionRegistry
{
    private static readonly ConcurrentDictionary<Type, IReadOnlyList<EncryptedFieldDescriptor>> Cache = new();

    /// <summary>
    /// 获取某实体类型的加密字段描述列表（仅字符串属性）；无标记时返回空列表。
    /// </summary>
    internal static IReadOnlyList<EncryptedFieldDescriptor> GetDescriptors(Type entityType)
    {
        return Cache.GetOrAdd(entityType, Build);
    }

    private static IReadOnlyList<EncryptedFieldDescriptor> Build(Type type)
    {
        var list = new List<EncryptedFieldDescriptor>();
        foreach (var p in type.GetProperties(BindingFlags.Instance | BindingFlags.Public))
        {
            if (p.GetCustomAttribute<EncryptedAttribute>() is null)
            {
                continue;
            }

            if (p.PropertyType != typeof(string))
            {
                continue;
            }

            PropertyInfo? hashProp = null;
            var hf = p.GetCustomAttribute<HashFieldAttribute>();
            if (hf is not null && !string.IsNullOrWhiteSpace(hf.HashPropertyName))
            {
                hashProp = type.GetProperty(
                    hf.HashPropertyName,
                    BindingFlags.Instance | BindingFlags.Public | BindingFlags.IgnoreCase);
            }

            list.Add(
                new EncryptedFieldDescriptor
                {
                    PropertyName = p.Name,
                    Property = p,
                    HashProperty = hashProp
                });
        }

        return list;
    }
}
