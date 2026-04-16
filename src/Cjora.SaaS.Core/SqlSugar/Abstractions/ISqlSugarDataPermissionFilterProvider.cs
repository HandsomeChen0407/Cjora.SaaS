using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.DataPermission.Enums;
using SqlSugar;

namespace Cjora.SaaS.Core.SqlSugar.Abstractions;

/// <summary>
/// 可插拔的 SqlSugar 数据权限过滤器提供者。
/// </summary>
/// <remarks>
/// Core 仅负责调用本接口，不关心具体 SQL 形态；业务侧（如 Sys）在实现中使用 EXISTS/JOIN 等方式拼接行级过滤。
/// </remarks>
public interface ISqlSugarDataPermissionFilterProvider
{
    /// <summary>
    /// 将行级过滤器注册到 <paramref name="client"/>。
    /// </summary>
    /// <remarks>
    /// 过滤表达式必须在运行时读取 <paramref name="context"/> 属性，确保 <see cref="IDataPermissionScope.Disable"/> 动态生效。
    /// </remarks>
    void Apply(ISqlSugarClient client, IDataPermissionContext context);

    /// <summary>
    /// 本提供者为哪些 <see cref="DataScopeKind"/> 实现了行级过滤（用于 SqlSugar 全局过滤器注册时的范围覆盖校验）。
    /// </summary>
    /// <remarks>
    /// 未实现的范围返回空集合；若当前用户数据范围无人处理，将在创建 <see cref="ISqlSugarClient"/> 时失败。
    /// </remarks>
    IReadOnlyList<DataScopeKind> HandledDataScopes => Array.Empty<DataScopeKind>();
}

