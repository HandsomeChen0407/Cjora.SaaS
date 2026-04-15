using Cjora.SaaS.Core.DataProtection.Abstractions;
using Cjora.SaaS.Core.DataProtection.Models;
using Cjora.SaaS.Core.DataProtection.Providers;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Cjora.SaaS.Core.DataProtection.Hosting;

/// <summary>
/// 字段级 DataProtection 能力的依赖注入入口。
/// </summary>
/// <remarks>
/// 由 <c>Cjora.SaaS.Core.SqlSugar.Hosting.SqlSugarServiceCollectionExtensions.AddCjoraSqlSugarSaaS</c> 内部调用；
/// 宿主也可单独调用以在非 SqlSugar 场景使用 <see cref="IDataEncryptor"/> / <see cref="IHashService"/> / <see cref="IDataMasker"/>。
/// </remarks>
public static class DataProtectionServiceCollectionExtensions
{
    /// <summary>
    /// 注册 DataProtection 选项与默认实现（全部开关默认关闭，不改变既有行为）。
    /// </summary>
    public static IServiceCollection AddCjoraDataProtection(
        this IServiceCollection services,
        Action<DataProtectionOptions>? configure = null)
    {
        services.AddOptions();
        if (configure is not null)
        {
            services.Configure(configure);
        }
        else
        {
            services.Configure<DataProtectionOptions>(_ => { });
        }

        services.TryAddSingleton<IHashService, DefaultHashService>();
        services.TryAddSingleton<IDataEncryptor, AesDataEncryptor>();
        services.TryAddSingleton<IDataMasker, DefaultDataMasker>();
        return services;
    }
}
