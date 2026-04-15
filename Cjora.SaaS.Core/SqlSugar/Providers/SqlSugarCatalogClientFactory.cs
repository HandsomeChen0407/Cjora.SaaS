using Cjora.SaaS.Core.SqlSugar.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using SqlSugar;

namespace Cjora.SaaS.Core.SqlSugar.Providers;

/// <summary>
/// 创建始终连接 <see cref="SqlSugarSaaSOptions.MasterConnectionString"/> 的 <see cref="ISqlSugarClient"/>（与租户存储路由无关），用于目录/平台库实体。
/// </summary>
public static class SqlSugarCatalogClientFactory
{
    /// <summary>
    /// 供 Keyed <see cref="ISqlSugarClient"/> 注册使用。
    /// </summary>
    public static ISqlSugarClient Create(IServiceProvider services)
    {
        var options = services.GetRequiredService<IOptions<SqlSugarSaaSOptions>>().Value;

        if (string.IsNullOrWhiteSpace(options.MasterConnectionString))
        {
            throw new InvalidOperationException(
                $"{nameof(SqlSugarSaaSOptions)}.{nameof(SqlSugarSaaSOptions.MasterConnectionString)} 未配置，无法创建目录库 ISqlSugarClient。");
        }

        return SqlSugarSaaSClientBuilder.Build(services, options.MasterConnectionString, options);
    }
}
