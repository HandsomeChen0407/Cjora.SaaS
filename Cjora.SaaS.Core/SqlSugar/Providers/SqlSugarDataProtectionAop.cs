using Cjora.SaaS.Core.Auth.Abstractions;
using Cjora.SaaS.Core.DataPermission.Abstractions;
using Cjora.SaaS.Core.DataProtection.Abstractions;
using Cjora.SaaS.Core.DataProtection.Internals;
using Cjora.SaaS.Core.DataProtection.Models;
using Cjora.SaaS.Core.DataProtection.Providers;
using Cjora.SaaS.Core.MultiTenancy.Abstractions;
using Cjora.SaaS.Core.Repository.Abstractions;
using Cjora.SaaS.Core.SqlSugar.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using SqlSugar;

namespace Cjora.SaaS.Core.SqlSugar.Providers;

/// <summary>
/// SqlSugar <c>DataExecuting</c> / <c>DataExecuted</c> 与 DataProtection 元数据缓存的桥接层。
/// </summary>
/// <remarks>
/// <para>
/// SqlSugar 的 <c>Aop.DataExecuting</c> / <c>DataExecuted</c> 仅有 set 访问器，无法读取“旧委托”再组合；
/// 因此由 <see cref="SqlSugarSaaSClientBuilder"/> 注册<strong>单一</strong>委托，在本类内顺序调用租户/创建人与字段保护逻辑。
/// </para>
/// <para>
/// 元数据通过 <see cref="EntityFieldEncryptionRegistry"/> 按类型缓存，热路径不做全类型反射扫描。
/// </para>
/// </remarks>
internal static class SqlSugarDataProtectionAop
{
    internal static void RegisterCompositeDataExecuting(
        ISqlSugarClient client,
        IServiceProvider services,
        SqlSugarSaaSOptions sqlOptions,
        ITenantProvider tenantProvider)
    {
        var protectionOptions = services.GetRequiredService<IOptions<DataProtectionOptions>>().Value;
        var encryptor = services.GetService<IDataEncryptor>();
        var hashService = services.GetService<IHashService>();
        var wantEncrypt = protectionOptions.EnableEncryption && encryptor is not null;
        var wantHash = protectionOptions.EnableHash && hashService is not null;

        client.Aop.DataExecuting = (oldValue, entityInfo) =>
        {
            TenantAndCreatorDataExecuting(oldValue, entityInfo, tenantProvider, services, sqlOptions);

            if (wantEncrypt || wantHash)
            {
                OnDataProtectionExecuting(
                    oldValue,
                    entityInfo,
                    encryptor,
                    hashService,
                    wantEncrypt,
                    wantHash);
            }
        };

        if (protectionOptions.EnableAutoDecryption && encryptor is not null)
        {
            client.Aop.DataExecuted = (value, row) => OnDataExecuted(encryptor, row);
        }
    }

    private static void OnDataProtectionExecuting(
        object? oldValue,
        DataFilterModel entityInfo,
        IDataEncryptor? encryptor,
        IHashService? hashService,
        bool wantEncrypt,
        bool wantHash)
    {
        if (entityInfo.OperationType is not (DataFilterType.InsertByObject or DataFilterType.UpdateByObject))
        {
            return;
        }

        if (entityInfo.EntityValue is null || string.IsNullOrEmpty(entityInfo.PropertyName))
        {
            return;
        }

        var entityType = entityInfo.EntityValue.GetType();
        var descriptors = EntityFieldEncryptionRegistry.GetDescriptors(entityType);
        if (descriptors.Count == 0)
        {
            return;
        }

        foreach (var d in descriptors)
        {
            if (!string.Equals(d.PropertyName, entityInfo.PropertyName, StringComparison.Ordinal))
            {
                continue;
            }

            var plain = oldValue as string;
            if (wantHash && d.HashProperty is not null && hashService is not null)
            {
                var hashValue = string.IsNullOrEmpty(plain) ? string.Empty : hashService.ComputeHash(plain);
                d.HashProperty.SetValue(entityInfo.EntityValue, hashValue);
            }

            if (wantEncrypt && encryptor is not null)
            {
                if (string.IsNullOrEmpty(plain))
                {
                    return;
                }

                if (AesDataEncryptor.IsCiphertext(plain))
                {
                    return;
                }

                entityInfo.SetValue(encryptor.Encrypt(plain));
            }

            return;
        }
    }

    private static void OnDataExecuted(IDataEncryptor encryptor, object? row)
    {
        if (row is null)
        {
            return;
        }

        dynamic r = row;
        try
        {
            Type entityType = r.Entity.Type;
            var descriptors = EntityFieldEncryptionRegistry.GetDescriptors(entityType);
            if (descriptors.Count == 0)
            {
                return;
            }

            foreach (var d in descriptors)
            {
                var current = (string?)r.GetValue(d.PropertyName);
                if (string.IsNullOrEmpty(current) || !AesDataEncryptor.IsCiphertext(current))
                {
                    continue;
                }

                r.SetValue(d.PropertyName, encryptor.Decrypt(current));
            }
        }
        catch (Microsoft.CSharp.RuntimeBinder.RuntimeBinderException)
        {
            // SqlSugar 版本差异或匿名查询：忽略无法识别的 DataExecuted 负载。
        }
    }

    internal static void TenantAndCreatorDataExecuting(
        object? oldValue,
        DataFilterModel entityInfo,
        ITenantProvider tenantProvider,
        IServiceProvider services,
        SqlSugarSaaSOptions options)
    {
        if (entityInfo.OperationType is not (DataFilterType.InsertByObject or DataFilterType.UpdateByObject))
        {
            return;
        }

        if (entityInfo.PropertyName == nameof(ITenantScopedEntity.TenantId))
        {
            entityInfo.SetValue(tenantProvider.GetTenantId());
            return;
        }

        if (options.AutoFillCreatorUserIdOnInsert
            && entityInfo.OperationType == DataFilterType.InsertByObject
            && entityInfo.PropertyName == nameof(ICreatorOwnedEntity.CreatorUserId))
        {
            var user = services.GetService<ICurrentUser>();
            if (user is not { UserId: > 0 })
            {
                return;
            }

            var current = oldValue is long l ? l : 0L;
            if (current == 0)
            {
                entityInfo.SetValue(user.UserId);
            }
        }
    }
}
