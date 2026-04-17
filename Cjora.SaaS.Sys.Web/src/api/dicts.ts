import { api, type ApiResult, type PagedResponse } from "./client";

export interface DictTypeDto {
  id: number;
  name: string;
  code: string;
  category: string;
  remark?: string;
  isActive: boolean;
  isLocked: boolean;
  createdAtUtc: string;
  updatedAtUtc?: string;
}

export interface DictItemDto {
  id: number;
  typeId: number;
  label: string;
  value: string;
  sortOrder: number;
  isActive: boolean;
  remark?: string;
  createdAtUtc: string;
  updatedAtUtc?: string;
}

export const dictsApi = {
  getTypesPaged: (pageNumber = 1, pageSize = 20) =>
    api.get<ApiResult<PagedResponse<DictTypeDto>>>(`/api/sys/dict-types?pageNumber=${pageNumber}&pageSize=${pageSize}`),
  getTypeById: (id: number) => api.get<ApiResult<DictTypeDto>>(`/api/sys/dict-types/${id}`),
  createType: (data: Partial<DictTypeDto>) => api.post<ApiResult<DictTypeDto>>("/api/sys/dict-types", data),
  updateType: (id: number, data: Partial<DictTypeDto>) => api.put<ApiResult<DictTypeDto>>(`/api/sys/dict-types/${id}`, data),
  delType: (id: number) => api.del(`/api/sys/dict-types/${id}`),

  getItems: (typeId: number) =>
    api.get<ApiResult<DictItemDto[]>>(`/api/sys/dict-types/${typeId}/items`),
  createItem: (typeId: number, data: Partial<DictItemDto>) =>
    api.post<ApiResult<DictItemDto>>(`/api/sys/dict-types/${typeId}/items`, data),
  updateItem: (typeId: number, itemId: number, data: Partial<DictItemDto>) =>
    api.put<ApiResult<DictItemDto>>(`/api/sys/dict-types/${typeId}/items/${itemId}`, data),
  delItem: (typeId: number, itemId: number) =>
    api.del(`/api/sys/dict-types/${typeId}/items/${itemId}`),
};
