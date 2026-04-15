import { useState, useEffect, useCallback } from "react";
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
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { dictsApi, type DictTypeDto, type DictItemDto } from "@/api/dicts";

type DictCategory = "system" | "business";

interface TypeFormData { name: string; code: string; category: DictCategory; remark: string; isActive: boolean; }
interface ItemFormData { label: string; value: string; sortOrder: number; isActive: boolean; remark: string; }

const defaultTypeForm: TypeFormData = { name: "", code: "", category: "business", remark: "", isActive: true };
const defaultItemForm: ItemFormData = { label: "", value: "", sortOrder: 1, isActive: true, remark: "" };

const PAGE_SIZE = 50;

const SysDictPage = () => {
  const [dictTypes, setDictTypes] = useState<DictTypeDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [savingType, setSavingType] = useState(false);
  const [savingItem, setSavingItem] = useState(false);

  const [dictItems, setDictItems] = useState<DictItemDto[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const [activeTypeId, setActiveTypeId] = useState<number | null>(null);
  const [filterCat, setFilterCat] = useState<DictCategory | "all">("all");
  const [typeSearch, setTypeSearch] = useState("");

  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editTypeId, setEditTypeId] = useState<number | null>(null);
  const [typeForm, setTypeForm] = useState<TypeFormData>(defaultTypeForm);
  const [deleteTypeId, setDeleteTypeId] = useState<number | null>(null);

  const [showItemModal, setShowItemModal] = useState(false);
  const [editItemId, setEditItemId] = useState<number | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormData>(defaultItemForm);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const activeType = dictTypes.find((t) => t.id === activeTypeId);

  const fetchTypes = useCallback(async (p: number) => {
    setLoadingTypes(true);
    try {
      const res = await dictsApi.getTypesPaged(p, PAGE_SIZE);
      if (res.success && res.data) {
        setDictTypes(res.data.items);
        setTotalCount(res.data.totalCount);
        if (res.data.items.length > 0 && activeTypeId == null) {
          setActiveTypeId(res.data.items[0].id);
        }
      }
    } catch (e: any) {
      toast.error("加载字典类型失败: " + e.message);
    } finally {
      setLoadingTypes(false);
    }
  }, []);

  const fetchItems = useCallback(async (typeId: number) => {
    setLoadingItems(true);
    try {
      const res = await dictsApi.getItems(typeId);
      if (res.success && res.data) {
        setDictItems(res.data.sort((a, b) => a.sortOrder - b.sortOrder));
      } else {
        setDictItems([]);
      }
    } catch (e: any) {
      toast.error("加载字典项失败: " + e.message);
      setDictItems([]);
    } finally {
      setLoadingItems(false);
    }
  }, []);

  useEffect(() => { fetchTypes(page); }, [page, fetchTypes]);
  useEffect(() => { if (activeTypeId != null) fetchItems(activeTypeId); }, [activeTypeId, fetchItems]);

  const filteredTypes = dictTypes.filter((t) => {
    const matchCat = filterCat === "all" || t.category === filterCat;
    const matchSearch = !typeSearch || t.name.includes(typeSearch) || t.code.includes(typeSearch);
    return matchCat && matchSearch;
  });

  // ===== Dict type operations =====
  const openAddType = () => {
    setEditTypeId(null);
    setTypeForm(defaultTypeForm);
    setShowTypeModal(true);
  };

  const openEditType = (t: DictTypeDto) => {
    if (t.isLocked) { toast.warning("系统字典不允许修改"); return; }
    setEditTypeId(t.id);
    setTypeForm({ name: t.name, code: t.code, category: t.category as DictCategory, remark: t.remark ?? "", isActive: t.isActive });
    setShowTypeModal(true);
  };

  const handleSaveType = async () => {
    if (!typeForm.name.trim()) { toast.error("字典名称不能为空"); return; }
    if (!typeForm.code.trim()) { toast.error("字典编码不能为空"); return; }

    setSavingType(true);
    try {
      if (editTypeId) {
        const res = await dictsApi.updateType(editTypeId, {
          name: typeForm.name,
          code: typeForm.code,
          category: typeForm.category,
          remark: typeForm.remark || undefined,
          isActive: typeForm.isActive,
        });
        if (!res.success) { toast.error(res.error ?? "更新失败"); return; }
        toast.success("字典类型已更新");
      } else {
        const res = await dictsApi.createType({
          name: typeForm.name,
          code: typeForm.code,
          category: typeForm.category,
          remark: typeForm.remark || undefined,
          isActive: typeForm.isActive,
        });
        if (!res.success) { toast.error(res.error ?? "创建失败"); return; }
        if (res.data) setActiveTypeId(res.data.id);
        toast.success("字典类型已创建");
      }
      setShowTypeModal(false);
      fetchTypes(page);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingType(false);
    }
  };

  const handleDeleteType = async (id: number) => {
    const t = dictTypes.find((d) => d.id === id);
    if (t?.isLocked) { toast.error("系统字典不允许删除"); setDeleteTypeId(null); return; }
    try {
      await dictsApi.delType(id);
      if (activeTypeId === id) {
        const remaining = dictTypes.filter((d) => d.id !== id);
        setActiveTypeId(remaining.length > 0 ? remaining[0].id : null);
      }
      setDeleteTypeId(null);
      toast.success("字典类型已删除");
      fetchTypes(page);
    } catch (e: any) {
      toast.error("删除失败: " + e.message);
    }
  };

  // ===== Dict item operations =====
  const openAddItem = () => {
    setEditItemId(null);
    setItemForm({ ...defaultItemForm, sortOrder: dictItems.length + 1 });
    setShowItemModal(true);
  };

  const openEditItem = (item: DictItemDto) => {
    if (activeType?.isLocked) { toast.warning("系统字典的字典项不允许修改"); return; }
    setEditItemId(item.id);
    setItemForm({ label: item.label, value: item.value, sortOrder: item.sortOrder, isActive: item.isActive, remark: item.remark ?? "" });
    setShowItemModal(true);
  };

  const handleSaveItem = async () => {
    if (!itemForm.label.trim()) { toast.error("标签不能为空"); return; }
    if (!itemForm.value.trim()) { toast.error("值不能为空"); return; }
    if (activeTypeId == null) return;

    setSavingItem(true);
    try {
      if (editItemId) {
        const res = await dictsApi.updateItem(activeTypeId, editItemId, {
          label: itemForm.label,
          value: itemForm.value,
          sortOrder: itemForm.sortOrder,
          isActive: itemForm.isActive,
          remark: itemForm.remark || undefined,
        });
        if (!res.success) { toast.error(res.error ?? "更新失败"); return; }
        toast.success("字典项已更新");
      } else {
        const res = await dictsApi.createItem(activeTypeId, {
          label: itemForm.label,
          value: itemForm.value,
          sortOrder: itemForm.sortOrder,
          isActive: itemForm.isActive,
          remark: itemForm.remark || undefined,
        });
        if (!res.success) { toast.error(res.error ?? "创建失败"); return; }
        toast.success("字典项已添加");
      }
      setShowItemModal(false);
      fetchItems(activeTypeId);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (activeType?.isLocked) { toast.error("系统字典项不允许删除"); setDeleteItemId(null); return; }
    if (activeTypeId == null) return;
    try {
      await dictsApi.delItem(activeTypeId, id);
      setDeleteItemId(null);
      toast.success("字典项已删除");
      fetchItems(activeTypeId);
    } catch (e: any) {
      toast.error("删除失败: " + e.message);
    }
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
          {loadingTypes ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : filteredTypes.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">暂无字典类型</div>
          ) : (
            filteredTypes.map((t) => {
              const isActive = t.id === activeTypeId;
              return (
                <div
                  key={t.id}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg mb-0.5 cursor-pointer transition-colors group ${isActive ? "bg-secondary text-secondary-foreground" : "hover:bg-muted"}`}
                  onClick={() => setActiveTypeId(t.id)}
                >
                  {t.isLocked
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
                    {!t.isLocked && (
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
            })
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 px-2 py-2 border-t border-border">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1 rounded hover:bg-muted disabled:opacity-40">
              <ChevronLeft size={12} />
            </button>
            <span className="text-xs text-muted-foreground">{page}/{totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-1 rounded hover:bg-muted disabled:opacity-40">
              <ChevronRight size={12} />
            </button>
          </div>
        )}
      </div>

      {/* 右侧：字典项 */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {activeType ? (
          <>
            <div className="flex-shrink-0 px-6 py-4 border-b border-border bg-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                {activeType.isLocked
                  ? <Lock size={15} className="text-muted-foreground" />
                  : <Unlock size={15} className="text-primary" />
                }
                <div>
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    {activeType.name}
                    <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{activeType.code}</code>
                    {activeType.isLocked && (
                      <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-1">
                        <Lock size={10} />
                        系统锁定
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{activeType.remark || "暂无说明"}</div>
                </div>
              </div>
              {!activeType.isLocked && (
                <button className="bms-btn-primary flex items-center gap-1.5 text-xs" onClick={openAddItem}>
                  <Plus size={13} />
                  添加字典项
                </button>
              )}
            </div>

            <div className="flex-1 overflow-auto">
              {loadingItems ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 size={24} className="animate-spin text-muted-foreground" />
                </div>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bms-table-header text-muted-foreground text-xs">
                      <th className="text-left px-5 py-3 font-medium w-10">排序</th>
                      <th className="text-left px-4 py-3 font-medium">标签（Label）</th>
                      <th className="text-left px-4 py-3 font-medium">值（Value）</th>
                      <th className="text-left px-4 py-3 font-medium">备注</th>
                      <th className="text-left px-4 py-3 font-medium">状态</th>
                      {!activeType.isLocked && <th className="text-left px-4 py-3 font-medium">操作</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {dictItems.map((item) => (
                      <tr key={item.id} className="table-row-hover border-b border-border/50 transition-colors">
                        <td className="px-5 py-3 text-xs text-muted-foreground">{item.sortOrder}</td>
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
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.isActive ? "status-online" : "status-offline"}`}>
                            {item.isActive ? "启用" : "禁用"}
                          </span>
                        </td>
                        {!activeType.isLocked && (
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
                    {dictItems.length === 0 && !loadingItems && (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">暂无字典项</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
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
                    value={typeForm.isActive ? "active" : "disabled"}
                    onChange={(e) => setTypeForm((p) => ({ ...p, isActive: e.target.value === "active" }))}
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
              <button className="bms-btn-primary flex items-center gap-1.5" onClick={handleSaveType} disabled={savingType}>
                {savingType && <Loader2 size={13} className="animate-spin" />}
                {editTypeId ? "保存" : "创建"}
              </button>
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
                    value={itemForm.sortOrder}
                    onChange={(e) => setItemForm((p) => ({ ...p, sortOrder: Number(e.target.value) }))}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground mb-1.5">状态</label>
                  <select
                    className="bms-input w-full"
                    value={itemForm.isActive ? "active" : "disabled"}
                    onChange={(e) => setItemForm((p) => ({ ...p, isActive: e.target.value === "active" }))}
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
              <button className="bms-btn-primary flex items-center gap-1.5" onClick={handleSaveItem} disabled={savingItem}>
                {savingItem && <Loader2 size={13} className="animate-spin" />}
                {editItemId ? "保存" : "添加"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SysDictPage;
