import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Zap,
  Menu,
  X,
  Settings,
} from "lucide-react";

interface SidebarProps {
  currentPage?: string;
  onNavigate?: (page: string) => void;
}

interface MenuItem {
  key: string;
  label: string;
  iconName: string;
  children?: { key: string; label: string }[];
}

const menuItems: MenuItem[] = [
  {
    key: "sys",
    label: "系统管理",
    iconName: "settings",
    children: [
      { key: "sys-user",       label: "用户管理" },
      { key: "sys-dept",       label: "部门管理" },
      { key: "sys-role",       label: "角色管理" },
      { key: "sys-permission", label: "权限管理" },
      { key: "sys-dict",       label: "字典管理" },
    ],
  },
];

const IconMap: Record<string, React.FC<{ size?: number; className?: string }>> = {
  settings: Settings,
};

// ====== Desktop Sidebar ======
const DesktopSidebar = ({
  currentPage = "sys-user",
  onNavigate = () => {},
}: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["sys"]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const getParentKey = (pageKey: string) => {
    for (const item of menuItems) {
      if (item.children?.some((c) => c.key === pageKey)) return item.key;
    }
    return null;
  };

  const parentKey = getParentKey(currentPage);

  return (
    <div
      data-cmp="Sidebar"
      className="flex flex-col h-screen transition-all duration-300 flex-shrink-0"
      style={{
        width: collapsed ? 64 : 220,
        background: "var(--sidebar)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center px-4 py-5 border-b"
        style={{ borderColor: "rgba(255,255,255,0.08)", minHeight: 64 }}
      >
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
          style={{ background: "var(--primary)" }}
        >
          <Zap size={16} className="text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="ml-3 overflow-hidden">
            <div className="text-sm font-semibold text-sidebar-foreground whitespace-nowrap">
              BMS 管理平台
            </div>
            <div
              className="text-xs mt-0.5 whitespace-nowrap"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Battery Management SaaS
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1 rounded hover:bg-sidebar-accent transition-colors flex-shrink-0"
        >
          {collapsed ? (
            <Menu size={16} className="text-sidebar-foreground" />
          ) : (
            <X size={14} className="text-sidebar-foreground" />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-hide">
        {menuItems.map((group) => {
          const Icon = IconMap[group.iconName] || Battery;
          const isExpanded = expandedGroups.includes(group.key);
          const isGroupActive = parentKey === group.key;

          return (
            <div key={group.key} className="mb-1">
              <button
                onClick={() => toggleGroup(group.key)}
                className={`w-full flex items-center px-4 py-2.5 text-sm transition-colors sidebar-item-hover ${
                  isGroupActive ? "text-sidebar-foreground" : ""
                }`}
                style={{
                  color: isGroupActive
                    ? "rgba(255,255,255,0.95)"
                    : "rgba(255,255,255,0.6)",
                }}
              >
                <Icon size={16} className="flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="ml-3 flex-1 text-left font-medium">
                      {group.label}
                    </span>
                    {isExpanded ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </>
                )}
              </button>

              {!collapsed && isExpanded && group.children && (
                <div className="ml-2">
                  {group.children.map((child) => {
                    const isActive = currentPage === child.key;
                    return (
                      <button
                        key={child.key}
                        onClick={() => onNavigate(child.key)}
                        className={`w-full flex items-center pl-9 pr-4 py-2 text-sm transition-all rounded-sm mb-0.5 ${
                          isActive ? "sidebar-item-active" : "sidebar-item-hover"
                        }`}
                        style={{
                          color: isActive ? "#ffffff" : "rgba(255,255,255,0.55)",
                        }}
                      >
                        <span>{child.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div
          className="px-4 py-3 border-t"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
              style={{ background: "var(--primary)", color: "#fff" }}
            >
              A
            </div>
            <div className="overflow-hidden">
              <div
                className="text-xs font-medium truncate"
                style={{ color: "rgba(255,255,255,0.85)" }}
              >
                Admin
              </div>
              <div
                className="text-xs truncate"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                超级管理员
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ====== Mobile Top Bar + Drawer ======
const MobileSidebar = ({
  currentPage = "sys-user",
  onNavigate = () => {},
}: SidebarProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["sys"]);

  const handleNavigate = (page: string) => {
    onNavigate(page);
    setDrawerOpen(false);
  };

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const getParentKey = (pageKey: string) => {
    for (const item of menuItems) {
      if (item.children?.some((c) => c.key === pageKey)) return item.key;
    }
    return null;
  };

  const parentKey = getParentKey(currentPage);

  let currentLabel = "BMS 管理平台";
  for (const group of menuItems) {
    const child = group.children?.find((c) => c.key === currentPage);
    if (child) { currentLabel = child.label; break; }
  }

  return (
    <>
      {/* Top Bar */}
      <div
        className="flex items-center px-4 h-14 flex-shrink-0 z-30"
        style={{
          background: "var(--sidebar)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 -ml-2 rounded-md transition-colors"
          style={{ color: "rgba(255,255,255,0.8)" }}
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center ml-2 gap-2">
          <div
            className="flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0"
            style={{ background: "var(--primary)" }}
          >
            <Zap size={14} className="text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold text-sidebar-foreground">{currentLabel}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
            style={{ background: "var(--primary)", color: "#fff" }}
          >
            A
          </div>
        </div>
      </div>

      {/* Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 transition-opacity"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className="fixed top-0 left-0 h-full z-50 flex flex-col transition-transform duration-300"
        style={{
          width: 260,
          background: "var(--sidebar)",
          transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="flex items-center px-4 py-4 border-b"
          style={{ borderColor: "rgba(255,255,255,0.08)", minHeight: 64 }}
        >
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
            style={{ background: "var(--primary)" }}
          >
            <Zap size={16} className="text-primary-foreground" />
          </div>
          <div className="ml-3 overflow-hidden">
            <div className="text-sm font-semibold text-sidebar-foreground whitespace-nowrap">BMS 管理平台</div>
            <div className="text-xs mt-0.5 whitespace-nowrap" style={{ color: "rgba(255,255,255,0.4)" }}>
              Battery Management SaaS
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="ml-auto p-1.5 rounded hover:bg-sidebar-accent transition-colors"
          >
            <X size={16} className="text-sidebar-foreground" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {menuItems.map((group) => {
            const Icon = IconMap[group.iconName] || Battery;
            const isExpanded = expandedGroups.includes(group.key);
            const isGroupActive = parentKey === group.key;

            return (
              <div key={group.key} className="mb-1">
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="w-full flex items-center px-4 py-3 text-sm transition-colors sidebar-item-hover"
                  style={{
                    color: isGroupActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.6)",
                  }}
                >
                  <Icon size={17} className="flex-shrink-0" />
                  <span className="ml-3 flex-1 text-left font-medium">{group.label}</span>
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                {isExpanded && group.children && (
                  <div className="ml-2">
                    {group.children.map((child) => {
                      const isActive = currentPage === child.key;
                      return (
                        <button
                          key={child.key}
                          onClick={() => handleNavigate(child.key)}
                          className={`w-full flex items-center pl-10 pr-4 py-3 text-sm transition-all rounded-sm mb-0.5 ${
                            isActive ? "sidebar-item-active" : "sidebar-item-hover"
                          }`}
                          style={{ color: isActive ? "#ffffff" : "rgba(255,255,255,0.55)" }}
                        >
                          <span>{child.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
              style={{ background: "var(--primary)", color: "#fff" }}
            >
              A
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-medium truncate" style={{ color: "rgba(255,255,255,0.85)" }}>Admin</div>
              <div className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>超级管理员</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ====== Main Export ======
const Sidebar = ({ currentPage = "sys-user", onNavigate = () => {} }: SidebarProps) => {
  return (
    <div data-cmp="Sidebar">
      <div className="hidden md:flex h-screen">
        <DesktopSidebar currentPage={currentPage} onNavigate={onNavigate} />
      </div>
      <div className="flex md:hidden flex-col">
        <MobileSidebar currentPage={currentPage} onNavigate={onNavigate} />
      </div>
    </div>
  );
};

export default Sidebar;
