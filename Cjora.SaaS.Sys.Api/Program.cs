using Cjora.SaaS.Core.Extensions;
using Cjora.SaaS.Core.SqlSugar.Constants;
using Cjora.SaaS.Sys;
using Cjora.SaaS.Sys.DataPermission.Entities;
using Cjora.SaaS.Sys.Entities;
using Cjora.SaaS.Sys.Repositories;
using Microsoft.Extensions.DependencyInjection;
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

builder.Services.AddCjoraSaaSWithSqlSugar(
    configureTenant: o =>
    {
        o.DefaultTenantId = "default";
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
        typeof(SysDepartmentScopedSetting),
        typeof(SysUserDataScope),
        typeof(SysDepartmentClosure),
        typeof(SysPermission),
        typeof(SysDictType),
        typeof(SysDictItem));

    var tenants = scope.ServiceProvider.GetRequiredService<ISysTenantRepository>();
    if (await tenants.GetByIdAsync("default", CancellationToken.None).ConfigureAwait(false) is null)
    {
        await tenants.InsertAsync(
                new SysTenant
                {
                    Id = "default",
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
app.MapControllers();

app.Run();
