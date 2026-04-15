import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  Zap,
  Menu,
  X,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface NavChild {
  path: string;
  label: string;
}

interface NavGroup {
  key: string;
  label: string;
  icon: React.FC<{ size?: number; className?: string }>;
  children: NavChild[];
}

const navGroups: NavGroup[] = [
  {
    key: "sys",
    label: "系统管理",
    icon: Settings,
    children: [
      { path: "/sys/users",       label: "用户管理" },
      { path: "/sys/departments", label: "部门管理" },
      { path: "/sys/roles",       label: "角色管理" },
      { path: "/sys/permissions", label: "权限管理" },
      { path: "/sys/dicts",       label: "字典管理" },
    ],
  },
];

const DesktopSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["sys"]);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const activeGroup = navGroups.find(g => g.children.some(c => location.pathname === c.path));

  return (
    <div
      className="flex flex-col h-screen transition-all duration-300 flex-shrink-0"
      style={{
        width: collapsed ? 64 : 220,
        background: "var(--sidebar)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center px-4 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.08)", minHeight: 64 }}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0" style={{ background: "var(--primary)" }}>
          <Zap size={16} className="text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="ml-3 overflow-hidden">
            <div className="text-sm font-semibold text-sidebar-foreground whitespace-nowrap">Cjora SaaS</div>
            <div className="text-xs mt-0.5 whitespace-nowrap" style={{ color: "rgba(255,255,255,0.4)" }}>系统管理平台</div>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="ml-auto p-1 rounded hover:bg-sidebar-accent transition-colors flex-shrink-0">
          {collapsed ? <Menu size={16} className="text-sidebar-foreground" /> : <X size={14} className="text-sidebar-foreground" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 scrollbar-hide">
        {navGroups.map(group => {
          const Icon = group.icon;
          const isExpanded = expandedGroups.includes(group.key);
          const isGroupActive = activeGroup?.key === group.key;

          return (
            <div key={group.key} className="mb-1">
              <button
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center px-4 py-2.5 text-sm transition-colors sidebar-item-hover"
                style={{ color: isGroupActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.6)" }}
              >
                <Icon size={16} className="flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="ml-3 flex-1 text-left font-medium">{group.label}</span>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </>
                )}
              </button>
              {!collapsed && isExpanded && (
                <div className="ml-2">
                  {group.children.map(child => {
                    const isActive = location.pathname === child.path;
                    return (
                      <button
                        key={child.path}
                        onClick={() => navigate(child.path)}
                        className={`w-full flex items-center pl-9 pr-4 py-2 text-sm transition-all rounded-sm mb-0.5 ${isActive ? "sidebar-item-active" : "sidebar-item-hover"}`}
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

      {!collapsed && (
        <div className="px-4 py-3 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ background: "var(--primary)", color: "#fff" }}>
              {user?.displayName?.[0] || "U"}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="text-xs font-medium truncate" style={{ color: "rgba(255,255,255,0.85)" }}>{user?.displayName || "用户"}</div>
              <div className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{user?.roles?.[0] || "未知角色"}</div>
            </div>
            <button onClick={logout} className="p-1 rounded hover:bg-sidebar-accent transition-colors" title="退出登录">
              <LogOut size={14} style={{ color: "rgba(255,255,255,0.5)" }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const MobileSidebar = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["sys"]);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleNavigate = (path: string) => { navigate(path); setDrawerOpen(false); };

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  let currentLabel = "系统管理";
  for (const g of navGroups) {
    const c = g.children.find(c => c.path === location.pathname);
    if (c) { currentLabel = c.label; break; }
  }

  return (
    <>
      <div className="flex items-center px-4 h-14 flex-shrink-0 z-30" style={{ background: "var(--sidebar)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <button onClick={() => setDrawerOpen(true)} className="p-2 -ml-2 rounded-md transition-colors" style={{ color: "rgba(255,255,255,0.8)" }}><Menu size={20} /></button>
        <div className="flex items-center ml-2 gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0" style={{ background: "var(--primary)" }}><Zap size={14} className="text-primary-foreground" /></div>
          <span className="text-sm font-semibold text-sidebar-foreground">{currentLabel}</span>
        </div>
        <div className="ml-auto">
          <button onClick={logout} className="p-1.5 rounded hover:bg-sidebar-accent" title="退出登录"><LogOut size={16} style={{ color: "rgba(255,255,255,0.6)" }} /></button>
        </div>
      </div>

      {drawerOpen && <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setDrawerOpen(false)} />}
      <div className="fixed top-0 left-0 h-full z-50 flex flex-col transition-transform duration-300" style={{ width: 260, background: "var(--sidebar)", transform: drawerOpen ? "translateX(0)" : "translateX(-100%)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center px-4 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)", minHeight: 64 }}>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0" style={{ background: "var(--primary)" }}><Zap size={16} className="text-primary-foreground" /></div>
          <div className="ml-3"><div className="text-sm font-semibold text-sidebar-foreground">Cjora SaaS</div></div>
          <button onClick={() => setDrawerOpen(false)} className="ml-auto p-1.5 rounded hover:bg-sidebar-accent"><X size={16} className="text-sidebar-foreground" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {navGroups.map(group => {
            const Icon = group.icon;
            const isExpanded = expandedGroups.includes(group.key);
            return (
              <div key={group.key} className="mb-1">
                <button onClick={() => toggleGroup(group.key)} className="w-full flex items-center px-4 py-3 text-sm sidebar-item-hover" style={{ color: "rgba(255,255,255,0.6)" }}>
                  <Icon size={17} className="flex-shrink-0" /><span className="ml-3 flex-1 text-left font-medium">{group.label}</span>
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {isExpanded && group.children.map(child => {
                  const isActive = location.pathname === child.path;
                  return (
                    <button key={child.path} onClick={() => handleNavigate(child.path)}
                      className={`w-full flex items-center pl-10 pr-4 py-3 text-sm rounded-sm mb-0.5 ${isActive ? "sidebar-item-active" : "sidebar-item-hover"}`}
                      style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.55)" }}>
                      {child.label}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold" style={{ background: "var(--primary)", color: "#fff" }}>{user?.displayName?.[0] || "U"}</div>
            <div className="overflow-hidden"><div className="text-sm font-medium truncate" style={{ color: "rgba(255,255,255,0.85)" }}>{user?.displayName || "用户"}</div></div>
          </div>
        </div>
      </div>
    </>
  );
};

const Sidebar = () => (
  <div data-cmp="Sidebar">
    <div className="hidden md:flex h-screen"><DesktopSidebar /></div>
    <div className="flex md:hidden flex-col"><MobileSidebar /></div>
  </div>
);

export default Sidebar;
