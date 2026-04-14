import { http } from './http';
import type { Paged, SysDepartment, SysRole, SysTenant, SysUser, SysUserRole } from './types';

export async function fetchTenants() {
  const { data } = await http.get<SysTenant[]>('/Tenants');
  return data;
}

export async function createTenant(payload: { id: string; name: string; isActive: boolean }) {
  const { data } = await http.post<SysTenant>('/Tenants', payload);
  return data;
}

export async function fetchUsers(pageNumber = 1, pageSize = 20) {
  const { data } = await http.get<Paged<SysUser>>('/Users', { params: { pageNumber, pageSize } });
  return data;
}

export async function createUser(payload: {
  loginName: string;
  displayName: string;
  isActive: boolean;
  departmentId?: number | null;
}) {
  const { data } = await http.post<SysUser>('/Users', payload);
  return data;
}

export async function deleteUser(id: number) {
  await http.delete(`/Users/${id}`);
}

export async function fetchRoles(pageNumber = 1, pageSize = 20) {
  const { data } = await http.get<Paged<SysRole>>('/Roles', { params: { pageNumber, pageSize } });
  return data;
}

export async function createRole(payload: { code: string; name: string; isSystem: boolean }) {
  const { data } = await http.post<SysRole>('/Roles', payload);
  return data;
}

export async function deleteRole(id: number) {
  await http.delete(`/Roles/${id}`);
}

export async function fetchDepartments(pageNumber = 1, pageSize = 50) {
  const { data } = await http.get<Paged<SysDepartment>>('/Departments', { params: { pageNumber, pageSize } });
  return data;
}

export async function createDepartment(payload: { name: string; parentId?: number | null; sortOrder: number }) {
  const { data } = await http.post<SysDepartment>('/Departments', payload);
  return data;
}

export async function deleteDepartment(id: number) {
  await http.delete(`/Departments/${id}`);
}

export async function fetchUserRoles(pageNumber = 1, pageSize = 50) {
  const { data } = await http.get<Paged<SysUserRole>>('/UserRoles', { params: { pageNumber, pageSize } });
  return data;
}

export async function assignUserRole(userId: number, roleId: number) {
  const { data } = await http.post<SysUserRole>('/UserRoles', { userId, roleId });
  return data;
}

export async function removeUserRole(id: number) {
  await http.delete(`/UserRoles/${id}`);
}
