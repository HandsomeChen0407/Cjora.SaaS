import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import PageHeader from "../components/PageHeader";

import SysUserPage from "./sys/SysUserPage";
import SysDeptPage from "./sys/SysDeptPage";
import SysRolePage from "./sys/SysRolePage";
import SysPermPage from "./sys/SysPermPage";
import SysDictPage from "./sys/SysDictPage";

const pageConfig: Record<string, { title: string; subtitle: string }> = {
  "/sys/users":       { title: "用户管理",   subtitle: "管理系统用户账号、所属部门及角色分配" },
  "/sys/departments": { title: "部门管理",   subtitle: "维护组织架构树形结构，用于数据权限范围划定" },
  "/sys/roles":       { title: "角色管理",   subtitle: "配置角色功能权限与数据权限，支持跨租户数据隔离" },
  "/sys/permissions": { title: "权限管理",   subtitle: "菜单权限与按钮权限的统一注册与维护" },
  "/sys/dicts":       { title: "字典管理",   subtitle: "维护系统字典与业务字典，统一枚举值管理" },
};

const Index = () => {
  const location = useLocation();
  const config = pageConfig[location.pathname] || { title: "系统管理", subtitle: "" };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden bg-background min-w-0">
        <PageHeader title={config.title} subtitle={config.subtitle} />
        <main className="flex-1 overflow-hidden flex flex-col">
          <Routes>
            <Route index element={<Navigate to="/sys/users" replace />} />
            <Route path="sys/users" element={<SysUserPage />} />
            <Route path="sys/departments" element={<SysDeptPage />} />
            <Route path="sys/roles" element={<SysRolePage />} />
            <Route path="sys/permissions" element={<SysPermPage />} />
            <Route path="sys/dicts" element={<SysDictPage />} />
            <Route path="*" element={<Navigate to="/sys/users" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default Index;
