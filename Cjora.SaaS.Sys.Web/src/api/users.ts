import { api, type ApiResult, type PagedResponse } from "./client";

export interface UserDto {
  id: number;
  loginName: string;
  displayName: string;
  isActive: boolean;
  departmentId?: number;
  externalSubjectId?: string;
  email?: string;
  phone?: string;
  creatorUserId: number;
  createdAtUtc: string;
  updatedAtUtc?: string;
}

export interface UserRoleDto {
  userRoleId: number;
  roleId: number;
  roleCode: string;
  roleName: string;
}

export const usersApi = {
  getPaged: (pageNumber = 1, pageSize = 20) =>
    api.get<ApiResult<PagedResponse<UserDto>>>(`/api/users?pageNumber=${pageNumber}&pageSize=${pageSize}`),
  getById: (id: number) => api.get<ApiResult<UserDto>>(`/api/users/${id}`),
  create: (data: Partial<UserDto> & { password?: string }) =>
    api.post<ApiResult<UserDto>>("/api/users", data),
  update: (id: number, data: Partial<UserDto>) =>
    api.put<ApiResult<UserDto>>(`/api/users/${id}`, data),
  del: (id: number) => api.del(`/api/users/${id}`),
  getRoles: (userId: number) =>
    api.get<ApiResult<UserRoleDto[]>>(`/api/users/${userId}/roles`),
  assignRole: (userId: number, roleId: number) =>
    api.post(`/api/users/${userId}/roles`, { roleId }),
  removeRole: (userId: number, roleId: number) =>
    api.del(`/api/users/${userId}/roles/${roleId}`),
};
