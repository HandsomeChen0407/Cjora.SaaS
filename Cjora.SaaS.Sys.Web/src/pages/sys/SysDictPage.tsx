import { useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  Lock,
  Unlock,
  Tag,
  List,
} from "lucide-react";
import { toast } from "sonner";

type DictCategory = "system" | "business";

interface DictType {
  id: string;
  name: string;
  code: string;
  category: DictCategory;
  remark: string;
  status: "active" | "disabled";
  locked: boolean; // 系统字典锁定
  createdAt: string;
}

interface DictItem {
  id: string;
  typeId: string;
  label: string;
  value: string;
  sort: number;
  status: "active" | "disabled";
  remark: string;
}

const MOCK_DICT_TYPES: DictType[] = [
  { id: "dt1", name: "数据范围类型", code: "DATA_SCOPE", category: "system", remark: "用于角色数据权限配置", status: "active", locked: true, createdAt: "2024-01-01" },
  { id: "dt2", name: "用户状态", code: "USER_STATUS", category: "system", remark: "启用/禁用", status: "active", locked: true, createdAt: "2024-01-01" },
  { id: "dt3", name: "性别", code: "GENDER", category: "system", remark: "通用性别字典", status: "active", locked: true, createdAt: "2024-01-01" },
  { id: "dt4", name: "合同类型", code: "CONTRACT_TYPE", category: "business", remark: "业务合同分类", status: "active", locked: false, createdAt: "2024-02-01" },
  { id: "dt5", name: "设备状态", code: "DEVICE_STATUS", category: "business", remark: "IoT设备在线状态", status: "active", locked: false, createdAt: "2024-02-05" },
  { id: "dt6", name: "商机阶段", code: "OPP_STAGE", category: "business", remark: "CRM商机流转阶段", status: "active", locked: false, createdAt: "2024-03-01" },
  { id: "dt7", name: "项目状态", code: "PROJECT_STATUS", category: "business", remark: "项目生命周期状态", status: "active", locked: false, createdAt: "2024-03-15" },
];

const MOCK_DICT_ITEMS: DictItem[] = [
  // DATA_SCOPE
  { id: "di1", typeId: "dt1", label: "全部数据", value: "all", sort: 1, status: "active", remark: "" },
  { id: "di2", typeId: "dt1", label: "本租户数据", value: "tenant", sort: 2, status: "active", remark: "" },
  { id: "di3", typeId: "dt1", label: "指定部门数据", value: "dept", sort: 3, status: "active", remark: "" },
  { id: "di4", typeId: "dt1", label: "仅本人数据", value: "self", sort: 4, status: "active", remark: "" },
  // USER_STATUS
  { id: "di5", typeId: "dt2", label: "启用", value: "active", sort: 1, status: "active", remark: "" },
  { id: "di6", typeId: "dt2", label: "禁用", value: "disabled", sort: 2, status: "active", remark: "" },
  // GENDER
  { id: "di7", typeId: "dt3", label: "男", value: "male", sort: 1, status: "active", remark: "" },
  { id: "di8", typeId: "dt3", label: "女", value: "female", sort: 2, status: "active", remark: "" },
  { id: "di9", typeId: "dt3", label: "未知", value: "unknown", sort: 3, status: "active", remark: "" },
  // CONTRACT_TYPE
  { id: "di10", typeId: "dt4", label: "销售合同", value: "sale", sort: 1, status: "active", remark: "" },
  { id: "di11", typeId: "dt4", label: "采购合同", value: "purchase", sort: 2, status: "active", remark: "" },
  { id: "di12", typeId: "dt4", label: "服务合同", value: "service", sort: 3, status: "active", remark: "" },
  { id: "di13", typeId: "dt4", label: "框架协议", value: "framework", sort: 4, status: "active", remark: "" },
  // DEVICE_STATUS
  { id: "di14", typeId: "dt5", label: "在线", value: "online", sort: 1, status: "active", remark: "" },
  { id: "di15", typeId: "dt5", label: "离线", value: "offline", sort: 2, status: "active", remark: "" },
  { id: "di16", typeId: "dt5", label: "故障", value: "error", sort: 3, status: "active", remark: "" },
  { id: "di17", typeId: "dt5", label: "维护中", value: "maintenance", sort: 4, status: "active", remark: "" },
  // OPP_STAGE
  { id: "di18", typeId: "dt6", label: "初步接触", value: "contact", sort: 1, status: "active", remark: "" },
  { id: "di19", typeId: "dt6", label: "需求确认", value: "requirement", sort: 2, status: "active", remark: "" },
  { id: "di20", typeId: "dt6", label: "方案报价", value: "proposal", sort: 3, status: "active", remark: "" },
  { id: "di21", typeId: "dt6", label: "商务谈判", value: "negotiation", sort: 4, status: "active", remark: "" },
  { id: "di22", typeId: "dt6", label: "已赢单", value: "won", sort: 5, status: "active", remark: "" },
  { id: "di23", typeId: "dt6", label: "已输单", value: "lost", sort: 6, status: "active", remark: "" },
  // PROJECT_STATUS
  { id: "di24", typeId: "dt7", label: "规划中", value: "planning", sort: 1, status: "active", remark: "" },
  { id: "di25", typeId: "dt7", label: "进行中", value: "active", sort: 2, status: "active", remark: "" },
  { id: "di26", typeId: "dt7", label: "已完成", value: "done", sort: 3, status: "active", remark: "" },
  { id: "di27", typeId: "dt7", label: "已暂停", value: "paused", sort: 4, status: "disabled", remark: "" },
];

interface TypeFormData { name: string; code: string; category: DictCategory; remark: string; status: "active" | "disabled"; }
interface ItemFormData { label: string; value: string; sort: number; status: "active" | "disabled"; remark: string; }

const defaultTypeForm: TypeFormData = { name: "", code: "", category: "business", remark: "", status: "active" };
const defaultItemForm: ItemFormData = { label: "", value: "", sort: 1, status: "active", remark: "" };

const SysDictPage = () => {
  const [dictTypes, setDictTypes] = useState<DictType[]>(MOCK_DICT_TYPES);
  const [dictItems, setDictItems] = useState<DictItem[]>(MOCK_DICT_ITEMS);
  const [activeTypeId, setActiveTypeId] = useState<string>("dt1");
  const [filterCat, setFilterCat] = useState<DictCategory | "all">("all");
  const [typeSearch, setTypeSearch] = useState("");

  // 字典类型弹窗
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editTypeId, setEditTypeId] = useState<string | null>(null);
  const [typeForm, setTypeForm] = useState<TypeFormData>(defaultTypeForm);
  const [deleteTypeId, setDeleteTypeId] = useState<string | null>(null);

  // 字典项弹窗
  const [showItemModal, setShowItemModal] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormData>(defaultItemForm);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  const activeType = dictTypes.find((t) => t.id === activeTypeId);
  const activeItems = dictItems
    .filter((i) => i.typeId === activeTypeId)
    .sort((a, b) => a.sort - b.sort);

  const filteredTypes = dictTypes.filter((t) => {
    const matchCat = filterCat === "all" || t.category === filterCat;
    const matchSearch = !typeSearch || t.name.includes(typeSearch) || t.code.includes(typeSearch);
    return matchCat && matchSearch;
  });

  // ===== 字典类型操作 =====
  const openAddType = () => {
    setEditTypeId(null);
    setTypeForm(defaultTypeForm);
    setShowTypeModal(true);
  };

  const openEditType = (t: DictType) => {
    if (t.locked) { toast.warning("系统字典不允许修改"); return; }
    setEditTypeId(t.id);
    setTypeForm({ name: t.name, code: t.code, category: t.category, remark: t.remark, status: t.status });
    setShowTypeModal(true);
  };

  const handleSaveType = () => {
    if (!typeForm.name.trim()) { toast.error("字典名称不能为空"); return; }
    if (!typeForm.code.trim()) { toast.error("字典编码不能为空"); return; }
    if (editTypeId) {
      setDictTypes((prev) => prev.map((t) => t.id === editTypeId ? { ...t, ...typeForm } : t));
      toast.success("字典类型已更新");
    } else {
      const newType: DictType = {
        id: `dt${Date.now()}`, ...typeForm, locked: false,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setDictTypes((prev) => [...prev, newType]);
      setActiveTypeId(newType.id);
      toast.success("字典类型已创建");
    }
    setShowTypeModal(false);
    console.log("[SYS] 字典类型保存:", typeForm.code);
  };

  const handleDeleteType = (id: string) => {
    const t = dictTypes.find((d) => d.id === id);
    if (t?.locked) { toast.error("系统字典不允许删除"); setDeleteTypeId(null); return; }
    setDictTypes((prev) => prev.filter((d) => d.id !== id));
    setDictItems((prev) => prev.filter((i) => i.typeId !== id));
    if (activeTypeId === id) setActiveTypeId(dictTypes[0]?.id || "");
    setDeleteTypeId(null);
    toast.success("字典类型已删除");
  };

  // ===== 字典项操作 =====
  const openAddItem = () => {
    setEditItemId(null);
    setItemForm({ ...defaultItemForm, sort: activeItems.length + 1 });
    setShowItemModal(true);
  };

  const openEditItem = (item: DictItem) => {
    if (activeType?.locked) { toast.warning("系统字典的字典项不允许修改"); return; }
    setEditItemId(item.id);
    setItemForm({ label: item.label, value: item.value, sort: item.sort, status: item.status, remark: item.remark });
    setShowItemModal(true);
  };

  const handleSaveItem = () => {
    if (!itemForm.label.trim()) { toast.error("标签不能为空"); return; }
    if (!itemForm.value.trim()) { toast.error("值不能为空"); return; }
    if (editItemId) {
      setDictItems((prev) => prev.map((i) => i.id === editItemId ? { ...i, ...itemForm } : i));
      toast.success("字典项已更新");
    } else {
      const newItem: DictItem = { id: `di${Date.now()}`, typeId: activeTypeId, ...itemForm };
      setDictItems((prev) => [...prev, newItem]);
      toast.success("字典项已添加");
    }
    setShowItemModal(false);
    console.log("[SYS] 字典项保存:", itemForm.value);
  };

  const handleDeleteItem = (id: string) => {
    if (activeType?.locked) { toast.error("系统字典项不允许删除"); setDeleteItemId(null); return; }
    setDictItems((prev) => prev.filter((i) => i.id !== id));
    setDeleteItemId(null);
    toast.success("字典项已删除");
  };

  return (
    <div data-cmp="SysDictPage" className="flex h-full overflow-hidden">
      {/* 左侧：字典类型列表 */}
      <div className="w-64 flex-shrink-0 flex flex-col border-r border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
          <div className="flex items-center gap-2 font-medium text-sm text-foreground">
            <Tag size={14} className="text-primary" />
            字典类型
          </div>
          <button
            onClick={openAddType}
            className="flex items-center gap-1 text-xs text-primary hover:opacity-80"
          >
            <Plus size={13} />
          </button>
        </div>

        {/* 搜索 + 分类过滤 */}
        <div className="px-3 py-2.5 space-y-2 border-b border-border">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className="bms-input text-xs pl-8 w-full"
              placeholder="搜索..."
              value={typeSearch}
              onChange={(e) => setTypeSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            {(["all", "system", "business"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className={`flex-1 text-xs py-1 rounded transition-colors ${filterCat === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                {cat === "all" ? "全部" : cat === "system" ? "系统" : "业务"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filteredTypes.map((t) => {
            const isActive = t.id === activeTypeId;
            return (
              <div
                key={t.id}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg mb-0.5 cursor-pointer transition-colors group ${isActive ? "bg-secondary text-secondary-foreground" : "hover:bg-muted"}`}
                onClick={() => setActiveTypeId(t.id)}
              >
                {t.locked
                  ? <Lock size={12} className={`flex-shrink-0 ${isActive ? "text-secondary-foreground" : "text-muted-foreground"}`} />
                  : <Unlock size={12} className={`flex-shrink-0 ${isActive ? "text-secondary-foreground" : "text-muted-foreground"}`} />
                }
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-medium truncate ${isActive ? "text-secondary-foreground" : "text-foreground"}`}>{t.name}</div>
                  <div className={`text-xs font-mono truncate ${isActive ? "opacity-70" : "text-muted-foreground"}`}>{t.code}</div>
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                  t.category === "system"
                    ? isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
                    : isActive ? "bg-success-foreground/20 text-success-foreground" : "bg-success/10 text-success"
                }`}>
                  {t.category === "system" ? "系统" : "业务"}
                </span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!t.locked && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); openEditType(t); }} className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                        <Edit2 size={11} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteTypeId(t.id); }} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 size={11} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 右侧：字典项 */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {activeType ? (
          <>
            {/* 右侧顶部 */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-border bg-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                {activeType.locked
                  ? <Lock size={15} className="text-muted-foreground" />
                  : <Unlock size={15} className="text-primary" />
                }
                <div>
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    {activeType.name}
                    <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{activeType.code}</code>
                    {activeType.locked && (
                      <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-1">
                        <Lock size={10} />
                        系统锁定
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{activeType.remark || "暂无说明"}</div>
                </div>
              </div>
              {!activeType.locked && (
                <button className="bms-btn-primary flex items-center gap-1.5 text-xs" onClick={openAddItem}>
                  <Plus size={13} />
                  添加字典项
                </button>
              )}
            </div>

            {/* 字典项表格 */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bms-table-header text-muted-foreground text-xs">
                    <th className="text-left px-5 py-3 font-medium w-10">排序</th>
                    <th className="text-left px-4 py-3 font-medium">标签（Label）</th>
                    <th className="text-left px-4 py-3 font-medium">值（Value）</th>
                    <th className="text-left px-4 py-3 font-medium">备注</th>
                    <th className="text-left px-4 py-3 font-medium">状态</th>
                    {!activeType.locked && <th className="text-left px-4 py-3 font-medium">操作</th>}
                  </tr>
                </thead>
                <tbody>
                  {activeItems.map((item) => (
                    <tr key={item.id} className="table-row-hover border-b border-border/50 transition-colors">
                      <td className="px-5 py-3 text-xs text-muted-foreground">{item.sort}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <List size={12} className="text-muted-foreground" />
                          <span className="font-medium text-foreground">{item.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-foreground">{item.value}</code>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{item.remark || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.status === "active" ? "status-online" : "status-offline"}`}>
                          {item.status === "active" ? "启用" : "禁用"}
                        </span>
                      </td>
                      {!activeType.locked && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditItem(item)}
                              className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-primary"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteItemId(item.id)}
                              className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {activeItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">暂无字典项</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Tag size={40} className="mb-3 opacity-30" />
            <p className="text-sm">请从左侧选择字典类型</p>
          </div>
        )}
      </div>

      {/* 删除字典类型确认 */}
      {deleteTypeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="bg-card rounded-xl p-6 w-80 shadow-custom">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 size={18} className="text-destructive" />
              </div>
              <div>
                <div className="font-semibold text-foreground">删除字典类型</div>
                <div className="text-xs text-muted-foreground mt-0.5">关联字典项将一并删除</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              确定删除「<strong className="text-foreground">{dictTypes.find((d) => d.id === deleteTypeId)?.name}</strong>」及其全部字典项？
            </p>
            <div className="flex gap-2 justify-end">
              <button className="bms-btn-secondary text-xs px-3 py-1.5" onClick={() => setDeleteTypeId(null)}>取消</button>
              <button
                className="px-3 py-1.5 rounded text-xs font-medium bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
                onClick={() => handleDeleteType(deleteTypeId)}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除字典项确认 */}
      {deleteItemId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="bg-card rounded-xl p-6 w-80 shadow-custom">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 size={18} className="text-destructive" />
              </div>
              <div>
                <div className="font-semibold text-foreground">删除字典项</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              确定删除字典项「<strong className="text-foreground">{dictItems.find((i) => i.id === deleteItemId)?.label}</strong>」？
            </p>
            <div className="flex gap-2 justify-end">
              <button className="bms-btn-secondary text-xs px-3 py-1.5" onClick={() => setDeleteItemId(null)}>取消</button>
              <button
                className="px-3 py-1.5 rounded text-xs font-medium bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
                onClick={() => handleDeleteItem(deleteItemId)}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新增/编辑字典类型弹窗 */}
      {showTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="bg-card rounded-xl w-[440px] shadow-custom flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="font-semibold text-foreground">{editTypeId ? "编辑字典类型" : "新增字典类型"}</div>
              <button onClick={() => setShowTypeModal(false)} className="p-1 rounded hover:bg-muted transition-colors">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground mb-1.5">字典名称 <span className="text-destructive">*</span></label>
                  <input
                    className="bms-input w-full"
                    placeholder="请输入字典名称"
                    value={typeForm.name}
                    onChange={(e) => setTypeForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground mb-1.5">字典编码 <span className="text-destructive">*</span></label>
                  <input
                    className="bms-input w-full font-mono"
                    placeholder="如 DICT_CODE"
                    value={typeForm.code}
                    onChange={(e) => setTypeForm((p) => ({ ...p, code: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground mb-1.5">字典分类</label>
                  <select
                    className="bms-input w-full"
                    value={typeForm.category}
                    onChange={(e) => setTypeForm((p) => ({ ...p, category: e.target.value as DictCategory }))}
                  >
                    <option value="system">系统字典</option>
                    <option value="business">业务字典</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground mb-1.5">状态</label>
                  <select
                    className="bms-input w-full"
                    value={typeForm.status}
                    onChange={(e) => setTypeForm((p) => ({ ...p, status: e.target.value as "active" | "disabled" }))}
                  >
                    <option value="active">启用</option>
                    <option value="disabled">禁用</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">备注</label>
                <input
                  className="bms-input w-full"
                  placeholder="字典用途说明"
                  value={typeForm.remark}
                  onChange={(e) => setTypeForm((p) => ({ ...p, remark: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
              <button className="bms-btn-secondary" onClick={() => setShowTypeModal(false)}>取消</button>
              <button className="bms-btn-primary" onClick={handleSaveType}>{editTypeId ? "保存" : "创建"}</button>
            </div>
          </div>
        </div>
      )}

      {/* 新增/编辑字典项弹窗 */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="bg-card rounded-xl w-[440px] shadow-custom flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="font-semibold text-foreground">{editItemId ? "编辑字典项" : "新增字典项"}</div>
              <button onClick={() => setShowItemModal(false)} className="p-1 rounded hover:bg-muted transition-colors">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground mb-1.5">标签（显示文本）<span className="text-destructive">*</span></label>
                  <input
                    className="bms-input w-full"
                    placeholder="如 启用"
                    value={itemForm.label}
                    onChange={(e) => setItemForm((p) => ({ ...p, label: e.target.value }))}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground mb-1.5">值（存储值）<span className="text-destructive">*</span></label>
                  <input
                    className="bms-input w-full font-mono"
                    placeholder="如 active"
                    value={itemForm.value}
                    onChange={(e) => setItemForm((p) => ({ ...p, value: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground mb-1.5">排序</label>
                  <input
                    type="number"
                    className="bms-input w-full"
                    value={itemForm.sort}
                    onChange={(e) => setItemForm((p) => ({ ...p, sort: Number(e.target.value) }))}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground mb-1.5">状态</label>
                  <select
                    className="bms-input w-full"
                    value={itemForm.status}
                    onChange={(e) => setItemForm((p) => ({ ...p, status: e.target.value as "active" | "disabled" }))}
                  >
                    <option value="active">启用</option>
                    <option value="disabled">禁用</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">备注</label>
                <input
                  className="bms-input w-full"
                  placeholder="字典项说明"
                  value={itemForm.remark}
                  onChange={(e) => setItemForm((p) => ({ ...p, remark: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
              <button className="bms-btn-secondary" onClick={() => setShowItemModal(false)}>取消</button>
              <button className="bms-btn-primary" onClick={handleSaveItem}>{editItemId ? "保存" : "添加"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SysDictPage;
