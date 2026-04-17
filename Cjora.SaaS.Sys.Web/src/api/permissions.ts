import { api, type ApiResult } from "./client";

export interface PermissionDto {
  id: number;
  parentId?: number;
  label: string;
  nodeType: string;
  path?: string;
  permCode?: string;
  icon?: string;
  sortOrder: number;
  isVisible: boolean;
  isActive: boolean;
}

export interface PermissionTreeNode extends PermissionDto {
  children: PermissionTreeNode[];
}

export const permissionsApi = {
  getAll: () => api.get<ApiResult<PermissionDto[]>>("/api/sys/permissions"),
  getTree: () => api.get<ApiResult<PermissionTreeNode[]>>("/api/sys/permissions/tree"),
  getById: (id: number) => api.get<ApiResult<PermissionDto>>(`/api/sys/permissions/${id}`),
  create: (data: Partial<PermissionDto>) => api.post<ApiResult<PermissionDto>>("/api/sys/permissions", data),
  update: (id: number, data: Partial<PermissionDto>) => api.put<ApiResult<PermissionDto>>(`/api/sys/permissions/${id}`, data),
  del: (id: number) => api.del(`/api/sys/permissions/${id}`),
};
