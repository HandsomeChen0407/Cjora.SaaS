using Cjora.SaaS.Core.DataPermission.Abstractions;
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
}

