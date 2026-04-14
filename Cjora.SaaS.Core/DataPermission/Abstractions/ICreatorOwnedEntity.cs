using Cjora.SaaS.Core.DataPermission.Enums;
using Cjora.SaaS.Core.Repository.Abstractions;

namespace Cjora.SaaS.Core.DataPermission.Abstractions;

/// <summary>
/// 标记实体包含「创建人/负责人」维度，可在 <see cref="DataScopeKind.Self"/> 下追加 <c>CreatorUserId == 当前用户</c>。
/// </summary>
public interface ICreatorOwnedEntity : ITenantScopedEntity
{
    /// <summary>
    /// 创建该行的用户 Id，通常与 <see cref="Cjora.SaaS.Core.Auth.Abstractions.ICurrentUser.UserId"/> 对齐。
    /// </summary>
    long CreatorUserId { get; set; }
}
