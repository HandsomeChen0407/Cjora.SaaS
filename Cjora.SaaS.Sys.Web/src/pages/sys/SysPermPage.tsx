import { useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";

type NodeType = "menu" | "button";
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface PermNode {
  id: string;
  label: string;
  type: NodeType;
  parentId: string | null;
  path?: string;
  method?: HttpMethod;
  permCode?: string;
  icon?: string;
  sort: number;
  visible: boolean;
  status: "active" | "disabled";
  children?: PermNode[];
}

const MOCK_PERMS: PermNode[] = [
  { id: "m1", label: "客户管理", type: "menu", parentId: null, path: "/customer", sort: 1, visible: true, status: "active" },
  { id: "m1-1", label: "客户线索", type: "menu", parentId: "m1", path: "/customer/lead", sort: 1, visible: true, status: "active" },
  { id: "m1-1-b1", label: "新增线索", type: "button", parentId: "m1-1", permCode: "lead:add", method: "POST", sort: 1, visible: true, status: "active" },
  { id: "m1-1-b2", label: "编辑线索", type: "button", parentId: "m1-1", permCode: "lead:edit", method: "PUT", sort: 2, visible: true, status: "active" },
  { id: "m1-1-b3", label: "删除线索", type: "button", parentId: "m1-1", permCode: "lead:del", method: "DELETE", sort: 3, visible: true, status: "active" },
  { id: "m1-2", label: "商机列表", type: "menu", parentId: "m1", path: "/customer/opportunity", sort: 2, visible: true, status: "active" },
  { id: "m1-2-b1", label: "新增商机", type: "button", parentId: "m1-2", permCode: "opportunity:add", method: "POST", sort: 1, visible: true, status: "active" },
  { id: "m1-2-b2", label: "更新商机", type: "button", parentId: "m1-2", permCode: "opportunity:edit", method: "PUT", sort: 2, visible: true, status: "active" },
  { id: "m1-3", label: "客户列表", type: "menu", parentId: "m1", path: "/customer/list", sort: 3, visible: true, status: "active" },
  { id: "m2", label: "合同管理", type: "menu", parentId: null, path: "/contract", sort: 2, visible: true, status: "active" },
  { id: "m2-1", label: "合同列表", type: "menu", parentId: "m2", path: "/contract/list", sort: 1, visible: true, status: "active" },
  { id: "m2-1-b1", label: "创建合同", type: "button", parentId: "m2-1", permCode: "contract:add", method: "POST", sort: 1, visible: true, status: "active" },
  { id: "m2-1-b2", label: "审批合同", type: "button", parentId: "m2-1", permCode: "contract:approve", method: "POST", sort: 2, visible: true, status: "active" },
  { id: "m2-1-b3", label: "导出合同", type: "button", parentId: "m2-1", permCode: "contract:export", method: "GET", sort: 3, visible: true, status: "active" },
  { id: "m3", label: "项目管理", type: "menu", parentId: null, path: "/project", sort: 3, visible: true, status: "active" },
  { id: "m3-1", label: "项目列表", type: "menu", parentId: "m3", path: "/project/list", sort: 1, visible: true, status: "active" },
  { id: "m3-1-b1", label: "新增项目", type: "button", parentId: "m3-1", permCode: "project:add", method: "POST", sort: 1, visible: true, status: "active" },
  { id: "m4", label: "设备管理", type: "menu", parentId: null, path: "/device", sort: 4, visible: true, status: "active" },
  { id: "m4-1", label: "设备接入", type: "menu", parentId: "m4", path: "/device/access", sort: 1, visible: true, status: "active" },
  { id: "m4-2", label: "指令下发", type: "menu", parentId: "m4", path: "/device/command", sort: 2, visible: true, status: "active" },
  { id: "m4-2-b1", label: "批量下发", type: "button", parentId: "m4-2", permCode: "command:batch", method: "POST", sort: 1, visible: true, status: "active" },
  { id: "m5", label: "系统管理", type: "menu", parentId: null, path: "/sys", sort: 5, visible: true, status: "active" },
  { id: "m5-1", label: "用户管理", type: "menu", parentId: "m5", path: "/sys/user", sort: 1, visible: true, status: "active" },
  { id: "m5-1-b1", label: "新增用户", type: "button", parentId: "m5-1", permCode: "sys:user:add", method: "POST", sort: 1, visible: true, status: "active" },
  { id: "m5-1-b2", label: "重置密码", type: "button", parentId: "m5-1", permCode: "sys:user:reset", method: "PUT", sort: 2, visible: true, status: "active" },
  { id: "m5-2", label: "角色管理", type: "menu", parentId: "m5", path: "/sys/role", sort: 2, visible: true, status: "active" },
  { id: "m5-3", label: "权限管理", type: "menu", parentId: "m5", path: "/sys/perm", sort: 3, visible: true, status: "active" },
  { id: "m5-4", label: "字典管理", type: "menu", parentId: "m5", path: "/sys/dict", sort: 4, visible: true, status: "active" },
];

function buildPermTree(nodes: PermNode[], parentId: string | null = null): PermNode[] {
  return nodes
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => a.sort - b.sort)
    .map((n) => ({ ...n, children: buildPermTree(nodes, n.id) }));
}

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "text-success bg-success/10",
  POST: "text-primary bg-primary/10",
  PUT: "text-warning bg-warning/10",
  DELETE: "text-destructive bg-destructive/10",
  PATCH: "text-muted-foreground bg-muted",
};

interface FormData {
  label: string;
  type: NodeType;
  parentId: string | null;
  path: string;
  method: HttpMethod | "";
  permCode: string;
  sort: number;
  visible: boolean;
  status: "active" | "disabled";
}

const defaultForm: FormData = {
  label: "", type: "menu", parentId: null, path: "", method: "", permCode: "", sort: 1, visible: true, status: "active",
};

interface TreeRowProps {
  node: PermNode;
  depth: number;
  selectedId: string | null;
  expanded: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onEdit: (node: PermNode) => void;
  onDelete: (node: PermNode) => void;
  onAddChild: (parentId: string, type: NodeType) => void;
}

const TreeRow = ({ node, depth, selectedId, expanded, onSelect, onToggle, onEdit, onDelete, onAddChild }: TreeRowProps) => {
  const hasChildren = (node.children?.length || 0) > 0;
  const isExpanded = expanded.has(node.id);
  const isSelected = selectedId === node.id;
  const isButton = node.type === "button";

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
        {isButton && node.method && (
          <span className={`text-xs px-1.5 py-0.5 rounded font-mono mr-1 ${METHOD_COLORS[node.method]}`}>
            {node.method}
          </span>
        )}
        {!node.visible && (
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
  const [perms, setPerms] = useState<PermNode[]>(MOCK_PERMS);
  const [selectedId, setSelectedId] = useState<string | null>("m1");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["m1", "m2", "m3", "m4", "m5"]));
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [deleteTarget, setDeleteTarget] = useState<PermNode | null>(null);

  const tree = buildPermTree(perms);
  const selected = perms.find((p) => p.id === selectedId);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openAdd = (parentId: string | null = null, type: NodeType = "menu") => {
    setEditId(null);
    setForm({ ...defaultForm, parentId, type });
    setShowModal(true);
  };

  const openEdit = (node: PermNode) => {
    setEditId(node.id);
    setForm({
      label: node.label, type: node.type, parentId: node.parentId,
      path: node.path || "", method: node.method || "", permCode: node.permCode || "",
      sort: node.sort, visible: node.visible, status: node.status,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.label.trim()) { toast.error("权限名称不能为空"); return; }
    if (form.type === "button" && !form.permCode.trim()) { toast.error("按钮权限编码不能为空"); return; }
    if (editId) {
      setPerms((prev) => prev.map((p) => p.id === editId ? { ...p, ...form, path: form.path || undefined, method: (form.method || undefined) as HttpMethod | undefined, permCode: form.permCode || undefined } : p));
      toast.success("权限更新成功");
    } else {
      const newPerm: PermNode = {
        id: `perm_${Date.now()}`, ...form,
        path: form.path || undefined,
        method: (form.method || undefined) as HttpMethod | undefined,
        permCode: form.permCode || undefined,
      };
      setPerms((prev) => [...prev, newPerm]);
      if (form.parentId) setExpanded((prev) => new Set([...prev, form.parentId!]));
      toast.success("权限创建成功");
    }
    setShowModal(false);
    console.log("[SYS] 权限保存:", form.label, form.type);
  };

  const handleDelete = (node: PermNode) => {
    const hasChild = perms.some((p) => p.parentId === node.id);
    if (hasChild) { toast.error("请先删除子权限节点"); setDeleteTarget(null); return; }
    setPerms((prev) => prev.filter((p) => p.id !== node.id));
    if (selectedId === node.id) setSelectedId(null);
    setDeleteTarget(null);
    toast.success("权限已删除");
  };

  const stats = {
    menu: perms.filter((p) => p.type === "menu").length,
    button: perms.filter((p) => p.type === "button").length,
    total: perms.length,
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

        {/* 统计 */}
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
          {tree.map((node) => (
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
          ))}
        </div>
      </div>

      {/* 右侧详情 */}
      <div className="flex-1 overflow-y-auto bg-background p-6">
        {selected ? (
          <div className="max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                {selected.type === "button"
                  ? <MousePointer size={18} className="text-warning" />
                  : <Layout size={18} className="text-primary" />
                }
                <div>
                  <h2 className="text-base font-semibold text-foreground">{selected.label}</h2>
                  <p className="text-xs text-muted-foreground">{selected.type === "button" ? "按钮权限" : "菜单权限"}</p>
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
                  { label: "权限类型", value: selected.type === "menu" ? "菜单" : "按钮" },
                  { label: "上级节点", value: selected.parentId ? (perms.find((p) => p.id === selected.parentId)?.label || "—") : "顶级" },
                  { label: "排序", value: String(selected.sort) },
                ].map((item) => (
                  <div key={item.label} className="w-40">
                    <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                    <div className="text-sm font-medium text-foreground">{item.value}</div>
                  </div>
                ))}
                {selected.type === "menu" && selected.path && (
                  <div className="w-full">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Globe size={11} />路由路径</div>
                    <code className="text-sm font-mono text-primary bg-primary/5 px-2 py-1 rounded">{selected.path}</code>
                  </div>
                )}
                {selected.type === "button" && (
                  <>
                    {selected.permCode && (
                      <div className="w-full">
                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Lock size={11} />权限编码</div>
                        <code className="text-sm font-mono text-foreground bg-muted px-2 py-1 rounded">{selected.permCode}</code>
                      </div>
                    )}
                    {selected.method && (
                      <div className="w-40">
                        <div className="text-xs text-muted-foreground mb-1">HTTP 方法</div>
                        <span className={`text-xs px-2 py-0.5 rounded font-mono font-semibold ${METHOD_COLORS[selected.method]}`}>
                          {selected.method}
                        </span>
                      </div>
                    )}
                  </>
                )}
                <div className="w-40">
                  <div className="text-xs text-muted-foreground mb-1">是否可见</div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${selected.visible ? "status-online" : "status-offline"}`}>
                    {selected.visible ? "显示" : "隐藏"}
                  </span>
                </div>
                <div className="w-40">
                  <div className="text-xs text-muted-foreground mb-1">状态</div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${selected.status === "active" ? "status-online" : "status-offline"}`}>
                    {selected.status === "active" ? "启用" : "禁用"}
                  </span>
                </div>
              </div>
            </div>

            {/* 子节点 */}
            {selected.type === "menu" && (
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
                {perms.filter((p) => p.parentId === selected.id).length === 0 ? (
                  <div className="text-sm text-muted-foreground py-3 text-center">暂无子节点</div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {perms.filter((p) => p.parentId === selected.id).map((child) => (
                      <div
                        key={child.id}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-muted/40 hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => setSelectedId(child.id)}
                      >
                        {child.type === "button"
                          ? <MousePointer size={12} className="text-warning" />
                          : <Layout size={12} className="text-muted-foreground" />
                        }
                        <span className="text-sm flex-1 text-foreground">{child.label}</span>
                        {child.method && (
                          <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${METHOD_COLORS[child.method]}`}>{child.method}</span>
                        )}
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
                    value={form.type}
                    onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as NodeType }))}
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
                  value={form.parentId || ""}
                  onChange={(e) => setForm((p) => ({ ...p, parentId: e.target.value || null }))}
                >
                  <option value="">无（顶级）</option>
                  {perms.filter((p) => p.type === "menu" && p.id !== editId).map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
              {form.type === "menu" && (
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
              {form.type === "button" && (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-foreground mb-1.5">权限编码 <span className="text-destructive">*</span></label>
                    <input
                      className="bms-input w-full font-mono"
                      placeholder="module:action"
                      value={form.permCode}
                      onChange={(e) => setForm((p) => ({ ...p, permCode: e.target.value }))}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-foreground mb-1.5">HTTP 方法</label>
                    <select
                      className="bms-input w-full"
                      value={form.method}
                      onChange={(e) => setForm((p) => ({ ...p, method: e.target.value as HttpMethod }))}
                    >
                      <option value="">不限</option>
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                      <option value="PATCH">PATCH</option>
                    </select>
                  </div>
                </div>
              )}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground mb-1.5">排序</label>
                  <input
                    type="number"
                    className="bms-input w-full"
                    value={form.sort}
                    onChange={(e) => setForm((p) => ({ ...p, sort: Number(e.target.value) }))}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground mb-1.5">状态</label>
                  <select
                    className="bms-input w-full"
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as "active" | "disabled" }))}
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
                  checked={form.visible}
                  onChange={(e) => setForm((p) => ({ ...p, visible: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="visible" className="text-sm text-foreground cursor-pointer">在菜单中显示</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
              <button className="bms-btn-secondary" onClick={() => setShowModal(false)}>取消</button>
              <button className="bms-btn-primary" onClick={handleSave}>{editId ? "保存更改" : "创建权限"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SysPermPage;
