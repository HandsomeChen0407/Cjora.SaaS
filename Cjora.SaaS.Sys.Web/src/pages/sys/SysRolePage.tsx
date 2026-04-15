import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  Shield,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Database,
  Layout,
  MousePointer,
  ToggleLeft,
  ToggleRight,
  Building2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { rolesApi, type RoleDto } from "@/api/roles";
import { permissionsApi, type PermissionTreeNode, type PermissionDto } from "@/api/permissions";
import { departmentsApi, type DepartmentTreeNode } from "@/api/departments";

type DataScope = "all" | "tenant" | "dept" | "self";

const DATA_SCOPE_OPTIONS: { value: DataScope; label: string; desc: string }[] = [
  { value: "all", label: "全部数据", desc: "可访问系统内所有数据，不受部门限制" },
  { value: "tenant", label: "本租户数据", desc: "仅能访问本租户下的数据" },
  { value: "dept", label: "指定部门数据", desc: "仅能访问所选部门及其子部门的数据" },
  { value: "self", label: "仅本人数据", desc: "只能访问自己创建或负责的数据" },
];

// ===== Permission tree helpers =====
function flattenPermTree(nodes: PermissionTreeNode[]): PermissionDto[] {
  const result: PermissionDto[] = [];
  for (const n of nodes) {
    result.push(n);
    if (n.children) result.push(...flattenPermTree(n.children));
  }
  return result;
}

function getAllDescendantIds(node: PermissionTreeNode): number[] {
  const ids: number[] = [node.id];
  if (node.children) {
    for (const child of node.children) ids.push(...getAllDescendantIds(child));
  }
  return ids;
}

// ===== Department check tree component =====
interface DeptCheckTreeProps {
  nodes: DepartmentTreeNode[];
  checked: number[];
  expanded: Set<number>;
  onCheck: (id: number) => void;
  onToggle: (id: number) => void;
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

// ===== Permission check tree component =====
interface PermCheckTreeProps {
  nodes: PermissionTreeNode[];
  checked: number[];
  expanded: Set<number>;
  onCheck: (id: number, allChildren: number[]) => void;
  onToggle: (id: number) => void;
  depth?: number;
}

const PermCheckTree = ({ nodes, checked, expanded, onCheck, onToggle, depth = 0 }: PermCheckTreeProps) => (
  <div>
    {nodes.map((node) => {
      const hasChildren = (node.children?.length || 0) > 0;
      const isExpanded = expanded.has(node.id);
      const isChecked = checked.includes(node.id);
      const allIds = getAllDescendantIds(node);
      const isButton = node.nodeType === "button";
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
            <PermCheckTree
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

const PAGE_SIZE = 20;
type ActiveTab = "list" | "edit";

const SysRolePage = () => {
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("list");
  const [editRole, setEditRole] = useState<RoleDto | null>(null);

  const [permTree, setPermTree] = useState<PermissionTreeNode[]>([]);
  const [allPerms, setAllPerms] = useState<PermissionDto[]>([]);
  const [deptTree, setDeptTree] = useState<DepartmentTreeNode[]>([]);

  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formStatus, setFormStatus] = useState<boolean>(true);
  const [formRemark, setFormRemark] = useState("");
  const [formPermIds, setFormPermIds] = useState<number[]>([]);
  const [formDataScope, setFormDataScope] = useState<DataScope>("tenant");
  const [formDeptIds, setFormDeptIds] = useState<number[]>([]);

  const [menuExpanded, setMenuExpanded] = useState<Set<number>>(new Set());
  const [deptExpanded, setDeptExpanded] = useState<Set<number>>(new Set());
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [permTab, setPermTab] = useState<"menu" | "data">("menu");

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const fetchRoles = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await rolesApi.getPaged(p, PAGE_SIZE);
      if (res.success && res.data) {
        setRoles(res.data.items);
        setTotalCount(res.data.totalCount);
      }
    } catch (e: any) {
      toast.error("加载角色列表失败: " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRefs = useCallback(async () => {
    try {
      const [permRes, deptRes] = await Promise.all([
        permissionsApi.getTree(),
        departmentsApi.getTree(),
      ]);
      if (permRes.success && permRes.data) {
        setPermTree(permRes.data);
        setAllPerms(flattenPermTree(permRes.data));
        const topIds = permRes.data.map((n) => n.id);
        setMenuExpanded(new Set(topIds));
      }
      if (deptRes.success && deptRes.data) {
        setDeptTree(deptRes.data);
        if (deptRes.data.length > 0) setDeptExpanded(new Set([deptRes.data[0].id]));
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchRoles(page); }, [page, fetchRoles]);
  useEffect(() => { fetchRefs(); }, [fetchRefs]);

  const openAdd = () => {
    setEditRole(null);
    setFormName(""); setFormCode(""); setFormStatus(true); setFormRemark("");
    setFormPermIds([]); setFormDataScope("tenant"); setFormDeptIds([]);
    setPermTab("menu");
    setActiveTab("edit");
  };

  const openEdit = (role: RoleDto) => {
    setEditRole(role);
    setFormName(role.name); setFormCode(role.code); setFormStatus(role.isActive); setFormRemark(role.remark ?? "");
    setFormPermIds([...role.permissionIds]); setFormDataScope(role.dataScope as DataScope);
    setFormDeptIds([...role.dataScopeDeptIds]);
    setPermTab("menu");
    setActiveTab("edit");
  };

  const handleMenuCheck = (id: number, allIds: number[]) => {
    const shouldCheck = !formPermIds.includes(id);
    if (shouldCheck) {
      setFormPermIds((prev) => [...new Set([...prev, ...allIds])]);
    } else {
      setFormPermIds((prev) => prev.filter((mid) => !allIds.includes(mid)));
    }
  };

  const handleMenuToggle = (id: number) => {
    setMenuExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleDeptCheck = (id: number) => {
    setFormDeptIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleDeptToggle = (id: number) => {
    setDeptExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelectAllPerm = () => {
    if (formPermIds.length === allPerms.length) {
      setFormPermIds([]);
    } else {
      setFormPermIds(allPerms.map((m) => m.id));
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error("角色名称不能为空"); return; }
    if (!formCode.trim()) { toast.error("角色编码不能为空"); return; }
    if (formDataScope === "dept" && formDeptIds.length === 0) {
      toast.error("选择「指定部门数据」时，必须选择至少一个部门"); return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formName,
        code: formCode,
        isActive: formStatus,
        remark: formRemark || undefined,
        permissionIds: formPermIds,
        dataScope: formDataScope,
        dataScopeDeptIds: formDeptIds,
      };

      if (editRole) {
        const res = await rolesApi.update(editRole.id, payload);
        if (!res.success) { toast.error(res.error ?? "更新失败"); return; }
        toast.success("角色更新成功");
      } else {
        const res = await rolesApi.create(payload);
        if (!res.success) { toast.error(res.error ?? "创建失败"); return; }
        toast.success("角色创建成功");
      }
      setActiveTab("list");
      fetchRoles(page);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await rolesApi.del(id);
      setDeleteId(null);
      toast.success("角色已删除");
      fetchRoles(page);
    } catch (e: any) {
      toast.error("删除失败: " + e.message);
    }
  };

  const getScopeLabel = (scope: string) =>
    DATA_SCOPE_OPTIONS.find((o) => o.value === scope)?.label || scope;

  const getDeptName = (id: number) => {
    const find = (nodes: DepartmentTreeNode[]): string | null => {
      for (const n of nodes) {
        if (n.id === id) return n.name;
        if (n.children) { const found = find(n.children); if (found) return found; }
      }
      return null;
    };
    return find(deptTree) ?? String(id);
  };

  // ===== 列表视图 =====
  const ListView = () => (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between border-b border-border bg-card">
        <div className="text-sm text-muted-foreground">共 <strong className="text-foreground">{totalCount}</strong> 个角色</div>
        <button className="bms-btn-primary flex items-center gap-1.5" onClick={openAdd}>
          <Plus size={14} />
          新增角色
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bms-table-header text-muted-foreground text-xs">
                <th className="text-left px-5 py-3 font-medium w-10">#</th>
                <th className="text-left px-4 py-3 font-medium">角色信息</th>
                <th className="text-left px-4 py-3 font-medium">数据范围</th>
                <th className="text-left px-4 py-3 font-medium">权限数量</th>
                <th className="text-left px-4 py-3 font-medium">状态</th>
                <th className="text-left px-4 py-3 font-medium">创建时间</th>
                <th className="text-left px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role, idx) => (
                <tr key={role.id} className="table-row-hover border-b border-border/50 transition-colors">
                  <td className="px-5 py-3 text-muted-foreground text-xs">{(page - 1) * PAGE_SIZE + idx + 1}</td>
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
                      <span className="text-sm text-foreground">{role.permissionIds.length} 项</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${role.isActive ? "status-online" : "status-offline"}`}>
                      {role.isActive ? "启用" : "禁用"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{role.createdAtUtc?.split("T")[0]}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(role)}
                        className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-primary"
                      >
                        <Edit2 size={13} />
                      </button>
                      {!role.isSystem && (
                        <button
                          onClick={() => setDeleteId(role.id)}
                          className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {roles.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-muted-foreground text-sm">暂无角色数据</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex-shrink-0 px-6 py-3 flex items-center justify-between border-t border-border bg-card">
          <span className="text-xs text-muted-foreground">共 {totalCount} 条</span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="p-1.5 rounded hover:bg-muted disabled:opacity-40 transition-colors">
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) pageNum = i + 1;
              else if (page <= 4) pageNum = i + 1;
              else if (page >= totalPages - 3) pageNum = totalPages - 6 + i;
              else pageNum = page - 3 + i;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded text-xs transition-colors ${page === pageNum ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="p-1.5 rounded hover:bg-muted disabled:opacity-40 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ===== 编辑视图 =====
  const EditView = () => (
    <div className="flex flex-col h-full overflow-hidden">
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
          <button className="bms-btn-primary flex items-center gap-1.5" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 size={13} className="animate-spin" />}
            {editRole ? "保存更改" : "创建角色"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl flex gap-6">
          {/* 左侧：基本信息 + 数据权限 */}
          <div className="w-72 flex-shrink-0">
            <div className="bms-card mb-4">
              <div className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-1.5">
                <Shield size={12} />
                基本信息
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">角色名称 <span className="text-destructive">*</span></label>
                  <input className="bms-input w-full" placeholder="请输入角色名称" value={formName} onChange={(e) => setFormName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">角色编码 <span className="text-destructive">*</span></label>
                  <input className="bms-input w-full font-mono" placeholder="如 SALES_MGR" value={formCode} onChange={(e) => setFormCode(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">状态</label>
                  <select className="bms-input w-full" value={formStatus ? "active" : "disabled"} onChange={(e) => setFormStatus(e.target.value === "active")}>
                    <option value="active">启用</option>
                    <option value="disabled">禁用</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">备注</label>
                  <textarea className="bms-input w-full resize-none" rows={2} placeholder="角色说明..." value={formRemark} onChange={(e) => setFormRemark(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="bms-card">
              <div className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-1.5">
                <Database size={12} />
                数据权限配置
              </div>

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
            </div>
          </div>

          {/* 右侧：权限配置 */}
          <div className="flex-1">
            <div className="bms-card h-full">
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
                      已选 <strong className="text-foreground">{formPermIds.length}</strong> / {allPerms.length} 项
                    </div>
                    <button onClick={handleSelectAllPerm} className="text-xs text-primary hover:opacity-80 transition-opacity">
                      {formPermIds.length === allPerms.length ? "取消全选" : "全选"}
                    </button>
                  </div>
                  <div className="border border-border rounded-lg p-3 bg-background overflow-y-auto" style={{ maxHeight: 480 }}>
                    {permTree.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-8">暂无权限数据</div>
                    ) : (
                      <PermCheckTree
                        nodes={permTree}
                        checked={formPermIds}
                        expanded={menuExpanded}
                        onCheck={handleMenuCheck}
                        onToggle={handleMenuToggle}
                      />
                    )}
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
                          formDataScope === "all" ? "bg-destructive/10 text-destructive" :
                          formDataScope === "tenant" ? "bg-primary/10 text-primary" :
                          formDataScope === "dept" ? "bg-warning/10 text-warning" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {getScopeLabel(formDataScope)}
                        </span>
                      </div>
                      {formDataScope === "dept" && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-muted-foreground w-24 mt-0.5">可访问部门：</span>
                          <div className="flex flex-wrap gap-1">
                            {formDeptIds.length === 0
                              ? <span className="text-xs text-destructive">未选择部门</span>
                              : formDeptIds.map((id) => (
                                  <span key={id} className="px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground">
                                    {getDeptName(id)}
                                  </span>
                                ))
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
