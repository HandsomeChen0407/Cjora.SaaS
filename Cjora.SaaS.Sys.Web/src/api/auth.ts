import { api, type ApiResult } from "./client";

export interface LoginRequest {
  loginName: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  userId: number;
  loginName: string;
  displayName: string;
}

export interface CurrentUser {
  id: number;
  loginName: string;
  displayName: string;
  departmentId?: number;
  permissionCodes: string[];
  menuTree: PermissionTreeNode[];
  roles: string[];
}

export interface PermissionTreeNode {
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
  children: PermissionTreeNode[];
}

export const authApi = {
  login: (req: LoginRequest) =>
    api.post<ApiResult<LoginResponse>>("/api/sys/auth/login", req),
  getMe: () =>
    api.get<ApiResult<CurrentUser>>("/api/sys/me"),
};
