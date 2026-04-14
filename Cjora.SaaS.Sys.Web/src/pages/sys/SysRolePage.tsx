import { useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  Shield,
  ChevronRight,
  ChevronDown,
  Database,
  Layout,
  MousePointer,
  ToggleLeft,
  ToggleRight,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

// ===== 数据范围类型 =====
type DataScope = "all" | "tenant" | "dept" | "self";

const DATA_SCOPE_OPTIONS: { value: DataScope; label: string; desc: string }[] = [
  { value: "all", label: "全部数据", desc: "可访问系统内所有数据，不受部门限制" },
  { value: "tenant", label: "本租户数据", desc: "仅能访问本租户下的数据" },
  { value: "dept", label: "指定部门数据", desc: "仅能访问所选部门及其子部门的数据" },
  { value: "self", label: "仅本人数据", desc: "只能访问自己创建或负责的数据" },
];

// ===== 部门树 =====
interface DeptNode {
  id: string;
  name: string;
  parentId: string | null;
  children?: DeptNode[];
}

const DEPT_FLAT: DeptNode[] = [
  { id: "1", name: "总公司", parentId: null },
  { id: "2", name: "技术部", parentId: "1" },
  { id: "3", name: "销售部", parentId: "1" },
  { id: "4", name: "运营部", parentId: "1" },
  { id: "5", name: "财务部", parentId: "1" },
  { id: "6", name: "研发组", parentId: "2" },
  { id: "7", name: "测试组", parentId: "2" },
  { id: "8", name: "华东区销售", parentId: "3" },
  { id: "9", name: "华南区销售", parentId: "3" },
];

function buildDeptTree(nodes: DeptNode[], parentId: string | null = null): DeptNode[] {
  return nodes
    .filter((n) => n.parentId === parentId)
    .map((n) => ({ ...n, children: buildDeptTree(nodes, n.id) }));
}

// ===== 菜单权限树 =====
interface MenuNode {
  id: string;
  label: string;
  type: "menu" | "button";
  parentId: string | null;
  children?: MenuNode[];
}

const MENU_FLAT: MenuNode[] = [
  { id: "m1", label: "客户管理", type: "menu", parentId: null },
  { id: "m1-1", label: "客户线索", type: "menu", parentId: "m1" },
  { id: "m1-1-b1", label: "新增线索", type: "button", parentId: "m1-1" },
  { id: "m1-1-b2", label: "编辑线索", type: "button", parentId: "m1-1" },
  { id: "m1-1-b3", label: "删除线索", type: "button", parentId: "m1-1" },
  { id: "m1-2", label: "商机列表", type: "menu", parentId: "m1" },
  { id: "m1-2-b1", label: "新增商机", type: "button", parentId: "m1-2" },
  { id: "m1-3", label: "客户列表", type: "menu", parentId: "m1" },
  { id: "m2", label: "合同管理", type: "menu", parentId: null },
  { id: "m2-1", label: "合同列表", type: "menu", parentId: "m2" },
  { id: "m2-1-b1", label: "创建合同", type: "button", parentId: "m2-1" },
  { id: "m2-1-b2", label: "审批合同", type: "button", parentId: "m2-1" },
  { id: "m3", label: "项目管理", type: "menu", parentId: null },
  { id: "m3-1", label: "项目列表", type: "menu", parentId: "m3" },
  { id: "m3-1-b1", label: "新增项目", type: "button", parentId: "m3-1" },
  { id: "m4", label: "设备管理", type: "menu", parentId: null },
  { id: "m4-1", label: "设备接入", type: "menu", parentId: "m4" },
  { id: "m4-2", label: "指令下发", type: "menu", parentId: "m4" },
  { id: "m4-2-b1", label: "批量下发", type: "button", parentId: "m4-2" },
  { id: "m5", label: "系统管理", type: "menu", parentId: null },
  { id: "m5-1", label: "用户管理", type: "menu", parentId: "m5" },
  { id: "m5-1-b1", label: "新增用户", type: "button", parentId: "m5-1" },
  { id: "m5-1-b2", label: "重置密码", type: "button", parentId: "m5-1" },
  { id: "m5-2", label: "角色管理", type: "menu", parentId: "m5" },
  { id: "m5-3", label: "权限管理", type: "menu", parentId: "m5" },
];

function buildMenuTree(nodes: MenuNode[], parentId: string | null = null): MenuNode[] {
  return nodes.filter((n) => n.parentId === parentId).map((n) => ({
    ...n,
    children: buildMenuTree(nodes, n.id),
  }));
}

// ===== 角色 =====
interface Role {
  id: string;
  name: string;
  code: string;
  status: "active" | "disabled";
  menuIds: string[];
  dataScope: DataScope;
  deptIds: string[];
  skipDataPerm: boolean;
  remark: string;
  createdAt: string;
}

const MOCK_ROLES: Role[] = [
  {
    id: "r1", name: "超级管理员", code: "SUPER_ADMIN", status: "active",
    menuIds: MENU_FLAT.map((m) => m.id),
    dataScope: "all", deptIds: [], skipDataPerm: true,
    remark: "拥有全部权限", createdAt: "2024-01-01",
  },
  {
    id: "r2", name: "系统管理员", code: "SYS_ADMIN", status: "active",
    menuIds: MENU_FLAT.filter((m) => m.id.startsWith("m5")).map((m) => m.id),
    dataScope: "tenant", deptIds: [], skipDataPerm: false,
    remark: "负责系统配置与用户管理", createdAt: "2024-01-05",
  },
  {
    id: "r3", name: "销售经理", code: "SALES_MGR", status: "active",
    menuIds: ["m1", "m1-1", "m1-1-b1", "m1-1-b2", "m1-2", "m1-2-b1", "m1-3", "m2", "m2-1", "m2-1-b1"],
    dataScope: "dept", deptIds: ["3", "8", "9"], skipDataPerm: false,
    remark: "管理销售部门下的客户与合同", createdAt: "2024-02-01",
  },
  {
    id: "r4", name: "技术工程师", code: "TECH_ENG", status: "active",
    menuIds: ["m4", "m4-1", "m4-2", "m4-2-b1", "m3", "m3-1"],
    dataScope: "self", deptIds: [], skipDataPerm: false,
    remark: "负责设备管理与项目技术工作", createdAt: "2024-02-15",
  },
  {
    id: "r5", name: "财务专员", code: "FIN_STAFF", status: "disabled",
    menuIds: ["m2", "m2-1"],
    dataScope: "dept", deptIds: ["5"], skipDataPerm: false,
    remark: "查看合同与资金数据", createdAt: "2024-03-01",
  },
];

// ===== 部门多选树组件 =====
interface DeptCheckTreeProps {
  nodes: DeptNode[];
  checked: string[];
  expanded: Set<string>;
  onCheck: (id: string) => void;
  onToggle: (id: string) => void;
  depth?: number;
}

const DeptCheckTree = ({ nodes, checked, expanded, onCheck, onToggle, depth = 0 }: DeptCheckTreeProps) => (
  <div>
    {nodes.map((node) => {
      const hasChildren = (node.children?.length || 0) > 0;
      const isExpanded = expanded.has(node.id);
      const isChecked = checked.includes(node.id);
      return (
        <div key={node.id}>
          <div
            className="flex items-center py-1.5 rounded hover:bg-muted transition-colors cursor-pointer"
            style={{ paddingLeft: `${8 + depth * 18}px` }}
          >
            <button
              className="w-4 h-4 flex items-center justify-center mr-1 flex-shrink-0"
              onClick={() => onToggle(node.id)}
            >
              {hasChildren ? (
                isExpanded ? <ChevronDown size={12} className="text-muted-foreground" /> : <ChevronRight size={12} className="text-muted-foreground" />
              ) : <span className="w-3" />}
            </button>
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mr-2 transition-colors ${isChecked ? "bg-primary border-primary" : "border-border"}`}
              onClick={() => onCheck(node.id)}
            >
              {isChecked && <Check size={10} className="text-primary-foreground" />}
            </div>
            <Building2 size={13} className="mr-1.5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-foreground">{node.name}</span>
          </div>
          {isExpanded && node.children && (
            <DeptCheckTree
              nodes={node.children}
              checked={checked}
              expanded={expanded}
              onCheck={onCheck}
              onToggle={onToggle}
              depth={depth + 1}
            />
          )}
        </div>
      );
    })}
  </div>
);

// ===== 菜单权限树组件 =====
interface MenuCheckTreeProps {
  nodes: MenuNode[];
  checked: string[];
  expanded: Set<string>;
  onCheck: (id: string, allChildren: string[]) => void;
  onToggle: (id: string) => void;
  depth?: number;
}

function getAllDescendantIds(node: MenuNode): string[] {
  const ids: string[] = [node.id];
  if (node.children) {
    for (const child of node.children) {
      ids.push(...getAllDescendantIds(child));
    }
  }
  return ids;
}

const MenuCheckTree = ({ nodes, checked, expanded, onCheck, onToggle, depth = 0 }: MenuCheckTreeProps) => (
  <div>
    {nodes.map((node) => {
      const hasChildren = (node.children?.length || 0) > 0;
      const isExpanded = expanded.has(node.id);
      const isChecked = checked.includes(node.id);
      const allIds = getAllDescendantIds(node);
      const isButton = node.type === "button";
      return (
        <div key={node.id}>
          <div
            className="flex items-center py-1.5 rounded hover:bg-muted/60 transition-colors"
            style={{ paddingLeft: `${8 + depth * 18}px` }}
          >
            <button
              className="w-4 h-4 flex items-center justify-center mr-1 flex-shrink-0"
              onClick={() => !isButton && onToggle(node.id)}
            >
              {hasChildren ? (
                isExpanded ? <ChevronDown size={12} className="text-muted-foreground" /> : <ChevronRight size={12} className="text-muted-foreground" />
              ) : <span className="w-3" />}
            </button>
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mr-2 cursor-pointer transition-colors ${isChecked ? "bg-primary border-primary" : "border-border"}`}
              onClick={() => onCheck(node.id, allIds)}
            >
              {isChecked && <Check size={10} className="text-primary-foreground" />}
            </div>
            {isButton
              ? <MousePointer size={12} className="mr-1.5 text-warning flex-shrink-0" />
              : <Layout size={13} className="mr-1.5 text-primary flex-shrink-0" />
            }
            <span className={`text-sm ${isButton ? "text-muted-foreground" : "text-foreground"}`}>{node.label}</span>
            {isButton && (
              <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-warning/10 text-warning">按钮</span>
            )}
          </div>
          {isExpanded && node.children && (
            <MenuCheckTree
              nodes={node.children}
              checked={checked}
              expanded={expanded}
              onCheck={onCheck}
              onToggle={onToggle}
              depth={depth + 1}
            />
          )}
        </div>
      );
    })}
  </div>
);

// ===== 主页面 =====
type ActiveTab = "list" | "edit";

const SysRolePage = () => {
  const [roles, setRoles] = useState<Role[]>(MOCK_ROLES);
  const [activeTab, setActiveTab] = useState<ActiveTab>("list");
  const [editRole, setEditRole] = useState<Role | null>(null);

  // 表单状态
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formStatus, setFormStatus] = useState<"active" | "disabled">("active");
  const [formRemark, setFormRemark] = useState("");
  const [formMenuIds, setFormMenuIds] = useState<string[]>([]);
  const [formDataScope, setFormDataScope] = useState<DataScope>("tenant");
  const [formDeptIds, setFormDeptIds] = useState<string[]>([]);
  const [formSkipDataPerm, setFormSkipDataPerm] = useState(false);

  const [menuExpanded, setMenuExpanded] = useState<Set<string>>(new Set(["m1", "m2", "m3", "m4", "m5"]));
  const [deptExpanded, setDeptExpanded] = useState<Set<string>>(new Set(["1", "3"]));
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [permTab, setPermTab] = useState<"menu" | "data">("menu");

  const menuTree = buildMenuTree(MENU_FLAT);
  const deptTree = buildDeptTree(DEPT_FLAT);

  const openAdd = () => {
    setEditRole(null);
    setFormName(""); setFormCode(""); setFormStatus("active"); setFormRemark("");
    setFormMenuIds([]); setFormDataScope("tenant"); setFormDeptIds([]); setFormSkipDataPerm(false);
    setPermTab("menu");
    setActiveTab("edit");
  };

  const openEdit = (role: Role) => {
    setEditRole(role);
    setFormName(role.name); setFormCode(role.code); setFormStatus(role.status); setFormRemark(role.remark);
    setFormMenuIds([...role.menuIds]); setFormDataScope(role.dataScope);
    setFormDeptIds([...role.deptIds]); setFormSkipDataPerm(role.skipDataPerm);
    setPermTab("menu");
    setActiveTab("edit");
    console.log("[SYS] 编辑角色:", role.name);
  };

  const handleMenuCheck = (id: string, allIds: string[]) => {
    const shouldCheck = !formMenuIds.includes(id);
    if (shouldCheck) {
      setFormMenuIds((prev) => [...new Set([...prev, ...allIds])]);
    } else {
      setFormMenuIds((prev) => prev.filter((mid) => !allIds.includes(mid)));
    }
  };

  const handleMenuToggle = (id: string) => {
    setMenuExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleDeptCheck = (id: string) => {
    setFormDeptIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleDeptToggle = (id: string) => {
    setDeptExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelectAllMenu = () => {
    if (formMenuIds.length === MENU_FLAT.length) {
      setFormMenuIds([]);
    } else {
      setFormMenuIds(MENU_FLAT.map((m) => m.id));
    }
  };

  const handleSave = () => {
    if (!formName.trim()) { toast.error("角色名称不能为空"); return; }
    if (!formCode.trim()) { toast.error("角色编码不能为空"); return; }
    if (formDataScope === "dept" && formDeptIds.length === 0) {
      toast.error("选择「指定部门数据」时，必须选择至少一个部门"); return;
    }

    if (editRole) {
      setRoles((prev) => prev.map((r) =>
        r.id === editRole.id
          ? { ...r, name: formName, code: formCode, status: formStatus, remark: formRemark, menuIds: formMenuIds, dataScope: formDataScope, deptIds: formDeptIds, skipDataPerm: formSkipDataPerm }
          : r
      ));
      toast.success("角色更新成功");
    } else {
      const newRole: Role = {
        id: `r${Date.now()}`, name: formName, code: formCode, status: formStatus, remark: formRemark,
        menuIds: formMenuIds, dataScope: formDataScope, deptIds: formDeptIds, skipDataPerm: formSkipDataPerm,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setRoles((prev) => [...prev, newRole]);
      toast.success("角色创建成功");
    }
    setActiveTab("list");
    console.log("[SYS] 角色保存:", formName, "数据范围:", formDataScope);
  };

  const handleDelete = (id: string) => {
    setRoles((prev) => prev.filter((r) => r.id !== id));
    setDeleteId(null);
    toast.success("角色已删除");
    console.log("[SYS] 删除角色:", id);
  };

  const getScopeLabel = (scope: DataScope) =>
    DATA_SCOPE_OPTIONS.find((o) => o.value === scope)?.label || scope;

  // ===== 列表视图 =====
  const ListView = () => (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between border-b border-border bg-card">
        <div className="text-sm text-muted-foreground">共 <strong className="text-foreground">{roles.length}</strong> 个角色</div>
        <button className="bms-btn-primary flex items-center gap-1.5" onClick={openAdd}>
          <Plus size={14} />
          新增角色
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bms-table-header text-muted-foreground text-xs">
              <th className="text-left px-5 py-3 font-medium w-10">#</th>
              <th className="text-left px-4 py-3 font-medium">角色信息</th>
              <th className="text-left px-4 py-3 font-medium">数据范围</th>
              <th className="text-left px-4 py-3 font-medium">菜单权限</th>
              <th className="text-left px-4 py-3 font-medium">跳过数据权限</th>
              <th className="text-left px-4 py-3 font-medium">状态</th>
              <th className="text-left px-4 py-3 font-medium">创建时间</th>
              <th className="text-left px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role, idx) => (
              <tr key={role.id} className="table-row-hover border-b border-border/50 transition-colors">
                <td className="px-5 py-3 text-muted-foreground text-xs">{idx + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Shield size={14} className="text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{role.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{role.code}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Database size={12} className="text-muted-foreground" />
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      role.dataScope === "all" ? "bg-destructive/10 text-destructive" :
                      role.dataScope === "tenant" ? "bg-primary/10 text-primary" :
                      role.dataScope === "dept" ? "bg-warning/10 text-warning" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {getScopeLabel(role.dataScope)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Layout size={12} className="text-muted-foreground" />
                    <span className="text-sm text-foreground">{role.menuIds.filter((id) => MENU_FLAT.find((m) => m.id === id && m.type === "menu")).length} 个菜单</span>
                    <span className="text-xs text-muted-foreground">/ {role.menuIds.filter((id) => MENU_FLAT.find((m) => m.id === id && m.type === "button")).length} 个按钮</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {role.skipDataPerm ? (
                    <span className="flex items-center gap-1 text-xs text-success">
                      <ToggleRight size={14} />
                      已跳过
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ToggleLeft size={14} />
                      正常校验
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${role.status === "active" ? "status-online" : "status-offline"}`}>
                    {role.status === "active" ? "启用" : "禁用"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{role.createdAt}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(role)}
                      className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-primary"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteId(role.id)}
                      className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ===== 编辑视图 =====
  const EditView = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 顶部 */}
      <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab("list")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            角色列表
          </button>
          <ChevronRight size={14} className="text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {editRole ? `编辑角色 · ${editRole.name}` : "新增角色"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="bms-btn-secondary" onClick={() => setActiveTab("list")}>取消</button>
          <button className="bms-btn-primary" onClick={handleSave}>
            {editRole ? "保存更改" : "创建角色"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl flex gap-6">
          {/* 左侧：基本信息 */}
          <div className="w-72 flex-shrink-0">
            <div className="bms-card mb-4">
              <div className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-1.5">
                <Shield size={12} />
                基本信息
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">角色名称 <span className="text-destructive">*</span></label>
                  <input
                    className="bms-input w-full"
                    placeholder="请输入角色名称"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">角色编码 <span className="text-destructive">*</span></label>
                  <input
                    className="bms-input w-full font-mono"
                    placeholder="如 SALES_MGR"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">状态</label>
                  <select
                    className="bms-input w-full"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as "active" | "disabled")}
                  >
                    <option value="active">启用</option>
                    <option value="disabled">禁用</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">备注</label>
                  <textarea
                    className="bms-input w-full resize-none"
                    rows={2}
                    placeholder="角色说明..."
                    value={formRemark}
                    onChange={(e) => setFormRemark(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 数据权限配置 */}
            <div className="bms-card">
              <div className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-1.5">
                <Database size={12} />
                数据权限配置
              </div>

              {/* 跳过数据权限开关 */}
              <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-muted/50">
                <div>
                  <div className="text-sm font-medium text-foreground">跳过数据权限</div>
                  <div className="text-xs text-muted-foreground mt-0.5">适用于超级管理员</div>
                </div>
                <button
                  onClick={() => setFormSkipDataPerm((v) => !v)}
                  className="transition-colors"
                >
                  {formSkipDataPerm
                    ? <ToggleRight size={28} className="text-success" />
                    : <ToggleLeft size={28} className="text-muted-foreground" />
                  }
                </button>
              </div>

              {!formSkipDataPerm && (
                <>
                  <div className="text-xs font-medium text-foreground mb-2">数据范围 <span className="text-destructive">*</span></div>
                  <div className="space-y-2">
                    {DATA_SCOPE_OPTIONS.map((opt) => {
                      const isSelected = formDataScope === opt.value;
                      return (
                        <div
                          key={opt.value}
                          onClick={() => setFormDataScope(opt.value)}
                          className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${isSelected ? "border-primary bg-secondary" : "border-border hover:border-primary/50 hover:bg-muted/50"}`}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 flex items-center justify-center transition-colors ${isSelected ? "border-primary" : "border-border"}`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <div>
                            <div className={`text-xs font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>{opt.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 指定部门选择 */}
                  {formDataScope === "dept" && (
                    <div className="mt-4">
                      <div className="text-xs font-medium text-foreground mb-2 flex items-center gap-1">
                        <Building2 size={12} />
                        选择部门 <span className="text-destructive">*</span>
                        <span className="ml-auto text-muted-foreground font-normal">已选 {formDeptIds.length} 个</span>
                      </div>
                      <div className="border border-border rounded-lg p-2 bg-background max-h-48 overflow-y-auto">
                        <DeptCheckTree
                          nodes={deptTree}
                          checked={formDeptIds}
                          expanded={deptExpanded}
                          onCheck={handleDeptCheck}
                          onToggle={handleDeptToggle}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 右侧：权限配置 */}
          <div className="flex-1">
            <div className="bms-card h-full">
              {/* 权限Tab */}
              <div className="flex items-center gap-1 mb-4 border-b border-border pb-3">
                <button
                  onClick={() => setPermTab("menu")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${permTab === "menu" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                >
                  <Layout size={13} />
                  功能权限（菜单+按钮）
                </button>
                <button
                  onClick={() => setPermTab("data")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${permTab === "data" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                >
                  <Database size={13} />
                  数据权限预览
                </button>
              </div>

              {permTab === "menu" && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs text-muted-foreground">
                      已选 <strong className="text-foreground">{formMenuIds.length}</strong> / {MENU_FLAT.length} 项
                    </div>
                    <button
                      onClick={handleSelectAllMenu}
                      className="text-xs text-primary hover:opacity-80 transition-opacity"
                    >
                      {formMenuIds.length === MENU_FLAT.length ? "取消全选" : "全选"}
                    </button>
                  </div>
                  <div className="border border-border rounded-lg p-3 bg-background overflow-y-auto" style={{ maxHeight: 480 }}>
                    <MenuCheckTree
                      nodes={menuTree}
                      checked={formMenuIds}
                      expanded={menuExpanded}
                      onCheck={handleMenuCheck}
                      onToggle={handleMenuToggle}
                    />
                  </div>
                </>
              )}

              {permTab === "data" && (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-muted/40 border border-border">
                    <div className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">当前数据权限配置</div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-24">数据范围：</span>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          formSkipDataPerm ? "bg-destructive/10 text-destructive" :
                          formDataScope === "all" ? "bg-destructive/10 text-destructive" :
                          formDataScope === "tenant" ? "bg-primary/10 text-primary" :
                          formDataScope === "dept" ? "bg-warning/10 text-warning" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {formSkipDataPerm ? "跳过校验（超管）" : getScopeLabel(formDataScope)}
                        </span>
                      </div>
                      {!formSkipDataPerm && formDataScope === "dept" && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-muted-foreground w-24 mt-0.5">可访问部门：</span>
                          <div className="flex flex-wrap gap-1">
                            {formDeptIds.length === 0
                              ? <span className="text-xs text-destructive">未选择部门</span>
                              : formDeptIds.map((id) => {
                                  const dept = DEPT_FLAT.find((d) => d.id === id);
                                  return dept ? (
                                    <span key={id} className="px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground">
                                      {dept.name}
                                    </span>
                                  ) : null;
                                })
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/40 border border-border">
                    <div className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">权限闭环说明</div>
                    <div className="text-xs text-muted-foreground leading-relaxed space-y-1.5">
                      <div className="flex items-start gap-1.5"><span className="text-primary mt-0.5">→</span> 用户绑定此角色后，将继承以上数据范围配置</div>
                      <div className="flex items-start gap-1.5"><span className="text-primary mt-0.5">→</span> 多角色用户取各角色数据权限的并集</div>
                      <div className="flex items-start gap-1.5"><span className="text-primary mt-0.5">→</span> 任意角色开启"跳过数据权限"，则该用户不受数据限制</div>
                      <div className="flex items-start gap-1.5"><span className="text-primary mt-0.5">→</span> 功能权限（菜单/按钮）与数据权限相互独立，同步生效</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div data-cmp="SysRolePage" className="flex flex-col h-full overflow-hidden">
      {activeTab === "list" ? <ListView /> : <EditView />}

      {/* 删除确认 */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="bg-card rounded-xl p-6 w-80 shadow-custom">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 size={18} className="text-destructive" />
              </div>
              <div>
                <div className="font-semibold text-foreground">确认删除角色</div>
                <div className="text-xs text-muted-foreground mt-0.5">关联用户将失去此角色权限</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              确定要删除角色「<strong className="text-foreground">{roles.find((r) => r.id === deleteId)?.name}</strong>」吗？
            </p>
            <div className="flex gap-2 justify-end">
              <button className="bms-btn-secondary text-xs px-3 py-1.5" onClick={() => setDeleteId(null)}>取消</button>
              <button
                className="px-3 py-1.5 rounded text-xs font-medium bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
                onClick={() => handleDelete(deleteId)}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SysRolePage;
