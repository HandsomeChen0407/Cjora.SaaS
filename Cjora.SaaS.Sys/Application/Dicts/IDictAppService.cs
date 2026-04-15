using Cjora.SaaS.Core.Repository.Models;
using Cjora.SaaS.Sys.Application.Dicts.Models;

namespace Cjora.SaaS.Sys.Application.Dicts;

public interface IDictAppService
{
    Task<PagedResult<DictTypeVm>> GetTypesPagedAsync(PagedRequest request, CancellationToken cancellationToken = default);
    Task<DictTypeVm?> GetTypeByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<long> CreateTypeAsync(CreateDictTypeRequest request, CancellationToken cancellationToken = default);
    Task<bool> UpdateTypeAsync(long id, UpdateDictTypeRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteTypeAsync(long id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DictItemVm>> GetItemsByTypeAsync(long typeId, CancellationToken cancellationToken = default);
    Task<DictItemVm?> GetItemByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<long> CreateItemAsync(long typeId, CreateDictItemRequest request, CancellationToken cancellationToken = default);
    Task<bool> UpdateItemAsync(long id, UpdateDictItemRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteItemAsync(long id, CancellationToken cancellationToken = default);
}
