import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  ChevronRight,
  ChevronDown,
  Layout,
  MousePointer,
  Globe,
  Lock,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { permissionsApi, type PermissionTreeNode, type PermissionDto } from "@/api/permissions";

type NodeType = "menu" | "button";

interface FormData {
  label: string;
  nodeType: NodeType;
  parentId: number | null;
  path: string;
  permCode: string;
  icon: string;
  sortOrder: number;
  isVisible: boolean;
  isActive: boolean;
}

const defaultForm: FormData = {
  label: "", nodeType: "menu", parentId: null, path: "", permCode: "", icon: "", sortOrder: 1, isVisible: true, isActive: true,
};

function flattenTree(nodes: PermissionTreeNode[]): PermissionDto[] {
  const result: PermissionDto[] = [];
  for (const n of nodes) {
    result.push(n);
    if (n.children) result.push(...flattenTree(n.children));
  }
  return result;
}

function findNodeById(nodes: PermissionTreeNode[], id: number): PermissionTreeNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const found = findNodeById(n.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

interface TreeRowProps {
  node: PermissionTreeNode;
  depth: number;
  selectedId: number | null;
  expanded: Set<number>;
  onSelect: (id: number) => void;
  onToggle: (id: number) => void;
  onEdit: (node: PermissionTreeNode) => void;
  onDelete: (node: PermissionTreeNode) => void;
  onAddChild: (parentId: number, type: NodeType) => void;
}

const TreeRow = ({ node, depth, selectedId, expanded, onSelect, onToggle, onEdit, onDelete, onAddChild }: TreeRowProps) => {
  const hasChildren = (node.children?.length || 0) > 0;
  const isExpanded = expanded.has(node.id);
  const isSelected = selectedId === node.id;
  const isButton = node.nodeType === "button";

  return (
    <>
      <div
        className={`flex items-center py-2 px-2 rounded-md mb-0.5 cursor-pointer transition-colors group ${isSelected ? "bg-secondary" : "hover:bg-muted"}`}
        style={{ paddingLeft: `${8 + depth * 18}px` }}
        onClick={() => onSelect(node.id)}
      >
        <button
          className="w-4 h-4 flex items-center justify-center mr-1 flex-shrink-0"
          onClick={(e) => { e.stopPropagation(); !isButton && onToggle(node.id); }}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown size={12} className="text-muted-foreground" /> : <ChevronRight size={12} className="text-muted-foreground" />
          ) : <span className="w-3" />}
        </button>
        {isButton
          ? <MousePointer size={13} className="mr-1.5 text-warning flex-shrink-0" />
          : <Layout size={13} className={`mr-1.5 flex-shrink-0 ${depth === 0 ? "text-primary" : "text-muted-foreground"}`} />
        }
        <span className={`text-sm flex-1 truncate ${isButton ? "text-muted-foreground" : isSelected ? "font-medium text-foreground" : "text-foreground"}`}>
          {node.label}
        </span>
        {isButton && node.permCode && (
          <span className="text-xs px-1.5 py-0.5 rounded font-mono mr-1 bg-muted text-muted-foreground">
            {node.permCode}
          </span>
        )}
        {!node.isVisible && (
          <Lock size={11} className="text-muted-foreground mr-1" />
        )}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isButton && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onAddChild(node.id, "menu"); }} className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="添加子菜单">
                <Layout size={11} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onAddChild(node.id, "button"); }} className="p-1 rounded hover:bg-warning/10 text-muted-foreground hover:text-warning transition-colors" title="添加按钮权限">
                <MousePointer size={11} />
              </button>
            </>
          )}
          <button onClick={(e) => { e.stopPropagation(); onEdit(node); }} className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
            <Edit2 size={11} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(node); }} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 size={11} />
          </button>
        </div>
      </div>
      {isExpanded && node.children?.map((child) => (
        <TreeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          expanded={expanded}
          onSelect={onSelect}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
        />
      ))}
    </>
  );
};

const SysPermPage = () => {
  const [tree, setTree] = useState<PermissionTreeNode[]>([]);
  const [flatPerms, setFlatPerms] = useState<PermissionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [deleteTarget, setDeleteTarget] = useState<PermissionTreeNode | null>(null);

  const selected = selectedId != null ? findNodeById(tree, selectedId) : undefined;

  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await permissionsApi.getTree();
      if (res.success && res.data) {
        setTree(res.data);
        setFlatPerms(flattenTree(res.data));
        const topIds = res.data.map((n) => n.id);
        setExpanded((prev) => {
          const next = new Set(prev);
          topIds.forEach((id) => next.add(id));
          return next;
        });
        if (selectedId == null && res.data.length > 0) {
          setSelectedId(res.data[0].id);
        }
      }
    } catch (e: any) {
      toast.error("加载权限树失败: " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTree(); }, [fetchTree]);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openAdd = (parentId: number | null = null, nodeType: NodeType = "menu") => {
    setEditId(null);
    setForm({ ...defaultForm, parentId, nodeType });
    setShowModal(true);
  };

  const openEdit = (node: PermissionTreeNode) => {
    setEditId(node.id);
    setForm({
      label: node.label,
      nodeType: node.nodeType as NodeType,
      parentId: node.parentId ?? null,
      path: node.path ?? "",
      permCode: node.permCode ?? "",
      icon: node.icon ?? "",
      sortOrder: node.sortOrder,
      isVisible: node.isVisible,
      isActive: node.isActive,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.label.trim()) { toast.error("权限名称不能为空"); return; }
    if (form.nodeType === "button" && !form.permCode.trim()) { toast.error("按钮权限编码不能为空"); return; }

    setSaving(true);
    try {
      const payload = {
        label: form.label,
        nodeType: form.nodeType,
        parentId: form.parentId ?? undefined,
        path: form.path || undefined,
        permCode: form.permCode || undefined,
        icon: form.icon || undefined,
        sortOrder: form.sortOrder,
        isVisible: form.isVisible,
        isActive: form.isActive,
      };

      if (editId) {
        const res = await permissionsApi.update(editId, payload);
        if (!res.success) { toast.error(res.error ?? "更新失败"); return; }
        toast.success("权限更新成功");
      } else {
        const res = await permissionsApi.create(payload);
        if (!res.success) { toast.error(res.error ?? "创建失败"); return; }
        if (form.parentId) setExpanded((prev) => new Set([...prev, form.parentId!]));
        toast.success("权限创建成功");
      }
      setShowModal(false);
      fetchTree();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (node: PermissionTreeNode) => {
    if (node.children && node.children.length > 0) {
      toast.error("请先删除子权限节点");
      setDeleteTarget(null);
      return;
    }
    try {
      await permissionsApi.del(node.id);
      if (selectedId === node.id) setSelectedId(null);
      setDeleteTarget(null);
      toast.success("权限已删除");
      fetchTree();
    } catch (e: any) {
      toast.error("删除失败: " + e.message);
    }
  };

  const stats = {
    menu: flatPerms.filter((p) => p.nodeType === "menu").length,
    button: flatPerms.filter((p) => p.nodeType === "button").length,
  };

  return (
    <div data-cmp="SysPermPage" className="flex h-full overflow-hidden">
      {/* 左侧树 */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
          <div className="flex items-center gap-2 font-medium text-sm text-foreground">
            <Layout size={15} className="text-primary" />
            权限树
          </div>
          <button
            onClick={() => openAdd(null, "menu")}
            className="flex items-center gap-1 text-xs text-primary hover:opacity-80 transition-opacity"
          >
            <Plus size={13} />
            添加根菜单
          </button>
        </div>

        <div className="flex px-3 py-2 gap-2 border-b border-border">
          {[
            { label: "菜单", value: stats.menu, icon: <Layout size={11} className="text-primary" /> },
            { label: "按钮", value: stats.button, icon: <MousePointer size={11} className="text-warning" /> },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50">
              {s.icon}
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <span className="text-xs font-semibold text-foreground">{s.value}</span>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : tree.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">暂无权限数据</div>
          ) : (
            tree.map((node) => (
              <TreeRow
                key={node.id}
                node={node}
                depth={0}
                selectedId={selectedId}
                expanded={expanded}
                onSelect={setSelectedId}
                onToggle={toggleExpand}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onAddChild={openAdd}
              />
            ))
          )}
        </div>
      </div>

      {/* 右侧详情 */}
      <div className="flex-1 overflow-y-auto bg-background p-6">
        {selected ? (
          <div className="max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                {selected.nodeType === "button"
                  ? <MousePointer size={18} className="text-warning" />
                  : <Layout size={18} className="text-primary" />
                }
                <div>
                  <h2 className="text-base font-semibold text-foreground">{selected.label}</h2>
                  <p className="text-xs text-muted-foreground">{selected.nodeType === "button" ? "按钮权限" : "菜单权限"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="bms-btn-secondary text-xs flex items-center gap-1.5" onClick={() => openEdit(selected)}>
                  <Edit2 size={12} />
                  编辑
                </button>
                <button
                  className="text-xs flex items-center gap-1.5 px-3 py-2 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                  onClick={() => setDeleteTarget(selected)}
                >
                  <Trash2 size={12} />
                  删除
                </button>
              </div>
            </div>

            <div className="bms-card">
              <div className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider">权限详情</div>
              <div className="flex flex-wrap gap-x-8 gap-y-4">
                {[
                  { label: "权限名称", value: selected.label },
                  { label: "权限类型", value: selected.nodeType === "menu" ? "菜单" : "按钮" },
                  { label: "上级节点", value: selected.parentId ? (findNodeById(tree, selected.parentId)?.label || "—") : "顶级" },
                  { label: "排序", value: String(selected.sortOrder) },
                ].map((item) => (
                  <div key={item.label} className="w-40">
                    <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                    <div className="text-sm font-medium text-foreground">{item.value}</div>
                  </div>
                ))}
                {selected.nodeType === "menu" && selected.path && (
                  <div className="w-full">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Globe size={11} />路由路径</div>
                    <code className="text-sm font-mono text-primary bg-primary/5 px-2 py-1 rounded">{selected.path}</code>
                  </div>
                )}
                {selected.nodeType === "button" && selected.permCode && (
                  <div className="w-full">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Lock size={11} />权限编码</div>
                    <code className="text-sm font-mono text-foreground bg-muted px-2 py-1 rounded">{selected.permCode}</code>
                  </div>
                )}
                <div className="w-40">
                  <div className="text-xs text-muted-foreground mb-1">是否可见</div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${selected.isVisible ? "status-online" : "status-offline"}`}>
                    {selected.isVisible ? "显示" : "隐藏"}
                  </span>
                </div>
                <div className="w-40">
                  <div className="text-xs text-muted-foreground mb-1">状态</div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${selected.isActive ? "status-online" : "status-offline"}`}>
                    {selected.isActive ? "启用" : "禁用"}
                  </span>
                </div>
              </div>
            </div>

            {selected.nodeType === "menu" && (
              <div className="bms-card mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">子节点</div>
                  <div className="flex items-center gap-1.5">
                    <button className="text-xs text-primary hover:opacity-80 flex items-center gap-1" onClick={() => openAdd(selected.id, "menu")}>
                      <Layout size={11} /><Plus size={10} />子菜单
                    </button>
                    <button className="text-xs text-warning hover:opacity-80 flex items-center gap-1" onClick={() => openAdd(selected.id, "button")}>
                      <MousePointer size={11} /><Plus size={10} />按钮
                    </button>
                  </div>
                </div>
                {(!selected.children || selected.children.length === 0) ? (
                  <div className="text-sm text-muted-foreground py-3 text-center">暂无子节点</div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {selected.children.map((child) => (
                      <div
                        key={child.id}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-muted/40 hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => setSelectedId(child.id)}
                      >
                        {child.nodeType === "button"
                          ? <MousePointer size={12} className="text-warning" />
                          : <Layout size={12} className="text-muted-foreground" />
                        }
                        <span className="text-sm flex-1 text-foreground">{child.label}</span>
                        {child.permCode && (
                          <span className="text-xs text-muted-foreground font-mono">{child.permCode}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Layout size={40} className="mb-3 opacity-30" />
            <p className="text-sm">请从左侧选择权限节点查看详情</p>
          </div>
        )}
      </div>

      {/* 删除确认 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="bg-card rounded-xl p-6 w-80 shadow-custom">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 size={18} className="text-destructive" />
              </div>
              <div>
                <div className="font-semibold text-foreground">确认删除</div>
                <div className="text-xs text-muted-foreground mt-0.5">含子节点时无法删除</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              确定要删除「<strong className="text-foreground">{deleteTarget.label}</strong>」吗？
            </p>
            <div className="flex gap-2 justify-end">
              <button className="bms-btn-secondary text-xs px-3 py-1.5" onClick={() => setDeleteTarget(null)}>取消</button>
              <button
                className="px-3 py-1.5 rounded text-xs font-medium bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
                onClick={() => handleDelete(deleteTarget)}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新增/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="bg-card rounded-xl w-[480px] shadow-custom flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="font-semibold text-foreground">{editId ? "编辑权限" : "新增权限"}</div>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-muted transition-colors">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground mb-1.5">权限名称 <span className="text-destructive">*</span></label>
                  <input
                    className="bms-input w-full"
                    placeholder="请输入权限名称"
                    value={form.label}
                    onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground mb-1.5">权限类型</label>
                  <select
                    className="bms-input w-full"
                    value={form.nodeType}
                    onChange={(e) => setForm((p) => ({ ...p, nodeType: e.target.value as NodeType }))}
                  >
                    <option value="menu">菜单</option>
                    <option value="button">按钮</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">上级节点</label>
                <select
                  className="bms-input w-full"
                  value={form.parentId ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, parentId: e.target.value ? Number(e.target.value) : null }))}
                >
                  <option value="">无（顶级）</option>
                  {flatPerms.filter((p) => p.nodeType === "menu" && p.id !== editId).map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
              {form.nodeType === "menu" && (
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">路由路径</label>
                  <input
                    className="bms-input w-full font-mono"
                    placeholder="/module/page"
                    value={form.path}
                    onChange={(e) => setForm((p) => ({ ...p, path: e.target.value }))}
                  />
                </div>
              )}
              {form.nodeType === "button" && (
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">权限编码 <span className="text-destructive">*</span></label>
                  <input
                    className="bms-input w-full font-mono"
                    placeholder="module:action"
                    value={form.permCode}
                    onChange={(e) => setForm((p) => ({ ...p, permCode: e.target.value }))}
                  />
                </div>
              )}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground mb-1.5">排序</label>
                  <input
                    type="number"
                    className="bms-input w-full"
                    value={form.sortOrder}
                    onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value) }))}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground mb-1.5">状态</label>
                  <select
                    className="bms-input w-full"
                    value={form.isActive ? "active" : "disabled"}
                    onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === "active" }))}
                  >
                    <option value="active">启用</option>
                    <option value="disabled">禁用</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="visible"
                  checked={form.isVisible}
                  onChange={(e) => setForm((p) => ({ ...p, isVisible: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="visible" className="text-sm text-foreground cursor-pointer">在菜单中显示</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
              <button className="bms-btn-secondary" onClick={() => setShowModal(false)}>取消</button>
              <button className="bms-btn-primary flex items-center gap-1.5" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 size={13} className="animate-spin" />}
                {editId ? "保存更改" : "创建权限"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SysPermPage;
