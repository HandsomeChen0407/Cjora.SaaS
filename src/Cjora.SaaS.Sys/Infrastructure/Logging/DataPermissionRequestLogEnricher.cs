using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Logging.Abstractions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace Cjora.SaaS.Sys.Infrastructure.Logging;

/// <summary>
/// Enriches request log with DataScope, BypassRowLevelFilters, and Provider list.
/// </summary>
public sealed class DataPermissionRequestLogEnricher : IRequestLogEnricher
{
    public void Enrich(HttpContext context, IDictionary<string, object?> properties)
    {
        try
        {
            var dp = context.RequestServices.GetService<IDataPermissionContext>();
            if (dp is not null)
            {
                properties["DataScope"] = dp.Scope.ToString();
                properties["BypassRowLevelFilters"] = dp.BypassRowLevelFilters;
            }
        }
        catch
        {
            properties["DataScope"] = "unavailable";
        }

        if (context.Items.TryGetValue("Cjora.DataPermissionFilterProviders", out var providers))
        {
            properties["DataPermissionProviders"] = providers;
        }
    }
}
