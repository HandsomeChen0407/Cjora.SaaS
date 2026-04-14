using System.Text.Json;

namespace Cjora.SaaS.Sys.Permissions;

/// <summary>
/// 将权限码集合与 JSON 数组字符串互转（用于 <see cref="Entities.SysRole.PermissionCodesJson"/>）。
/// </summary>
public static class PermissionCodesSerializer
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    /// <summary>
    /// 从 JSON 数组字符串解析权限码；无效或空则返回空序列。
    /// </summary>
    /// <param name="json">JSON 数组或 <see langword="null"/>。</param>
    /// <returns>去重、去空白后的权限码列表。</returns>
    public static IReadOnlyList<string> Parse(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return Array.Empty<string>();
        }

        try
        {
            var list = JsonSerializer.Deserialize<List<string>>(json, JsonOptions);
            if (list is null || list.Count == 0)
            {
                return Array.Empty<string>();
            }

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
    /// <param name="codes">权限码集合。</param>
    /// <returns>JSON 文本。</returns>
    public static string Serialize(IEnumerable<string> codes)
    {
        ArgumentNullException.ThrowIfNull(codes);
        var list = codes
            .Where(static s => !string.IsNullOrWhiteSpace(s))
            .Select(static s => s.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToArray();
        return JsonSerializer.Serialize(list, JsonOptions);
    }
}
