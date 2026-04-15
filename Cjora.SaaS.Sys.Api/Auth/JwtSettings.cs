namespace Cjora.SaaS.Sys.Api.Auth;

public sealed class JwtSettings
{
    public const string SectionName = "Jwt";
    public string Secret { get; set; } = "CjoraSaaSDefaultSecretKey_ChangeInProduction_32bytes!";
    public string Issuer { get; set; } = "Cjora.SaaS.Sys";
    public string Audience { get; set; } = "Cjora.SaaS.Sys.Web";
    public int ExpireMinutes { get; set; } = 480;
}
