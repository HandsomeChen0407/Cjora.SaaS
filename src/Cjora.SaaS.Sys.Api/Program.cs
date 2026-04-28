using System.Text;
using Cjora.SaaS.Core.Extensions;
using Cjora.SaaS.Core.MultiTenancy.Abstractions;
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
        var cs = builder.Configuration.GetConnectionString("SqlSugar") ?? "DataSource=cjora_sys_api.db";
        // 生产环境禁止 SQLite（在 SaaSStartupValidator 中会 Fail-Fast），这里按连接串自动推断 DbType，
        // 避免把生产环境固定死为 Sqlite。
        o.DbType = DetectDbType(cs, builder.Environment.IsProduction());
        o.MasterConnectionString = cs;
        o.AutoFillCreatorUserIdOnInsert = false;
    });
builder.Services.AddCjoraSaaSSys();

var app = builder.Build();

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

// 启动阶段没有 HttpContext；Validate 内部会解析 ISqlSugarClient（进而触发 ITenantProvider.GetTenantId）。
// 因此必须显式绑定租户上下文。
using (var validationScope = app.Services.CreateScope())
{
    using var _ = validationScope.ServiceProvider.GetRequiredService<ITenantContextSetter>().Use("default");
    // ValidateSaaSOrThrow 内部会解析 ITenantStorageRoutingProvider（查 sys_tenant）。
    // 因此必须确保目录库的 sys_tenant 已存在，否则会在路由阶段报 "no such table: sys_tenant"。
    var validationCatalogDb = validationScope.ServiceProvider
        .GetRequiredKeyedService<ISqlSugarClient>(SqlSugarKeyedServiceKeys.Catalog);
    validationCatalogDb.CodeFirst.InitTables(typeof(SysTenant));

    // ValidateSaaSOrThrow 内部会做索引校验；SQLite 下 CodeFirst 未必会创建 SugarIndex 声明的索引，
    // 这里先初始化业务表并补齐关键索引，避免启动期直接 Fail-Fast。
    var validationDb = validationScope.ServiceProvider.GetRequiredService<ISqlSugarClient>();
    validationDb.CodeFirst.InitTables(tenantEntityTypes);
    if (validationDb.CurrentConnectionConfig.DbType == DbType.Sqlite)
    {
        EnsureSqliteIndexes(validationDb.CurrentConnectionConfig.ConnectionString);
    }

    validationScope.ServiceProvider.ValidateSaaSOrThrow();
}

using (var scope = app.Services.CreateScope())
{
    // 启动阶段没有 HttpContext，所有依赖 ITenantProvider 的逻辑必须显式绑定租户上下文。
    // 这里初始化的都是默认租户下的表结构/种子数据。
    using var _ = scope.ServiceProvider.GetRequiredService<ITenantContextSetter>().Use("default");

    var catalogDb = scope.ServiceProvider.GetRequiredKeyedService<ISqlSugarClient>(SqlSugarKeyedServiceKeys.Catalog);
    catalogDb.CodeFirst.InitTables(typeof(SysTenant));

    var db = scope.ServiceProvider.GetRequiredService<ISqlSugarClient>();
    db.CodeFirst.InitTables(tenantEntityTypes);
    if (db.CurrentConnectionConfig.DbType == DbType.Sqlite)
    {
        EnsureSqliteIndexes(db.CurrentConnectionConfig.ConnectionString);
    }

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

static void EnsureSqliteIndexes(string connectionString)
{
    // 注意：这里故意使用“原始 SqlSugarClient（无 guard / 无 AOP）”来做 schema bootstrap。
    // 否则 DbMaintenance.GetIndexList / CreateIndex 可能在一次调用中触发嵌套 SQL，
    // 被 ISqlSugarClientGuard 误判为并发/重入而 Fail-Fast。
    using var raw = new SqlSugarClient(new ConnectionConfig
    {
        DbType = DbType.Sqlite,
        ConnectionString = connectionString,
        IsAutoCloseConnection = true
    });

    CreateIndexIfMissing(
        raw,
        tableName: "sys_user_data_scope",
        indexName: "idx_user_scope",
        columns: new[] { "tenant_id", "user_id", "scope_type", "scope_id" });

    CreateIndexIfMissing(
        raw,
        tableName: "sys_department_closure",
        indexName: "idx_closure_ad",
        columns: new[] { "tenant_id", "ancestor_id", "descendant_id" });

    CreateIndexIfMissing(
        raw,
        tableName: "sys_department_closure",
        indexName: "idx_closure_d",
        columns: new[] { "descendant_id" });

    CreateIndexIfMissing(
        raw,
        tableName: "sys_department_scoped_setting",
        indexName: "idx_tenant_dept",
        columns: new[] { "tenant_id", "department_id" });
}

static void CreateIndexIfMissing(ISqlSugarClient db, string tableName, string indexName, string[] columns)
{
    // 幂等：避免热重载/重复启动时 "index ... already exists"
    if (HasIndex(db, tableName, indexName))
    {
        return;
    }

    try
    {
        db.DbMaintenance.CreateIndex(tableName, columns, indexName, isUnique: false);
    }
    catch (Exception ex) when (ex.Message.Contains("already exists", StringComparison.OrdinalIgnoreCase))
    {
        // SQLite: index xxx already exists（并发启动/重复触发）
    }
}

static bool HasIndex(ISqlSugarClient db, string tableName, string indexName)
{
    var list = db.DbMaintenance.GetIndexList(tableName);
    foreach (var item in list)
    {
        if (item is null)
        {
            continue;
        }

        if (item is string s)
        {
            if (string.Equals(s, indexName, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            continue;
        }

        var prop = item.GetType().GetProperty("IndexName");
        var name = prop?.GetValue(item) as string;
        if (!string.IsNullOrWhiteSpace(name) && string.Equals(name, indexName, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }
    }

    return false;
}

static DbType DetectDbType(string connectionString, bool isProduction)
{
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return DbType.Sqlite;
    }

    // Sqlite: "DataSource=xxx.db" / "Data Source=..."
    if (connectionString.Contains("DataSource=", StringComparison.OrdinalIgnoreCase)
        || connectionString.Contains("Data Source=", StringComparison.OrdinalIgnoreCase))
    {
        // 生产环境若仍给出 Sqlite 连接串，后续启动校验会明确阻止（符合治理约束）。
        return DbType.Sqlite;
    }

    // Postgres 常见关键字：Host / Username / Database / Port
    if (connectionString.Contains("Host=", StringComparison.OrdinalIgnoreCase)
        || connectionString.Contains("Username=", StringComparison.OrdinalIgnoreCase)
        || connectionString.Contains("User ID=", StringComparison.OrdinalIgnoreCase))
    {
        return DbType.PostgreSQL;
    }

    // 兜底：开发环境允许按 Sqlite 跑起来；生产环境尽量不要默默猜错
    return isProduction ? DbType.PostgreSQL : DbType.Sqlite;
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
