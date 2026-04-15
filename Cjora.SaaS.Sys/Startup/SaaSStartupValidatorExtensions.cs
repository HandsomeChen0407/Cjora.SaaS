using Cjora.SaaS.Sys.Startup;

namespace Cjora.SaaS.Sys;

public static class SaaSStartupValidatorExtensions
{
    public static void ValidateSaaSOrThrow(this IServiceProvider services)
        => SaaSStartupValidator.ValidateSaaSOrThrow(services);
}

