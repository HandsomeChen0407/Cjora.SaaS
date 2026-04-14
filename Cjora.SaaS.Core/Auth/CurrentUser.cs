using System.Collections.ObjectModel;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Cjora.SaaS.Core.MultiTenancy;

namespace Cjora.SaaS.Core.Auth;

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
    /// <summary>
    /// 空声明分组单例，避免调试路径重复分配只读字典。
    /// </summary>
    private static readonly IReadOnlyDictionary<string, IReadOnlyList<string>> EmptyClaimsByType =
        new ReadOnlyDictionary<string, IReadOnlyList<string>>(
            new Dictionary<string, IReadOnlyList<string>>(StringComparer.OrdinalIgnoreCase));

    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ITenantProvider _tenantProvider;

    /// <summary>
    /// <see langword="null"/> 表示尚未解析；解析后写入结果（含合法的 <c>0</c>）。
    /// </summary>
    private long? _userIdCache;

    /// <summary>
    /// 是否已完成声明缓存构建（含「无主体 / 无声明」的空快照）。
    /// </summary>
    private bool _claimsCacheBuilt;

    /// <summary>
    /// 当前主体声明的有序快照（与枚举顺序一致），用于「精确类型」首条判断及取值。
    /// </summary>
    private IReadOnlyList<(string Type, string Value)> _orderedClaims = Array.Empty<(string, string)>();

    /// <summary>
    /// 精确匹配（<see cref="StringComparison.Ordinal"/>）的声明类型 → 该类型在快照中<strong>首次出现</strong>的下标。
    /// </summary>
    private Dictionary<string, int> _firstExactIndex = new(StringComparer.Ordinal);

    /// <summary>
    /// 忽略大小写（<see cref="StringComparer.OrdinalIgnoreCase"/>）的声明类型键 → 在整份快照中<strong>首次出现</strong>的声明值。
    /// 用于复现原实现中「从集合头开始首个忽略大小写匹配」的第二阶段；键使用首次见到该族时的 <c>Type</c> 字符串，查找时用忽略大小写比较。
    /// </summary>
    private Dictionary<string, string> _insensitiveFirstValue = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// 懒构建的「类型 → 全部值」只读视图；仅在访问 <see cref="Claims"/> 时分配，与 <see cref="FindClaim(string)"/> 热路径无关。
    /// </summary>
    private IReadOnlyDictionary<string, IReadOnlyList<string>>? _claimsByTypeView;

    /// <summary>
    /// 初始化 <see cref="CurrentUser"/>。
    /// </summary>
    /// <param name="httpContextAccessor">HTTP 上下文访问器。</param>
    /// <param name="tenantProvider">租户提供者。</param>
    public CurrentUser(IHttpContextAccessor httpContextAccessor, ITenantProvider tenantProvider)
    {
        _httpContextAccessor = httpContextAccessor;
        _tenantProvider = tenantProvider;
    }

    /// <inheritdoc />
    public bool IsAuthenticated => _httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated ?? false;

    /// <inheritdoc />
    public long UserId
    {
        get
        {
            // 同一 Scoped 实例内复用解析结果，降低热点路径上 Claims 扫描成本。
            if (!_userIdCache.HasValue)
            {
                _userIdCache = ResolveUserIdFromClaims();
            }

            return _userIdCache.Value;
        }
    }

    /// <inheritdoc />
    public string TenantId => _tenantProvider.GetTenantId();

    /// <summary>
    /// 按声明类型分组的只读视图，便于调试或日志输出；同一类型多条声明时，列表顺序与主体中声明出现顺序一致。
    /// </summary>
    /// <remarks>
    /// <para>
    /// 键比较使用 <see cref="StringComparer.OrdinalIgnoreCase"/>；键字符串为快照中该族<strong>首次出现</strong>时的 <c>Type</c> 原文。
    /// </para>
    /// <para>
    /// 数据来自与 <see cref="FindClaim(string)"/> 相同的单次快照（<see cref="EnsureClaimsCache"/>），不在此属性首次访问前额外枚举 <see cref="ClaimsPrincipal"/>。
    /// </para>
    /// </remarks>
    public IReadOnlyDictionary<string, IReadOnlyList<string>> Claims
    {
        get
        {
            EnsureClaimsCache();
            return _claimsByTypeView ??= BuildClaimsByTypeView();
        }
    }

    /// <inheritdoc />
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

        // 阶段一：与 principal.FindFirst(claimType) 一致——「精确类型」在集合中的第一次出现；仅当其值非空时直接返回。
        if (_firstExactIndex.TryGetValue(claimType, out var exactIndex))
        {
            var exactValue = _orderedClaims[exactIndex].Value;
            if (!string.IsNullOrEmpty(exactValue))
            {
                return exactValue;
            }
        }

        // 阶段二：从集合头起第一个忽略大小写匹配的声明（已由 _insensitiveFirstValue 预计算「每族首次」的值）。
        if (_insensitiveFirstValue.TryGetValue(claimType, out var insensitiveRaw))
        {
            return string.IsNullOrEmpty(insensitiveRaw) ? null : insensitiveRaw;
        }

        return null;
    }

    /// <inheritdoc />
    public T? FindClaim<T>(string claimType)
    {
        var raw = FindClaim(claimType);
        return ClaimValueParser.Parse<T>(raw);
    }

    /// <summary>
    /// 懒加载构建声明缓存：每个 Scoped 实例最多执行一次快照与字典填充。
    /// </summary>
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
            // 与原先 FindFirst/遍历行为一致：统一将 null 视为空字符串，最终再按 IsNullOrEmpty 决定是否返回 null。
            list.Add((c.Type, c.Value ?? string.Empty));
        }

        _orderedClaims = list;
        var exact = new Dictionary<string, int>(StringComparer.Ordinal);
        var insVal = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        for (var i = 0; i < list.Count; i++)
        {
            var (type, value) = list[i];

            // 每种「精确类型字符串」只记录第一次出现的下标（对应 FindFirst 的语义）。
            if (!exact.ContainsKey(type))
            {
                exact[type] = i;
            }

            // 每种「忽略大小写族」只保留遍历顺序下第一次出现的值（对应原 foreach 从头扫描）。
            if (!insVal.ContainsKey(type))
            {
                insVal[type] = value;
            }
        }

        _firstExactIndex = exact;
        _insensitiveFirstValue = insVal;
    }

    /// <summary>
    /// 由已缓存的 <see cref="_orderedClaims"/> 生成分组只读字典，不再次访问 <see cref="IHttpContextAccessor"/>。
    /// </summary>
    private IReadOnlyDictionary<string, IReadOnlyList<string>> BuildClaimsByTypeView()
    {
        if (_orderedClaims.Count == 0)
        {
            return EmptyClaimsByType;
        }

        // 先按忽略大小写合并到同一列表，保留主体中的先后顺序
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

    /// <summary>
    /// 从当前主体解析数值型用户 Id；任意失败返回 <c>0</c>，不抛异常。
    /// </summary>
    /// <returns>解析得到的用户 Id；无效时为 <c>0</c>。</returns>
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
