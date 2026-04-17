import { api, type ApiResult, type PagedResponse } from "./client";

export interface DepartmentDto {
  id: number;
  parentId?: number;
  name: string;
  code?: string;
  sortOrder: number;
  leader?: string;
  phone?: string;
  isActive: boolean;
  creatorUserId: number;
  createdAtUtc: string;
  updatedAtUtc?: string;
}

export interface DepartmentTreeNode {
  id: number;
  parentId?: number;
  name: string;
  code?: string;
  sortOrder: number;
  leader?: string;
  phone?: string;
  isActive: boolean;
  children: DepartmentTreeNode[];
}

export const departmentsApi = {
  getPaged: (pageNumber = 1, pageSize = 20) =>
    api.get<ApiResult<PagedResponse<DepartmentDto>>>(`/api/sys/departments?pageNumber=${pageNumber}&pageSize=${pageSize}`),
  getTree: () =>
    api.get<ApiResult<DepartmentTreeNode[]>>("/api/sys/departments/tree"),
  getById: (id: number) => api.get<ApiResult<DepartmentDto>>(`/api/sys/departments/${id}`),
  create: (data: Partial<DepartmentDto>) => api.post<ApiResult<DepartmentDto>>("/api/sys/departments", data),
  update: (id: number, data: Partial<DepartmentDto>) => api.put<ApiResult<DepartmentDto>>(`/api/sys/departments/${id}`, data),
  del: (id: number) => api.del(`/api/sys/departments/${id}`),
};
