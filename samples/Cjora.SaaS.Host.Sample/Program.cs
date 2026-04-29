using System.Text;
using Cjora.SaaS.Core.Extensions;
using Cjora.SaaS.Core.SqlSugar.Constants;
using Cjora.SaaS.Crm;
using Cjora.SaaS.Crm.Entities;
using Cjora.SaaS.Pm;
using Cjora.SaaS.Pm.Entities;
using Cjora.SaaS.Sys;
using Cjora.SaaS.Sys.Api.Auth;
using Cjora.SaaS.Sys.DataPermission.Entities;
using Cjora.SaaS.Sys.Entities;
using Cjora.SaaS.Caching.Hosting;
using Cjora.SaaS.Logging.Hosting;
using Cjora.SaaS.Sys.Repositories;
using Cjora.SaaS.Sys.SqlSugar;
using Cjora.SaaS.Sys.Web;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using SqlSugar;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.Console()
    .CreateBootstrapLogger();

var builder = WebApplication.CreateBuilder(args);

builder.UseCjoraSerilog(o => o.ServiceName = "host-sample");

builder.Services.AddControllers().AddCjoraSysWebControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(static c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Cjora SaaS Sample Host",
        Version = "v1",
        Description = "示例宿主：IAM + 可选 CRM/PM 数据权限模块演示；租户通过请求头 X-Tenant-Id 传递。"
    });
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Bearer {token}\"",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var corsOrigins = builder.Configuration.GetSection("Cors:SysWebOrigins").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "SysWeb",
        p =>
        {
            p.WithOrigins(corsOrigins.Length > 0 ? corsOrigins : new[] { "http://localhost:5173", "http://127.0.0.1:5173" })
                .AllowAnyHeader()
                .AllowAnyMethod();
        });
});

var jwtSettings = builder.Configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>() ?? new JwtSettings();
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection(JwtSettings.SectionName));

builder.Services.AddAuthentication(o =>
{
    o.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    o.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(o =>
{
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings.Issuer,
        ValidAudience = jwtSettings.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret))
    };
});

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});
builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermCodePolicyProvider>();
builder.Services.AddScoped<IAuthorizationHandler, PermCodeAuthorizationHandler>();
builder.Services.AddScoped<JwtTokenService>();

builder.Services.AddCjoraCaching(builder.Configuration);
builder.Services.AddCjoraObservabilityStack(
    builder.Configuration,
    o =>
    {
        o.ServiceName = "host-sample";
        o.IncludeExceptionDetail = builder.Environment.IsDevelopment();
    });

builder.Services.AddCjoraSaaSWithSqlSugar(
    configureTenant: o =>
    {
        o.EnableJwtClaimTenantResolution = false;
    },
    configureSqlSugar: o =>
    {
        o.DbType = DbType.Sqlite;
        o.MasterConnectionString = builder.Configuration.GetConnectionString("SqlSugar") ?? "DataSource=cjora_sample_host.db";
        o.AutoFillCreatorUserIdOnInsert = false;
    });
builder.Services.AddCjoraSaaSSys();

var enableCrmDataPermission = builder.Configuration.GetValue("Modules:EnableCrmDataPermission", false);
var enablePmDataPermission = builder.Configuration.GetValue("Modules:EnablePmDataPermission", false);
if (enableCrmDataPermission)
{
    builder.Services.AddCjoraSaaSCrmDataPermission();
}

if (enablePmDataPermission)
{
    builder.Services.AddCjoraSaaSPmDataPermission();
}

var app = builder.Build();

app.Services.ValidateSaaSOrThrow();

using (var scope = app.Services.CreateScope())
{
    var catalogDb = scope.ServiceProvider.GetRequiredKeyedService<ISqlSugarClient>(SqlSugarKeyedServiceKeys.Catalog);
    catalogDb.CodeFirst.InitTables(typeof(SysTenant));

    var db = scope.ServiceProvider.GetRequiredService<ISqlSugarClient>();
    var tenantEntityTypes = new List<Type>
    {
        typeof(SysUser),
        typeof(SysRole),
        typeof(SysDepartment),
        typeof(SysUserRole),
        typeof(SysRolePermission),
        typeof(SysRoleDataScope),
        typeof(SysAgent),
        typeof(SysDepartmentScopedSetting),
        typeof(SysUserDataScope),
        typeof(SysDepartmentClosure),
        typeof(SysPermission),
        typeof(SysDictType),
        typeof(SysDictItem)
    };

    if (enableCrmDataPermission)
    {
        tenantEntityTypes.AddRange(
        [
            typeof(CrmCustomer),
            typeof(CrmCustomerContact),
            typeof(CrmCustomerFollow)
        ]);
    }

    if (enablePmDataPermission)
    {
        tenantEntityTypes.AddRange(
        [
            typeof(PmProject),
            typeof(PmProjectMember),
            typeof(PmProjectContract)
        ]);
    }

    db.CodeFirst.InitTables(tenantEntityTypes.ToArray());

    DatabaseSchemaValidator.ValidateIndexes(db);

    var tenants = scope.ServiceProvider.GetRequiredService<ISysTenantRepository>();
    if (await tenants.GetByTenantCodeAsync("default", CancellationToken.None).ConfigureAwait(false) is null)
    {
        await tenants.InsertAsync(
                new SysTenant
                {
                    TenantCode = "default",
                    Name = "默认租户",
                    IsActive = true,
                    CreatedAtUtc = DateTime.UtcNow
                },
                CancellationToken.None)
            .ConfigureAwait(false);
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseRequestTimeouts();
app.UseCjoraSaaSSysInfrastructure();   // = UseSerilogRequestLogging + 异常兜底 + HTTP 指标
app.UseCors("SysWeb");
app.UseCjoraSaaSSysTenantResolution();
app.UseAuthentication();
app.UseAuthorization();
app.UseCjoraLogContext();
app.MapControllers();

try
{
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "host-sample terminated unexpectedly");
    throw;
}
finally
{
    Log.CloseAndFlush();
}
