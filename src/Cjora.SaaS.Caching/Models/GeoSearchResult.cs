namespace Cjora.SaaS.Caching.Models;

/// <summary>Geo 半径搜索命中结果。</summary>
/// <param name="Member">成员标识。</param>
/// <param name="DistanceMeters">距离（米），可能为 <c>null</c>。</param>
public sealed record GeoSearchResult(string Member, double? DistanceMeters);
