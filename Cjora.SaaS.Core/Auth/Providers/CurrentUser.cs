using System.Collections.ObjectModel;
using System.Security.Claims;
using Cjora.SaaS.Core.Auth.Abstractions;
using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Microsoft.AspNetCore.Http;

namespace Cjora.SaaS.Core.Auth.Providers;

/// <summary>
/// 基于 HTTP <see cref="ClaimsPrincipal"/> 与 <see cref="ITenantProvider"/> 的 <see cref="ICurrentUser"/> 实现。
/// </summary>
/// <remarks>
/// <para>
/// <see cref="UserId"/> 在单次 Scoped 生命周期内只解析一次并缓存，避免同一请求中多次遍历声明。
/// </para>
/// <para>
/// 声明查询：首次访问时一次性快照 <see cref="ClaimsPrincipal.Claims"/>，并构建忽略大小写的 <see cref="_insensitiveFirstValue"/> 等结构，
/// 后续 <see cref="FindClaim(string)"/> 为 O(1) 字典查找（配合精确类型首条非空规则），避免每次线性扫描。
/// </para>
/// <para>
/// 调试查看全部声明请使用 <see cref="Claims"/>（未放在 <see cref="ICurrentUser"/> 上，以免非 Http 实现被迫提供快照；需要时将实例视为 <see cref="CurrentUser"/> 访问）。
/// </para>
/// </remarks>
public sealed class CurrentUser : ICurrentUser
{
    private static readonly IReadOnlyDictionary<string, IReadOnlyList<string>> EmptyClaimsByType =
        new ReadOnlyDictionary<string, IReadOnlyList<string>>(
            new Dictionary<string, IReadOnlyList<string>>(StringComparer.OrdinalIgnoreCase));

    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ITenantProvider _tenantProvider;

    private long? _userIdCache;
    private bool _claimsCacheBuilt;
    private IReadOnlyList<(string Type, string Value)> _orderedClaims = Array.Empty<(string, string)>();
    private Dictionary<string, int> _firstExactIndex = new(StringComparer.Ordinal);
    private Dictionary<string, string> _insensitiveFirstValue = new(StringComparer.OrdinalIgnoreCase);
    private IReadOnlyDictionary<string, IReadOnlyList<string>>? _claimsByTypeView;

    public CurrentUser(IHttpContextAccessor httpContextAccessor, ITenantProvider tenantProvider)
    {
        _httpContextAccessor = httpContextAccessor;
        _tenantProvider = tenantProvider;
    }

    public bool IsAuthenticated => _httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated ?? false;

    public long UserId
    {
        get
        {
            if (!_userIdCache.HasValue)
            {
                _userIdCache = ResolveUserIdFromClaims();
            }

            return _userIdCache.Value;
        }
    }

    public string TenantId => _tenantProvider.GetTenantId();

    public IReadOnlyDictionary<string, IReadOnlyList<string>> Claims
    {
        get
        {
            EnsureClaimsCache();
            return _claimsByTypeView ??= BuildClaimsByTypeView();
        }
    }

    public string? FindClaim(string claimType)
    {
        if (string.IsNullOrWhiteSpace(claimType))
        {
            return null;
        }

        EnsureClaimsCache();

        var principal = _httpContextAccessor.HttpContext?.User;
        if (principal is null)
        {
            return null;
        }

        if (_firstExactIndex.TryGetValue(claimType, out var exactIndex))
        {
            var exactValue = _orderedClaims[exactIndex].Value;
            if (!string.IsNullOrEmpty(exactValue))
            {
                return exactValue;
            }
        }

        if (_insensitiveFirstValue.TryGetValue(claimType, out var insensitiveRaw))
        {
            return string.IsNullOrEmpty(insensitiveRaw) ? null : insensitiveRaw;
        }

        return null;
    }

    public T? FindClaim<T>(string claimType)
    {
        var raw = FindClaim(claimType);
        return ClaimValueParser.Parse<T>(raw);
    }

    private void EnsureClaimsCache()
    {
        if (_claimsCacheBuilt)
        {
            return;
        }

        _claimsCacheBuilt = true;

        var principal = _httpContextAccessor.HttpContext?.User;
        if (principal is null)
        {
            _orderedClaims = Array.Empty<(string, string)>();
            _firstExactIndex = new Dictionary<string, int>(StringComparer.Ordinal);
            _insensitiveFirstValue = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            return;
        }

        var list = new List<(string Type, string Value)>();
        foreach (var c in principal.Claims)
        {
            list.Add((c.Type, c.Value ?? string.Empty));
        }

        _orderedClaims = list;
        var exact = new Dictionary<string, int>(StringComparer.Ordinal);
        var insVal = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        for (var i = 0; i < list.Count; i++)
        {
            var (type, value) = list[i];
            if (!exact.ContainsKey(type))
            {
                exact[type] = i;
            }

            if (!insVal.ContainsKey(type))
            {
                insVal[type] = value;
            }
        }

        _firstExactIndex = exact;
        _insensitiveFirstValue = insVal;
    }

    private IReadOnlyDictionary<string, IReadOnlyList<string>> BuildClaimsByTypeView()
    {
        if (_orderedClaims.Count == 0)
        {
            return EmptyClaimsByType;
        }

        var mutable = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);
        foreach (var (type, value) in _orderedClaims)
        {
            if (!mutable.TryGetValue(type, out var bucket))
            {
                bucket = [];
                mutable[type] = bucket;
            }

            bucket.Add(value);
        }

        var frozen = new Dictionary<string, IReadOnlyList<string>>(mutable.Count, StringComparer.OrdinalIgnoreCase);
        foreach (var kvp in mutable)
        {
            frozen[kvp.Key] = kvp.Value.ToArray();
        }

        return new ReadOnlyDictionary<string, IReadOnlyList<string>>(frozen);
    }

    private long ResolveUserIdFromClaims()
    {
        var principal = _httpContextAccessor.HttpContext?.User;
        if (principal?.Identity?.IsAuthenticated != true)
        {
            return 0;
        }

        var claim = principal.FindFirst(ClaimTypes.NameIdentifier) ?? principal.FindFirst("sub");
        if (claim is null || string.IsNullOrWhiteSpace(claim.Value))
        {
            return 0;
        }

        if (!long.TryParse(claim.Value, System.Globalization.NumberStyles.Integer, System.Globalization.CultureInfo.InvariantCulture, out var userId))
        {
            return 0;
        }

        return userId;
    }
}

