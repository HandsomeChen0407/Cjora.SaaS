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
using Cjora.SaaS.Sys.Repositories;
using Cjora.SaaS.Sys.SqlSugar;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using SqlSugar;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
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

// JWT Authentication
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

builder.Services.AddAuthorization();
builder.Services.AddScoped<IAuthorizationHandler, PermCodeAuthorizationHandler>();
builder.Services.AddScoped<JwtTokenService>();

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
builder.Services.AddCjoraSaaSCrmDataPermission();
builder.Services.AddCjoraSaaSPmDataPermission();

var app = builder.Build();

app.Services.ValidateSaaSOrThrow();

using (var scope = app.Services.CreateScope())
{
    var catalogDb = scope.ServiceProvider.GetRequiredKeyedService<ISqlSugarClient>(SqlSugarKeyedServiceKeys.Catalog);
    catalogDb.CodeFirst.InitTables(typeof(SysTenant));

    var db = scope.ServiceProvider.GetRequiredService<ISqlSugarClient>();
    db.CodeFirst.InitTables(
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
        typeof(SysDictItem),
        typeof(CrmCustomer),
        typeof(CrmCustomerContact),
        typeof(CrmCustomerFollow),
        typeof(PmProject),
        typeof(PmProjectMember),
        typeof(PmProjectContract));

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

app.UseCors("SysWeb");
app.UseCjoraSaaSSysTenantResolution();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
