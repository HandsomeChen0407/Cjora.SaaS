export type Paged<T> = {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
};

export type SysTenant = {
  id: string;
  name: string;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
};

export type SysUser = {
  id: number;
  loginName: string;
  displayName: string;
  isActive: boolean;
  departmentId?: number | null;
  departmentName?: string | null;
  externalSubjectId?: string | null;
  creatorUserId: number;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
};

export type SysRole = {
  id: number;
  code: string;
  name: string;
  permissionCodesJson?: string | null;
  isSystem: boolean;
  creatorUserId: number;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
};

export type SysDepartment = {
  id: number;
  parentId?: number | null;
  name: string;
  code?: string | null;
  sortOrder: number;
  creatorUserId: number;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
};

export type SysUserRole = {
  id: number;
  userId: number;
  roleId: number;
  creatorUserId: number;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
};
