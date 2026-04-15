import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  ChevronRight,
  ChevronDown,
  Building2,
  FolderOpen,
  Folder,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { departmentsApi, type DepartmentTreeNode, type DepartmentDto } from "@/api/departments";

interface FormData {
  name: string;
  code: string;
  parentId: number | null;
  leader: string;
  phone: string;
  sortOrder: number;
  isActive: boolean;
}

const defaultForm: FormData = {
  name: "", code: "", parentId: null, leader: "", phone: "", sortOrder: 1, isActive: true,
};

interface TreeNodeProps {
  node: DepartmentTreeNode;
  depth: number;
  selected: number | null;
  expanded: Set<number>;
  onSelect: (id: number) => void;
  onToggle: (id: number) => void;
  onEdit: (node: DepartmentTreeNode) => void;
  onDelete: (node: DepartmentTreeNode) => void;
  onAddChild: (parentId: number) => void;
}

const TreeNodeRow = ({
  node, depth, selected, expanded, onSelect, onToggle, onEdit, onDelete, onAddChild,
}: TreeNodeProps) => {
  const hasChildren = (node.children?.length || 0) > 0;
  const isExpanded = expanded.has(node.id);
  const isSelected = selected === node.id;

  return (
    <>
      <div
        className={`flex items-center py-2.5 px-3 cursor-pointer rounded-lg mb-0.5 transition-colors group ${isSelected ? "bg-secondary text-secondary-foreground" : "hover:bg-muted"}`}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
        onClick={() => onSelect(node.id)}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
          className="mr-1.5 flex-shrink-0 w-4 h-4 flex items-center justify-center"
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown size={13} className="text-muted-foreground" /> : <ChevronRight size={13} className="text-muted-foreground" />
          ) : (
            <span className="w-3 h-3" />
          )}
        </button>
        {hasChildren
          ? <FolderOpen size={15} className={`mr-2 flex-shrink-0 ${isSelected ? "text-secondary-foreground" : "text-primary"}`} />
          : <Folder size={15} className={`mr-2 flex-shrink-0 ${isSelected ? "text-secondary-foreground" : "text-muted-foreground"}`} />
        }
        <span className={`text-sm flex-1 truncate ${isSelected ? "font-medium" : ""}`}>{node.name}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }}
            className="p-1 rounded hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary"
            title="添加子部门"
          >
            <Plus size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(node); }}
            className="p-1 rounded hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary"
            title="编辑"
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(node); }}
            className="p-1 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
            title="删除"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      {isExpanded && node.children?.map((child) => (
        <TreeNodeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          selected={selected}
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

function flattenTree(nodes: DepartmentTreeNode[]): DepartmentTreeNode[] {
  const result: DepartmentTreeNode[] = [];
  for (const n of nodes) {
    result.push(n);
    if (n.children) result.push(...flattenTree(n.children));
  }
  return result;
}

function findNodeById(nodes: DepartmentTreeNode[], id: number): DepartmentTreeNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const found = findNodeById(n.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

function collectIds(nodes: DepartmentTreeNode[]): number[] {
  const ids: number[] = [];
  for (const n of nodes) {
    ids.push(n.id);
    if (n.children) ids.push(...collectIds(n.children));
  }
  return ids;
}

const SysDeptPage = () => {
  const [tree, setTree] = useState<DepartmentTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [deleteTarget, setDeleteTarget] = useState<DepartmentTreeNode | null>(null);

  const flatDepts = flattenTree(tree);
  const selected = selectedId != null ? findNodeById(tree, selectedId) : undefined;

  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await departmentsApi.getTree();
      if (res.success && res.data) {
        setTree(res.data);
        const allIds = collectIds(res.data);
        setExpanded(new Set(allIds.slice(0, 10)));
        if (!selectedId && res.data.length > 0) {
          setSelectedId(res.data[0].id);
        }
      }
    } catch (e: any) {
      toast.error("加载部门树失败: " + e.message);
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

  const openAdd = (parentId: number | null = null) => {
    setEditId(null);
    setForm({ ...defaultForm, parentId });
    setShowModal(true);
  };

  const openEdit = (node: DepartmentTreeNode) => {
    setEditId(node.id);
    setForm({
      name: node.name,
      code: node.code ?? "",
      parentId: node.parentId ?? null,
      leader: node.leader ?? "",
      phone: node.phone ?? "",
      sortOrder: node.sortOrder,
      isActive: node.isActive,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("部门名称不能为空"); return; }

    setSaving(true);
    try {
      if (editId) {
        const res = await departmentsApi.update(editId, {
          name: form.name,
          code: form.code || undefined,
          parentId: form.parentId ?? undefined,
          leader: form.leader || undefined,
          phone: form.phone || undefined,
          sortOrder: form.sortOrder,
          isActive: form.isActive,
        });
        if (!res.success) { toast.error(res.error ?? "更新失败"); return; }
        toast.success("部门信息已更新");
      } else {
        const res = await departmentsApi.create({
          name: form.name,
          code: form.code || undefined,
          parentId: form.parentId ?? undefined,
          leader: form.leader || undefined,
          phone: form.phone || undefined,
          sortOrder: form.sortOrder,
          isActive: form.isActive,
        });
        if (!res.success) { toast.error(res.error ?? "创建失败"); return; }
        if (form.parentId) {
          setExpanded((prev) => new Set([...prev, form.parentId!]));
        }
        toast.success("部门创建成功");
      }
      setShowModal(false);
      fetchTree();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (node: DepartmentTreeNode) => {
    if (node.children && node.children.length > 0) {
      toast.error("请先删除子部门");
      setDeleteTarget(null);
      return;
    }
    try {
      await departmentsApi.del(node.id);
      if (selectedId === node.id) setSelectedId(null);
      setDeleteTarget(null);
      toast.success("部门已删除");
      fetchTree();
    } catch (e: any) {
      toast.error("删除失败: " + e.message);
    }
  };

  const getParentName = (parentId?: number | null) => {
    if (!parentId) return "无（顶级）";
    const node = findNodeById(tree, parentId);
    return node?.name ?? "—";
  };

  const childrenOfSelected = selected?.children ?? [];

  return (
    <div data-cmp="SysDeptPage" className="flex h-full overflow-hidden gap-0">
      {/* 左侧树 */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
          <div className="flex items-center gap-2 font-medium text-sm text-foreground">
            <Building2 size={15} className="text-primary" />
            组织架构
          </div>
          <button
            onClick={() => openAdd(null)}
            className="flex items-center gap-1 text-xs text-primary hover:opacity-80 transition-opacity"
          >
            <Plus size={13} />
            添加
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : tree.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">暂无部门</div>
          ) : (
            tree.map((node) => (
              <TreeNodeRow
                key={node.id}
                node={node}
                depth={0}
                selected={selectedId}
                expanded={expanded}
                onSelect={setSelectedId}
                onToggle={toggleExpand}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onAddChild={(pid) => openAdd(pid)}
              />
            ))
          )}
        </div>
      </div>

      {/* 右侧详情 */}
      <div className="flex-1 overflow-y-auto bg-background p-6">
        {selected ? (
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Building2 size={18} className="text-primary" />
                  {selected.name}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">部门详细信息</p>
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

            <div className="bms-card mb-4">
              <div className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider">基本信息</div>
              <div className="flex flex-wrap gap-x-8 gap-y-4">
                {[
                  { label: "部门名称", value: selected.name },
                  { label: "部门编码", value: selected.code ?? "—" },
                  { label: "上级部门", value: getParentName(selected.parentId) },
                  { label: "负责人", value: selected.leader || "—" },
                  { label: "联系电话", value: selected.phone || "—" },
                  { label: "排序", value: String(selected.sortOrder) },
                ].map((item) => (
                  <div key={item.label} className="w-40">
                    <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                    <div className="text-sm font-medium text-foreground">{item.value}</div>
                  </div>
                ))}
                <div className="w-40">
                  <div className="text-xs text-muted-foreground mb-1">状态</div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${selected.isActive ? "status-online" : "status-offline"}`}>
                    {selected.isActive ? "启用" : "禁用"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bms-card">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">子部门</div>
                <button
                  className="text-xs text-primary hover:opacity-80 flex items-center gap-1"
                  onClick={() => openAdd(selected.id)}
                >
                  <Plus size={12} />
                  添加子部门
                </button>
              </div>
              {childrenOfSelected.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">暂无子部门</div>
              ) : (
                <div className="flex flex-col gap-1">
                  {childrenOfSelected.map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-muted/40 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => setSelectedId(child.id)}
                    >
                      <Folder size={14} className="text-muted-foreground" />
                      <span className="text-sm text-foreground flex-1">{child.name}</span>
                      <span className="text-xs text-muted-foreground">{child.code}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Building2 size={40} className="mb-3 opacity-30" />
            <p className="text-sm">请从左侧选择部门查看详情</p>
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
                <div className="text-xs text-muted-foreground mt-0.5">删除部门将影响关联用户</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              确定要删除部门「<strong className="text-foreground">{deleteTarget.name}</strong>」吗？
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
              <div className="font-semibold text-foreground">{editId ? "编辑部门" : "新增部门"}</div>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-muted transition-colors">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground mb-1.5">部门名称 <span className="text-destructive">*</span></label>
                  <input
                    className="bms-input w-full"
                    placeholder="请输入部门名称"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground mb-1.5">部门编码</label>
                  <input
                    className="bms-input w-full"
                    placeholder="如 TECH"
                    value={form.code}
                    onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">上级部门</label>
                <select
                  className="bms-input w-full"
                  value={form.parentId ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, parentId: e.target.value ? Number(e.target.value) : null }))}
                >
                  <option value="">无（顶级部门）</option>
                  {flatDepts.filter((d) => d.id !== editId).map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground mb-1.5">负责人</label>
                  <input
                    className="bms-input w-full"
                    placeholder="请输入负责人姓名"
                    value={form.leader}
                    onChange={(e) => setForm((p) => ({ ...p, leader: e.target.value }))}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground mb-1.5">联系电话</label>
                  <input
                    className="bms-input w-full"
                    placeholder="请输入联系电话"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
              </div>
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
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
              <button className="bms-btn-secondary" onClick={() => setShowModal(false)}>取消</button>
              <button className="bms-btn-primary flex items-center gap-1.5" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 size={13} className="animate-spin" />}
                {editId ? "保存更改" : "创建部门"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SysDeptPage;
