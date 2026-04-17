import { api, type ApiResult, type PagedResponse } from "./client";

export interface RoleDto {
  id: number;
  code: string;
  name: string;
  isSystem: boolean;
  isActive: boolean;
  dataScope: string;
  remark?: string;
  permissionIds: number[];
  dataScopeDeptIds: number[];
  creatorUserId: number;
  createdAtUtc: string;
  updatedAtUtc?: string;
}

export const rolesApi = {
  getPaged: (pageNumber = 1, pageSize = 20) =>
    api.get<ApiResult<PagedResponse<RoleDto>>>(`/api/sys/roles?pageNumber=${pageNumber}&pageSize=${pageSize}`),
  getById: (id: number) => api.get<ApiResult<RoleDto>>(`/api/sys/roles/${id}`),
  create: (data: Partial<RoleDto>) => api.post<ApiResult<RoleDto>>("/api/sys/roles", data),
  update: (id: number, data: Partial<RoleDto>) => api.put<ApiResult<RoleDto>>(`/api/sys/roles/${id}`, data),
  del: (id: number) => api.del(`/api/sys/roles/${id}`),
  getPermissions: (roleId: number) =>
    api.get<ApiResult<number[]>>(`/api/sys/roles/${roleId}/permissions`),
};
