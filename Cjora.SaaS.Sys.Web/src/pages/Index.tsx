import { useState, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import PageHeader from "../components/PageHeader";

import SysUserPage from "./sys/SysUserPage";
import SysDeptPage from "./sys/SysDeptPage";
import SysRolePage from "./sys/SysRolePage";
import SysPermPage from "./sys/SysPermPage";
import SysDictPage from "./sys/SysDictPage";

const pageConfig: Record<string, { title: string; subtitle: string; hideHeader?: boolean }> = {
  "sys-user":       { title: "用户管理",   subtitle: "管理系统用户账号、所属部门及角色分配" },
  "sys-dept":       { title: "部门管理",   subtitle: "维护组织架构树形结构，用于数据权限范围划定" },
  "sys-role":       { title: "角色管理",   subtitle: "配置角色功能权限与数据权限，支持跨租户数据隔离" },
  "sys-permission": { title: "权限管理",   subtitle: "菜单权限与按钮权限的统一注册与维护" },
  "sys-dict":       { title: "字典管理",   subtitle: "维护系统字典与业务字典，统一枚举值管理" },
};

const Index = () => {
  const [currentPage, setCurrentPage] = useState("sys-user");

  const config = pageConfig[currentPage] || pageConfig["sys-user"];

  const handleNavigate = useCallback((page: string) => {
    setCurrentPage(page);
  }, []);

  const renderPage = (page: string) => {
    switch (page) {
      case "sys-user":       return <SysUserPage />;
      case "sys-dept":       return <SysDeptPage />;
      case "sys-role":       return <SysRolePage />;
      case "sys-permission": return <SysPermPage />;
      case "sys-dict":       return <SysDictPage />;
      default:               return <SysUserPage />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden">
      <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />

      <div className="flex-1 flex flex-col overflow-hidden bg-background min-w-0">
        {!config.hideHeader && (
          <PageHeader title={config.title} subtitle={config.subtitle} />
        )}

        <main className="flex-1 overflow-hidden flex flex-col">
          {renderPage(currentPage)}
        </main>
      </div>
    </div>
  );
};

export default Index;
