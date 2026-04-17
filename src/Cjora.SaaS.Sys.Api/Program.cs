using System.Text;
using Cjora.SaaS.Core.Extensions;
using Cjora.SaaS.Core.SqlSugar.Constants;
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

// Bootstrap logger：确保宿主启动阶段的异常也能被 Serilog 捕获
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.Console()
    .CreateBootstrapLogger();

var builder = WebApplication.CreateBuilder(args);

// 使用 Serilog 接管 ILogger（完全基于 appsettings 中 Serilog 节配置，禁止自定义 Logger 封装）
builder.UseCjoraSerilog(o => o.ServiceName = "sys-api");

builder.Services.AddControllers().AddCjoraSysWebControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(static c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Cjora SaaS Sys API",
        Version = "v1",
        Description = "系统管理（IAM）接口服务；租户通过请求头 X-Tenant-Id 传递。"
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
        o.ServiceName = "sys-api";
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
        o.MasterConnectionString = builder.Configuration.GetConnectionString("SqlSugar") ?? "DataSource=cjora_sys_api.db";
        o.AutoFillCreatorUserIdOnInsert = false;
    });
builder.Services.AddCjoraSaaSSys();

var app = builder.Build();

app.Services.ValidateSaaSOrThrow();

using (var scope = app.Services.CreateScope())
{
    var catalogDb = scope.ServiceProvider.GetRequiredKeyedService<ISqlSugarClient>(SqlSugarKeyedServiceKeys.Catalog);
    catalogDb.CodeFirst.InitTables(typeof(SysTenant));

    var db = scope.ServiceProvider.GetRequiredService<ISqlSugarClient>();
    var tenantEntityTypes = new[]
    {
        typeof(SysUser),
        typeof(SysRole),
        typeof(SysDepartment),
        typeof(SysUserRole),
        typeof(SysRolePermission),
        typeof(SysRoleDataScope),
        typeof(SysDepartmentScopedSetting),
        typeof(SysUserDataScope),
        typeof(SysDepartmentClosure),
        typeof(SysPermission),
        typeof(SysDictType),
        typeof(SysDictItem)
    };

    db.CodeFirst.InitTables(tenantEntityTypes);

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
app.UseCjoraLogContext();              // Auth/TenantResolution 之后再把 TraceId/TenantId/UserId 压入 LogContext
app.MapControllers();

try
{
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "sys-api host terminated unexpectedly");
    throw;
}
finally
{
    Log.CloseAndFlush();
}
