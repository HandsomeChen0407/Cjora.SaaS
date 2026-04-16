using Newtonsoft.Json;

namespace Cjora.SaaS.Sys.Permissions;

/// <summary>
/// 将权限码集合与 JSON 数组字符串互转（用于 <see cref="Entities.SysRole.PermissionCodesJson"/>）。
/// </summary>
public static class PermissionCodesSerializer
{
    /// <summary>
    /// 从 JSON 数组字符串解析权限码；无效或空则返回空序列。
    /// </summary>
    public static IReadOnlyList<string> Parse(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return Array.Empty<string>();

        try
        {
            var list = JsonConvert.DeserializeObject<List<string>>(json);
            if (list is null || list.Count == 0)
                return Array.Empty<string>();

            return list
                .Where(static s => !string.IsNullOrWhiteSpace(s))
                .Select(static s => s.Trim())
                .Distinct(StringComparer.Ordinal)
                .ToArray();
        }
        catch (JsonException)
        {
            return Array.Empty<string>();
        }
    }

    /// <summary>
    /// 将权限码序列化为 JSON 数组字符串。
    /// </summary>
    public static string Serialize(IEnumerable<string> codes)
    {
        ArgumentNullException.ThrowIfNull(codes);
        var list = codes
            .Where(static s => !string.IsNullOrWhiteSpace(s))
            .Select(static s => s.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToArray();
        return JsonConvert.SerializeObject(list);
    }
}
