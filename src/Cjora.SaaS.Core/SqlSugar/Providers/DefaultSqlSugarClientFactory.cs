using Cjora.SaaS.Core.SqlSugar.Abstractions;
using Microsoft.Extensions.DependencyInjection;
using SqlSugar;

namespace Cjora.SaaS.Core.SqlSugar.Providers;

internal sealed class DefaultSqlSugarClientFactory : ISqlSugarClientFactory
{
    private readonly IServiceScopeFactory _scopeFactory;

    public DefaultSqlSugarClientFactory(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    public ISqlSugarClient Create()
    {
        var scope = _scopeFactory.CreateScope();
        try
        {
            var client = scope.ServiceProvider.GetRequiredService<ISqlSugarClient>();
            return OwnedScopeDispatchProxy<ISqlSugarClient>.Create(client, scope);
        }
        catch
        {
            scope.Dispose();
            throw;
        }
    }
}

