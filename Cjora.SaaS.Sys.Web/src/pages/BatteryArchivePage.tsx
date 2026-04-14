import { useState, useMemo, useRef } from "react";
import {
  Search, Plus, Download, ChevronDown, X, Package,
  Wrench, RotateCcw, Trash2, ArrowRight, CheckCircle2,
  Users, Layers, Battery, Activity, AlertTriangle, RefreshCw,
  ArrowUpRight, Filter, MoreHorizontal, ChevronLeft, ChevronRight,
  Hash, Cpu, Calendar, FileText, Zap, ShieldCheck, ExternalLink, Upload
} from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import StatCard from "../components/StatCard";

// ---- 类型 ----
export type BatteryStatus = "instock" | "assigned" | "inuse" | "returned" | "repairing" | "scrapped";

export interface BatteryRecord {
  sn: string;
  status: BatteryStatus;
  customer: string;
  customerId: string;
  project: string;
  projectId: string;
  protectionBoard: string;
  protectionBoardId: string;
  group: string;
  model: string;
  modelId: string;
  soc: number;
  cycles: number;
  soh: number;
  updatedAt: string;
}

// ---- Mock 数据 ----
const CUSTOMERS = [
  { id: "C001", name: "深圳储能科技有限公司" },
  { id: "C002", name: "广州绿能新能源" },
  { id: "C003", name: "上海蔚来能源" },
];

const PROJECTS: Record<string, { id: string; name: string }[]> = {
  C001: [
    { id: "P001", name: "深圳南山基站项目A" },
    { id: "P002", name: "深圳福田储能项目B" },
  ],
  C002: [
    { id: "P003", name: "广州天河换电站" },
    { id: "P004", name: "广州黄埔工业园" },
  ],
  C003: [
    { id: "P005", name: "上海浦东示范项目" },
  ],
};

const BATTERY_MODELS = [
  { id: "BM-001", name: "LFP-100Ah-48V" },
  { id: "BM-002", name: "NMC-200Ah-96V" },
  { id: "BM-003", name: "LFP-50Ah-24V" },
  { id: "BM-004", name: "NCM-150Ah-72V" },
  { id: "BM-005", name: "LFP-200Ah-48V" },
];

const PROTECTION_BOARDS = [
  { id: "PB-001", name: "BMS-V3 保护板" },
  { id: "PB-002", name: "BMS-V4 保护板" },
];

const MOCK_BATTERIES: BatteryRecord[] = [
  { sn: "BMS-2024-000001", status: "inuse",     customer: "深圳储能科技有限公司", customerId: "C001", project: "深圳南山基站项目A", projectId: "P001", protectionBoard: "BMS-V3 保护板", protectionBoardId: "PB-001", group: "A区-01组", model: "LFP-100Ah-48V", modelId: "BM-001", soc: 87, cycles: 312, soh: 94, updatedAt: "2024-06-12 09:32" },
  { sn: "BMS-2024-000002", status: "inuse",     customer: "深圳储能科技有限公司", customerId: "C001", project: "深圳南山基站项目A", projectId: "P001", protectionBoard: "BMS-V3 保护板", protectionBoardId: "PB-001", group: "A区-02组", model: "LFP-100Ah-48V", modelId: "BM-001", soc: 72, cycles: 298, soh: 95, updatedAt: "2024-06-12 09:28" },
  { sn: "BMS-2024-000003", status: "instock",   customer: "",                    customerId: "",     project: "",                projectId: "",     protectionBoard: "BMS-V4 保护板", protectionBoardId: "PB-002", group: "",        model: "NMC-200Ah-96V", modelId: "BM-002", soc: 100, cycles: 0,   soh: 100, updatedAt: "2024-06-10 14:00" },
  { sn: "BMS-2024-000004", status: "assigned",  customer: "广州绿能新能源",       customerId: "C002", project: "广州天河换电站",   projectId: "P003", protectionBoard: "BMS-V4 保护板", protectionBoardId: "PB-002", group: "",        model: "NMC-200Ah-96V", modelId: "BM-002", soc: 100, cycles: 5,   soh: 99,  updatedAt: "2024-06-11 10:15" },
  { sn: "BMS-2024-000005", status: "scrapped",  customer: "深圳储能科技有限公司", customerId: "C001", project: "",                projectId: "",     protectionBoard: "BMS-V3 保护板", protectionBoardId: "PB-001", group: "",        model: "LFP-50Ah-24V",  modelId: "BM-003", soc: 12,  cycles: 1820, soh: 62, updatedAt: "2024-05-30 16:45" },
  { sn: "BMS-2024-000006", status: "instock",   customer: "",                    customerId: "",     project: "",                projectId: "",     protectionBoard: "BMS-V3 保护板", protectionBoardId: "PB-001", group: "",        model: "LFP-100Ah-48V", modelId: "BM-001", soc: 100, cycles: 0,   soh: 100, updatedAt: "2024-06-08 11:20" },
  { sn: "BMS-2024-000007", status: "inuse",     customer: "广州绿能新能源",       customerId: "C002", project: "广州黄埔工业园",   projectId: "P004", protectionBoard: "BMS-V4 保护板", protectionBoardId: "PB-002", group: "B区-01组", model: "NCM-150Ah-72V", modelId: "BM-004", soc: 56, cycles: 145, soh: 97,  updatedAt: "2024-06-12 08:55" },
  { sn: "BMS-2024-000008", status: "returned",  customer: "深圳储能科技有限公司", customerId: "C001", project: "深圳福田储能项目B", projectId: "P002", protectionBoard: "BMS-V3 保护板", protectionBoardId: "PB-001", group: "",        model: "LFP-100Ah-48V", modelId: "BM-001", soc: 43, cycles: 560, soh: 88,  updatedAt: "2024-06-09 13:30" },
  { sn: "BMS-2024-000009", status: "repairing", customer: "深圳储能科技有限公司", customerId: "C001", project: "",                projectId: "",     protectionBoard: "BMS-V4 保护板", protectionBoardId: "PB-002", group: "",        model: "NMC-200Ah-96V", modelId: "BM-002", soc: 0,  cycles: 890, soh: 71,  updatedAt: "2024-06-07 17:00" },
  { sn: "BMS-2024-000010", status: "assigned",  customer: "上海蔚来能源",         customerId: "C003", project: "上海浦东示范项目", projectId: "P005", protectionBoard: "BMS-V4 保护板", protectionBoardId: "PB-002", group: "",        model: "NCM-150Ah-72V", modelId: "BM-004", soc: 100, cycles: 12,  soh: 99,  updatedAt: "2024-06-11 15:40" },
  { sn: "BMS-2024-000011", status: "inuse",     customer: "上海蔚来能源",         customerId: "C003", project: "上海浦东示范项目", projectId: "P005", protectionBoard: "BMS-V4 保护板", protectionBoardId: "PB-002", group: "C区-01组", model: "NCM-150Ah-72V", modelId: "BM-004", soc: 91, cycles: 78,  soh: 98,  updatedAt: "2024-06-12 10:05" },
  { sn: "BMS-2024-000012", status: "instock",   customer: "",                    customerId: "",     project: "",                projectId: "",     protectionBoard: "BMS-V3 保护板", protectionBoardId: "PB-001", group: "",        model: "LFP-50Ah-24V",  modelId: "BM-003", soc: 100, cycles: 0,   soh: 100, updatedAt: "2024-06-05 09:00" },
  { sn: "BMS-2024-000013", status: "returned",  customer: "广州绿能新能源",       customerId: "C002", project: "广州天河换电站",   projectId: "P003", protectionBoard: "BMS-V4 保护板", protectionBoardId: "PB-002", group: "",        model: "LFP-200Ah-48V", modelId: "BM-005", soc: 55, cycles: 320, soh: 90,  updatedAt: "2024-06-06 14:30" },
  { sn: "BMS-2024-000014", status: "instock",   customer: "",                    customerId: "",     project: "",                projectId: "",     protectionBoard: "BMS-V3 保护板", protectionBoardId: "PB-001", group: "",        model: "LFP-200Ah-48V", modelId: "BM-005", soc: 100, cycles: 0,   soh: 100, updatedAt: "2024-06-11 08:00" },
  { sn: "BMS-2024-000015", status: "repairing", customer: "上海蔚来能源",         customerId: "C003", project: "",                projectId: "",     protectionBoard: "BMS-V4 保护板", protectionBoardId: "PB-002", group: "",        model: "NCM-150Ah-72V", modelId: "BM-004", soc: 5,   cycles: 710, soh: 73,  updatedAt: "2024-06-08 16:00" },
];

// ---- 状态配置 ----
export const STATUS_CONFIG: Record<BatteryStatus, { label: string; badge: string; color: string; dotColor: string }> = {
  instock:   { label: "已入库",  badge: "instock",   color: "text-primary",             dotColor: "bg-primary" },
  assigned:  { label: "已分配",  badge: "assigned",  color: "text-warning-foreground",  dotColor: "bg-warning" },
  inuse:     { label: "使用中",  badge: "inuse",     color: "text-success",             dotColor: "bg-success" },
  returned:  { label: "已归还",  badge: "returned",  color: "text-muted-foreground",    dotColor: "bg-muted-foreground" },
  repairing: { label: "维修中",  badge: "repairing", color: "text-destructive",         dotColor: "bg-destructive" },
  scrapped:  { label: "已报废",  badge: "scrapped",  color: "text-muted-foreground",    dotColor: "bg-muted-foreground" },
};

// ---- 状态流转可执行动作 ----
interface ActionDef {
  key: string;
  label: string;
  iconName: string;
  targetStatus: BatteryStatus;
  variant: "primary" | "warning" | "danger" | "default";
}

const STATUS_ACTIONS: Record<BatteryStatus, ActionDef[]> = {
  instock:   [
    { key: "assign",  label: "分配",     iconName: "arrow-right",    targetStatus: "assigned",  variant: "primary" },
    { key: "scrap",   label: "报废",     iconName: "trash-2",        targetStatus: "scrapped",  variant: "danger" },
  ],
  assigned:  [
    { key: "bind",    label: "绑定使用", iconName: "check-circle-2", targetStatus: "inuse",     variant: "primary" },
    { key: "scrap",   label: "报废",     iconName: "trash-2",        targetStatus: "scrapped",  variant: "danger" },
  ],
  inuse:     [
    { key: "return",  label: "归还",     iconName: "rotate-ccw",     targetStatus: "returned",  variant: "warning" },
    { key: "scrap",   label: "报废",     iconName: "trash-2",        targetStatus: "scrapped",  variant: "danger" },
  ],
  returned:  [
    { key: "repair",  label: "送修",     iconName: "wrench",         targetStatus: "repairing", variant: "warning" },
    { key: "assign",  label: "重新分配", iconName: "arrow-right",    targetStatus: "assigned",  variant: "primary" },
    { key: "stock",   label: "重新入库", iconName: "package",        targetStatus: "instock",   variant: "default" },
    { key: "scrap",   label: "报废",     iconName: "trash-2",        targetStatus: "scrapped",  variant: "danger" },
  ],
  repairing: [
    { key: "done",    label: "维修完成", iconName: "check-circle-2", targetStatus: "instock",   variant: "primary" },
    { key: "scrap",   label: "报废",     iconName: "trash-2",        targetStatus: "scrapped",  variant: "danger" },
  ],
  scrapped:  [],
};

const BATCH_ACTIONS: { key: string; label: string; iconName: string; targetStatus: BatteryStatus; variant: "primary" | "warning" | "danger" | "default"; allowFrom: BatteryStatus[] }[] = [
  { key: "batch_assign",  label: "批量分配",   iconName: "arrow-right",    targetStatus: "assigned",  variant: "primary", allowFrom: ["instock", "returned"] },
  { key: "batch_bind",    label: "批量使用",   iconName: "check-circle-2", targetStatus: "inuse",     variant: "primary", allowFrom: ["assigned"] },
  { key: "batch_return",  label: "批量归还",   iconName: "rotate-ccw",     targetStatus: "returned",  variant: "warning", allowFrom: ["inuse"] },
  { key: "batch_repair",  label: "批量送修",   iconName: "wrench",         targetStatus: "repairing", variant: "warning", allowFrom: ["returned"] },
  { key: "batch_stock",   label: "批量入库",   iconName: "package",        targetStatus: "instock",   variant: "default", allowFrom: ["returned", "repairing"] },
  { key: "batch_scrap",   label: "批量报废",   iconName: "trash-2",        targetStatus: "scrapped",  variant: "danger",  allowFrom: ["instock", "assigned", "inuse", "returned", "repairing"] },
];

const ACTION_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  "arrow-right":    ArrowRight,
  "check-circle-2": CheckCircle2,
  "rotate-ccw":     RotateCcw,
  "wrench":         Wrench,
  "trash-2":        Trash2,
  "package":        Package,
};

// ---- 入库登记弹窗 ----
interface StockInModalProps {
  onClose: () => void;
  onConfirm: (snList: string[], model: string, protectionBoardId: string, customerId: string, projectId: string) => void;
}

const StockInModal = ({ onClose, onConfirm }: StockInModalProps) => {
  const [snInput, setSnInput] = useState("");
  const [model, setModel] = useState("");
  const [protectionBoardId, setProtectionBoardId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [snList, setSnList] = useState<string[]>([]);
  const [snError, setSnError] = useState("");
  const [importMode, setImportMode] = useState<"manual" | "excel">("manual");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableProjects = customerId ? (PROJECTS[customerId] || []) : [];

  const addSn = () => {
    const val = snInput.trim().toUpperCase();
    if (!val) return;
    if (snList.includes(val)) { setSnError("该SN已添加"); return; }
    if (MOCK_BATTERIES.some(b => b.sn === val)) { setSnError("该SN已存在于系统中"); return; }
    setSnList(prev => [...prev, val]);
    setSnInput("");
    setSnError("");
    console.log("[StockIn] 添加SN:", val);
  };

  const removeSn = (sn: string) => setSnList(prev => prev.filter(s => s !== sn));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); addSn(); }
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    console.log("[StockIn] Excel导入文件:", file.name);
    // 模拟Excel解析：从文件名生成示例SN
    const mockImportedSns = ["BMS-EXCEL-000001", "BMS-EXCEL-000002", "BMS-EXCEL-000003"];
    const newSns = mockImportedSns.filter(sn => !snList.includes(sn) && !MOCK_BATTERIES.some(b => b.sn === sn));
    setSnList(prev => [...prev, ...newSns]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    console.log("[StockIn] Excel导入完成，新增SN:", newSns.length, "条");
  };

  const canSubmit = snList.length > 0 && !!model && !!protectionBoardId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="bg-card rounded-xl shadow-custom w-full max-w-xl mx-4 border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package size={15} className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">电池入库登记</h3>
              <p className="text-xs text-muted-foreground mt-0.5">批量登记新电池入库</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* 电池型号 + 保护板 */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                电池型号 <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="bms-input w-full text-sm pr-7 appearance-none"
                >
                  <option value="">请选择电池型号</option>
                  {BATTERY_MODELS.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                保护板 <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <select
                  value={protectionBoardId}
                  onChange={(e) => setProtectionBoardId(e.target.value)}
                  className="bms-input w-full text-sm pr-7 appearance-none"
                >
                  <option value="">请选择保护板</option>
                  {PROTECTION_BOARDS.map(pb => <option key={pb.id} value={pb.id}>{pb.name}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          {/* 所属客户 + 所属项目（可选） */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                所属客户 <span className="text-muted-foreground font-normal">（可选）</span>
              </label>
              <div className="relative">
                <select
                  value={customerId}
                  onChange={(e) => { setCustomerId(e.target.value); setProjectId(""); }}
                  className="bms-input w-full text-sm pr-7 appearance-none"
                >
                  <option value="">请选择客户（可选）</option>
                  {CUSTOMERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                所属项目 <span className="text-muted-foreground font-normal">（可选）</span>
              </label>
              <div className="relative">
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="bms-input w-full text-sm pr-7 appearance-none"
                  disabled={!customerId}
                >
                  <option value="">请选择项目（可选）</option>
                  {availableProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          {/* SN 输入方式切换 */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">
              电池编码录入方式
            </label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setImportMode("manual")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                  importMode === "manual" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                <Hash size={11} />
                手动输入
              </button>
              <button
                onClick={() => setImportMode("excel")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                  importMode === "excel" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                <Upload size={11} />
                Excel导入
              </button>
            </div>

            {importMode === "manual" ? (
              <div>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={snInput}
                      onChange={(e) => { setSnInput(e.target.value); setSnError(""); }}
                      onKeyDown={handleKeyDown}
                      placeholder="如：BMS-2024-000099"
                      className={`bms-input w-full text-sm pl-8 ${snError ? "border-destructive" : ""}`}
                    />
                    <Hash size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <button onClick={addSn} className="bms-btn-primary flex items-center gap-1.5 text-xs px-3 flex-shrink-0">
                    <Plus size={13} />
                    添加
                  </button>
                </div>
                {snError && <p className="text-xs text-destructive mt-1">{snError}</p>}
                <p className="text-xs text-muted-foreground mt-1">输入后按 Enter 或点击「添加」按钮</p>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-5 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <Upload size={20} className="text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground font-medium">点击上传 Excel 文件</p>
                <p className="text-xs text-muted-foreground mt-1">.xlsx / .xls 格式，第一列为电池SN编号</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleExcelImport}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* SN 列表 */}
          <div className="bg-muted/40 rounded-lg border border-border">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-xs font-medium text-foreground">待入库列表</span>
              <span className={`text-xs font-semibold ${snList.length > 0 ? "text-primary" : "text-muted-foreground"}`}>
                {snList.length} 台
              </span>
            </div>
            <div className="min-h-16 max-h-36 overflow-y-auto">
              {snList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-5 text-muted-foreground">
                  <Battery size={18} className="text-border mb-1.5" />
                  <span className="text-xs">暂无SN，请在上方输入或导入</span>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {snList.map((sn, idx) => (
                    <div key={sn} className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-card border border-border">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-5 text-right">{idx + 1}.</span>
                        <span className="font-mono text-xs font-semibold text-accent-foreground">{sn}</span>
                      </div>
                      <button onClick={() => removeSn(sn)} className="text-muted-foreground hover:text-destructive transition-colors ml-2">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-5">
          <button onClick={onClose} className="flex-1 bms-btn-secondary text-sm">取消</button>
          <button
            onClick={() => canSubmit && onConfirm(snList, model, protectionBoardId, customerId, projectId)}
            disabled={!canSubmit}
            className="flex-1 bms-btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确认入库 {snList.length > 0 ? `（${snList.length} 台）` : ""}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---- 分配弹窗 ----
interface AssignModalProps {
  batteries: BatteryRecord[];
  onClose: () => void;
  onConfirm: (customerId: string, projectId: string) => void;
}

const AssignModal = ({ batteries = [], onClose, onConfirm }: AssignModalProps) => {
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const projects = selectedCustomer ? (PROJECTS[selectedCustomer] || []) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="bg-card rounded-xl shadow-custom w-full max-w-md mx-4 border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users size={15} className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">电池分配</h3>
              <p className="text-xs text-muted-foreground mt-0.5">共 {batteries.length} 台电池待分配</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">目标客户 <span className="text-destructive">*</span></label>
            <div className="relative">
              <select
                value={selectedCustomer}
                onChange={(e) => { setSelectedCustomer(e.target.value); setSelectedProject(""); }}
                className="bms-input w-full text-sm pr-7 appearance-none"
              >
                <option value="">请选择客户</option>
                {CUSTOMERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">目标项目</label>
            <div className="relative">
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="bms-input w-full text-sm pr-7 appearance-none"
                disabled={!selectedCustomer}
              >
                <option value="">请选择项目（可选）</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          <div className="bg-muted/40 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground mb-2 font-medium">待分配电池列表</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {batteries.map(b => (
                <div key={b.sn} className="flex items-center gap-2">
                  <span className="font-mono text-xs text-accent-foreground">{b.sn}</span>
                  <span className="text-xs text-muted-foreground">{b.model}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <button onClick={onClose} className="flex-1 bms-btn-secondary text-sm">取消</button>
          <button
            onClick={() => selectedCustomer && onConfirm(selectedCustomer, selectedProject)}
            disabled={!selectedCustomer}
            className="flex-1 bms-btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确认分配
          </button>
        </div>
      </div>
    </div>
  );
};

// ---- 批量状态变更弹窗 ----
interface BatchStatusModalProps {
  batteries: BatteryRecord[];
  targetStatus: BatteryStatus;
  actionLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}

const BatchStatusModal = ({ batteries = [], targetStatus, actionLabel = "", onClose, onConfirm }: BatchStatusModalProps) => {
  const targetCfg = STATUS_CONFIG[targetStatus];
  const incompatibleBatteries = batteries.filter(b => {
    const action = BATCH_ACTIONS.find(a => a.targetStatus === targetStatus);
    return action ? !action.allowFrom.includes(b.status) : false;
  });
  const compatibleCount = batteries.length - incompatibleBatteries.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="bg-card rounded-xl shadow-custom w-full max-w-md mx-4 border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="text-sm font-bold text-foreground">批量{actionLabel}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              共选中 {batteries.length} 台，可执行 {compatibleCount} 台
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">操作类型</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{actionLabel}</p>
            </div>
            <ArrowRight size={14} className="text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">目标状态</p>
              <div className="mt-0.5">
                <StatusBadge status={targetCfg.badge} label={targetCfg.label} />
              </div>
            </div>
          </div>
          {incompatibleBatteries.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/5 border border-warning/20">
              <AlertTriangle size={14} className="text-warning-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-warning-foreground">以下 {incompatibleBatteries.length} 台不满足条件，将被跳过</p>
                <div className="mt-1.5 space-y-0.5">
                  {incompatibleBatteries.slice(0, 3).map(b => (
                    <p key={b.sn} className="text-xs text-muted-foreground">
                      {b.sn} — 当前状态：{STATUS_CONFIG[b.status].label}
                    </p>
                  ))}
                  {incompatibleBatteries.length > 3 && (
                    <p className="text-xs text-muted-foreground">...等 {incompatibleBatteries.length - 3} 台</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="bg-muted/40 rounded-lg border border-border">
            <div className="px-3 py-2 border-b border-border">
              <span className="text-xs font-medium text-foreground">将执行变更的电池（{compatibleCount} 台）</span>
            </div>
            <div className="max-h-28 overflow-y-auto p-2 space-y-1">
              {batteries.filter(b => {
                const action = BATCH_ACTIONS.find(a => a.targetStatus === targetStatus);
                return action ? action.allowFrom.includes(b.status) : true;
              }).map(b => (
                <div key={b.sn} className="flex items-center gap-2 px-2 py-1">
                  <span className="font-mono text-xs text-accent-foreground">{b.sn}</span>
                  <StatusBadge status={STATUS_CONFIG[b.status].badge} label={STATUS_CONFIG[b.status].label} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose} className="flex-1 bms-btn-secondary text-sm">取消</button>
          <button
            onClick={onConfirm}
            disabled={compatibleCount === 0}
            className="flex-1 bms-btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确认{actionLabel}（{compatibleCount} 台）
          </button>
        </div>
      </div>
    </div>
  );
};

// ---- 状态流转确认弹窗（单条） ----
interface ActionConfirmModalProps {
  sn: string;
  action: ActionDef;
  onClose: () => void;
  onConfirm: () => void;
}

const ActionConfirmModal = ({ sn = "", action, onClose, onConfirm }: ActionConfirmModalProps) => {
  const IconComp = ACTION_ICONS[action.iconName] || ArrowRight;
  const targetCfg = STATUS_CONFIG[action.targetStatus];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="bg-card rounded-xl shadow-custom w-full max-w-sm mx-4 border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">确认操作</h3>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${action.variant === "danger" ? "bg-destructive/10" : action.variant === "warning" ? "bg-warning/10" : "bg-primary/10"}`}>
              <IconComp size={15} className={action.variant === "danger" ? "text-destructive" : action.variant === "warning" ? "text-warning-foreground" : "text-primary"} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">操作</p>
              <p className="text-sm font-semibold text-foreground">{action.label}</p>
            </div>
          </div>
          <p className="text-sm text-foreground">
            确认将电池 <span className="font-mono font-semibold text-accent-foreground">{sn}</span> 执行【{action.label}】操作？
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>状态将变更为：</span>
            <StatusBadge status={targetCfg.badge} label={targetCfg.label} />
          </div>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose} className="flex-1 bms-btn-secondary text-sm">取消</button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-opacity cursor-pointer ${
              action.variant === "danger"
                ? "bg-destructive text-primary-foreground hover:opacity-90"
                : action.variant === "warning"
                ? "bg-warning text-warning-foreground hover:opacity-90"
                : "bms-btn-primary"
            }`}
          >
            确认{action.label}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---- SOC 指示条 ----
const SocBar = ({ value = 0 }: { value: number }) => {
  const pct = Math.max(0, Math.min(100, value));
  const colorClass = pct >= 70 ? "bg-success" : pct >= 30 ? "bg-warning" : "bg-destructive";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden flex-shrink-0">
        <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-foreground tabular-nums">{pct}%</span>
    </div>
  );
};

const SohBadge = ({ value = 0 }: { value: number }) => {
  const cls = value >= 90 ? "text-success" : value >= 75 ? "text-warning-foreground" : "text-destructive";
  return <span className={`text-sm font-semibold tabular-nums ${cls}`}>{value}%</span>;
};

// ---- 分页组件 ----
interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const Pagination = ({ total = 0, page = 1, pageSize = 10, onPageChange }: PaginationProps) => {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const getPages = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="w-7 h-7 rounded flex items-center justify-center border border-border hover:bg-muted text-muted-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={13} />
      </button>
      {getPages().map((p, idx) =>
        p === "..." ? (
          <span key={`dots-${idx}`} className="w-7 h-7 flex items-center justify-center text-xs text-muted-foreground">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
              p === page ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted text-foreground"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="w-7 h-7 rounded flex items-center justify-center border border-border hover:bg-muted text-muted-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronRight size={13} />
      </button>
    </div>
  );
};

// ---- 状态流转图 ----
const StatusFlowChart = () => {
  const flows = [
    { from: "已入库",  to: "已分配",  label: "分配",     color: "text-primary",          bgFrom: "bg-primary/10 text-primary",          borderFrom: "border-primary/30" },
    { from: "已分配",  to: "使用中",  label: "绑定使用", color: "text-success",           bgFrom: "bg-success/10 text-success",           borderFrom: "border-success/30" },
    { from: "使用中",  to: "已归还",  label: "归还",     color: "text-warning-foreground", bgFrom: "bg-warning/10 text-warning-foreground", borderFrom: "border-warning/30" },
    { from: "已归还",  to: "维修中",  label: "送修",     color: "text-destructive",       bgFrom: "bg-destructive/10 text-destructive",   borderFrom: "border-destructive/30" },
    { from: "已归还",  to: "已分配",  label: "重新分配", color: "text-primary",          bgFrom: "bg-primary/10 text-primary",           borderFrom: "border-primary/30" },
    { from: "已归还",  to: "已入库",  label: "重新入库", color: "text-muted-foreground",  bgFrom: "bg-muted/60 text-muted-foreground",    borderFrom: "border-border" },
    { from: "维修中",  to: "已入库",  label: "维修完成", color: "text-primary",          bgFrom: "bg-primary/10 text-primary",           borderFrom: "border-primary/30" },
  ];

  return (
    <div className="bms-card py-3 px-4">
      <div className="flex items-center gap-1.5 mb-2.5">
        <Activity size={13} className="text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">状态流转规则</span>
        <span className="text-xs text-muted-foreground ml-1">（任意非报废状态均可执行「报废」操作）</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {flows.map((f, i) => (
          <div key={i} className="flex items-center gap-1.5 bg-muted/40 border border-border rounded-md px-2.5 py-1.5">
            <span className="text-xs text-muted-foreground">{f.from}</span>
            <ArrowRight size={10} className={f.color} />
            <span className="text-xs text-muted-foreground">{f.to}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded border ${f.bgFrom} ${f.borderFrom} ml-0.5`}>{f.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 bg-destructive/5 border border-destructive/20 rounded-md px-2.5 py-1.5">
          <Trash2 size={10} className="text-destructive" />
          <span className="text-xs text-destructive font-medium">任意状态 → 已报废</span>
        </div>
      </div>
    </div>
  );
};

// ---- 主页面组件 ----
interface BatteryArchivePageProps {
  onViewDetail?: (sn: string, projectId: string, status: string) => void;
  onNavigateToCustomer?: (customerId: string) => void;
  onNavigateToProject?: (projectId: string) => void;
  onNavigateToModel?: (modelId: string) => void;
  onNavigateToProtectionBoard?: (boardId: string) => void;
}

const PAGE_SIZE = 8;

const BatteryArchivePage = ({
  onViewDetail,
  onNavigateToCustomer,
  onNavigateToProject,
  onNavigateToModel,
  onNavigateToProtectionBoard,
}: BatteryArchivePageProps) => {
  const [batteries, setBatteries] = useState<BatteryRecord[]>(MOCK_BATTERIES);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [statusFilter, setStatusFilter] = useState<BatteryStatus | "all">("all");
  const [selectedSns, setSelectedSns] = useState<Set<string>>(new Set());
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [actionTarget, setActionTarget] = useState<{ sn: string; action: ActionDef } | null>(null);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [batchAction, setBatchAction] = useState<{ targetStatus: BatteryStatus; label: string } | null>(null);
  const [showBatchMenu, setShowBatchMenu] = useState(false);

  const availableProjects = selectedCustomer ? (PROJECTS[selectedCustomer] || []) : [];

  const filtered = useMemo(() => {
    return batteries.filter(b => {
      const matchSearch = !search || b.sn.toLowerCase().includes(search.toLowerCase());
      const matchCustomer = !selectedCustomer || b.customerId === selectedCustomer;
      const matchProject = !selectedProject || b.projectId === selectedProject;
      const matchStatus = statusFilter === "all" || b.status === statusFilter;
      return matchSearch && matchCustomer && matchProject && matchStatus;
    });
  }, [batteries, search, selectedCustomer, selectedProject, statusFilter]);

  const paged = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const resetPage = () => setCurrentPage(1);

  const stats = useMemo(() => {
    const counts: Record<string, number> = { total: batteries.length };
    (Object.keys(STATUS_CONFIG) as BatteryStatus[]).forEach(s => {
      counts[s] = batteries.filter(b => b.status === s).length;
    });
    return counts;
  }, [batteries]);

  const allPageSelected = paged.length > 0 && paged.every(b => selectedSns.has(b.sn));
  const somePageSelected = paged.some(b => selectedSns.has(b.sn));

  const toggleSelect = (sn: string) => {
    setSelectedSns(prev => {
      const next = new Set(prev);
      next.has(sn) ? next.delete(sn) : next.add(sn);
      return next;
    });
  };

  const toggleAll = () => {
    if (allPageSelected) {
      setSelectedSns(prev => { const next = new Set(prev); paged.forEach(b => next.delete(b.sn)); return next; });
    } else {
      setSelectedSns(prev => { const next = new Set(prev); paged.forEach(b => next.add(b.sn)); return next; });
    }
  };

  const selectedBatteries = batteries.filter(b => selectedSns.has(b.sn));

  const availableBatchActions = useMemo(() => {
    if (selectedBatteries.length === 0) return [];
    const selectedStatuses = new Set(selectedBatteries.map(b => b.status));
    return BATCH_ACTIONS.filter(action => {
      if (action.targetStatus === "scrapped" && selectedStatuses.has("scrapped")) return false;
      return selectedBatteries.some(b => action.allowFrom.includes(b.status));
    });
  }, [selectedBatteries]);

  const now = () => new Date().toLocaleString("zh-CN", { hour12: false }).slice(0, 16);

  const executeAction = (sn: string, action: ActionDef) => {
    setBatteries(prev => prev.map(b => b.sn === sn ? { ...b, status: action.targetStatus, updatedAt: now() } : b));
    setActionTarget(null);
    setOpenActionMenu(null);
    console.log("[BatteryArchive] 状态流转:", sn, "->", action.targetStatus);
  };

  const handleAssignConfirm = (customerId: string, projectId: string) => {
    const customer = CUSTOMERS.find(c => c.id === customerId);
    const project = projectId ? (PROJECTS[customerId] || []).find(p => p.id === projectId) : null;
    setBatteries(prev => prev.map(b => {
      if (!selectedSns.has(b.sn)) return b;
      return { ...b, status: "assigned" as BatteryStatus, customerId, customer: customer?.name || "", projectId: project?.id || "", project: project?.name || "", updatedAt: now() };
    }));
    setSelectedSns(new Set());
    setShowAssignModal(false);
    console.log("[BatteryArchive] 批量分配完成", customerId, projectId);
  };

  const handleStockInConfirm = (snList: string[], model: string, protectionBoardId: string, customerId: string, projectId: string) => {
    const pb = PROTECTION_BOARDS.find(b => b.id === protectionBoardId);
    const customer = CUSTOMERS.find(c => c.id === customerId);
    const project = projectId ? (PROJECTS[customerId] || []).find(p => p.id === projectId) : null;
    const modelItem = BATTERY_MODELS.find(m => m.name === model);

    const newBatteries: BatteryRecord[] = snList.map(sn => ({
      sn,
      status: "instock" as BatteryStatus,
      customer: customer?.name || "",
      customerId,
      project: project?.name || "",
      projectId: project?.id || "",
      protectionBoard: pb?.name || "",
      protectionBoardId,
      group: "",
      model,
      modelId: modelItem?.id || "",
      soc: 100,
      cycles: 0,
      soh: 100,
      updatedAt: now(),
    }));
    setBatteries(prev => [...prev, ...newBatteries]);
    setShowStockInModal(false);
    console.log("[BatteryArchive] 入库登记完成，新增", snList.length, "台");
  };

  const handleBatchActionConfirm = () => {
    if (!batchAction) return;
    const { targetStatus } = batchAction;
    const action = BATCH_ACTIONS.find(a => a.targetStatus === targetStatus);
    setBatteries(prev => prev.map(b => {
      if (!selectedSns.has(b.sn)) return b;
      if (action && !action.allowFrom.includes(b.status)) return b;
      return { ...b, status: targetStatus, updatedAt: now() };
    }));
    console.log("[BatteryArchive] 批量状态变更完成 ->", targetStatus);
    setSelectedSns(new Set());
    setBatchAction(null);
  };

  const handleSNClick = (b: BatteryRecord) => {
    if (onViewDetail) onViewDetail(b.sn, b.projectId, b.status);
    console.log("[BatteryArchive] 点击SN跳转详情:", b.sn);
  };

  const handleFilterChange = (fn: () => void) => {
    fn();
    resetPage();
    setSelectedSns(new Set());
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4">
      {/* 统计卡片 */}
      <div className="flex gap-3">
        <div className="flex-1"><StatCard title="电池总数" value={String(stats.total)} unit="台" iconName="battery" colorType="blue" /></div>
        <div className="flex-1"><StatCard title="已入库" value={String(stats.instock)} unit="台" iconName="cpu" colorType="teal" /></div>
        <div className="flex-1"><StatCard title="使用中" value={String(stats.inuse)} unit="台" iconName="activity" colorType="green" /></div>
        <div className="flex-1"><StatCard title="已分配" value={String(stats.assigned)} unit="台" iconName="users" colorType="blue" /></div>
        <div className="flex-1"><StatCard title="维修中" value={String(stats.repairing)} unit="台" iconName="alert" colorType="orange" /></div>
        <div className="flex-1"><StatCard title="已报废" value={String(stats.scrapped)} unit="台" iconName="check" colorType="red" /></div>
      </div>

      {/* 主表格 */}
      <div className="bms-card p-0">
        {/* 筛选栏 */}
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜索电池SN..."
                  value={search}
                  onChange={(e) => handleFilterChange(() => setSearch(e.target.value))}
                  className="bms-input pl-8 w-52 text-sm"
                />
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                {search && (
                  <button onClick={() => handleFilterChange(() => setSearch(""))} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X size={12} />
                  </button>
                )}
              </div>
              <div className="relative">
                <select
                  value={selectedCustomer}
                  onChange={(e) => handleFilterChange(() => { setSelectedCustomer(e.target.value); setSelectedProject(""); })}
                  className="bms-input text-sm pr-7 appearance-none w-44"
                >
                  <option value="">全部客户</option>
                  {CUSTOMERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={selectedProject}
                  onChange={(e) => handleFilterChange(() => setSelectedProject(e.target.value))}
                  className="bms-input text-sm pr-7 appearance-none w-44"
                  disabled={!selectedCustomer}
                >
                  <option value="">全部项目</option>
                  {availableProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => handleFilterChange(() => setStatusFilter(e.target.value as BatteryStatus | "all"))}
                  className="bms-input text-sm pr-7 appearance-none"
                >
                  <option value="all">全部状态</option>
                  {(Object.keys(STATUS_CONFIG) as BatteryStatus[]).map(s => (
                    <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
              {(search || selectedCustomer || selectedProject || statusFilter !== "all") && (
                <button
                  onClick={() => handleFilterChange(() => { setSearch(""); setSelectedCustomer(""); setSelectedProject(""); setStatusFilter("all"); })}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <X size={12} />
                  重置
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedSns.size > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 border border-primary/20 rounded-lg">
                  <span className="text-xs text-primary font-medium">已选 {selectedSns.size} 台</span>
                  {selectedBatteries.some(b => b.status === "instock" || b.status === "returned") && (
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                    >
                      <Users size={11} />
                      批量分配
                    </button>
                  )}
                  {availableBatchActions.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setShowBatchMenu(!showBatchMenu)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <Zap size={11} />
                        批量变更
                        <ChevronDown size={10} className={`transition-transform ${showBatchMenu ? "rotate-180" : ""}`} />
                      </button>
                      {showBatchMenu && (
                        <div className="absolute right-0 top-full mt-1 z-30 bg-card border border-border rounded-lg shadow-custom min-w-32 py-1 overflow-hidden">
                          {availableBatchActions.map(action => {
                            const IconComp = ACTION_ICONS[action.iconName] || ArrowRight;
                            return (
                              <button
                                key={action.key}
                                onClick={() => { setBatchAction({ targetStatus: action.targetStatus, label: action.label }); setShowBatchMenu(false); }}
                                className={`w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium hover:bg-muted transition-colors text-left ${
                                  action.variant === "danger" ? "text-destructive hover:bg-destructive/5" : action.variant === "warning" ? "text-warning-foreground" : "text-foreground"
                                }`}
                              >
                                <IconComp size={12} />
                                {action.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  <button onClick={() => setSelectedSns(new Set())} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X size={13} />
                  </button>
                </div>
              )}
              <button className="bms-btn-secondary flex items-center gap-1.5 text-xs">
                <Download size={12} />
                导出
              </button>
              <button onClick={() => setShowStockInModal(true)} className="bms-btn-primary flex items-center gap-1.5 text-xs">
                <Plus size={12} />
                入库登记
              </button>
            </div>
          </div>
        </div>

        {/* 表格 */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bms-table-header text-left">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    ref={el => { if (el) el.indeterminate = somePageSelected && !allPageSelected; }}
                    onChange={toggleAll}
                    className="rounded border-border cursor-pointer accent-primary"
                  />
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">电池SN</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">当前状态</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">所属客户</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">所属项目</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">电池型号</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">保护板</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">SOC（电量）</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">循环次数</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">SOH（健康度）</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">最近更新</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <Filter size={24} className="text-border" />
                      <span>暂无匹配数据</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paged.map((b, i) => {
                  const statusCfg = STATUS_CONFIG[b.status];
                  const actions = STATUS_ACTIONS[b.status] || [];
                  const isSelected = selectedSns.has(b.sn);
                  const isMenuOpen = openActionMenu === b.sn;

                  return (
                    <tr
                      key={b.sn}
                      className={`border-b border-border text-sm transition-colors ${isSelected ? "bg-primary/5" : i % 2 === 0 ? "" : "bg-muted/20"} table-row-hover`}
                    >
                      {/* 复选框 */}
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(b.sn)}
                          className="rounded border-border cursor-pointer accent-primary"
                        />
                      </td>

                      {/* 电池SN */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleSNClick(b)}
                          className="flex items-center gap-1.5 font-mono text-xs font-semibold text-primary hover:text-accent-foreground transition-colors group"
                        >
                          <Battery size={12} className="flex-shrink-0" />
                          <span className="group-hover:underline underline-offset-2">{b.sn}</span>
                          <ArrowUpRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </td>

                      {/* 状态 */}
                      <td className="px-4 py-3">
                        <StatusBadge status={statusCfg.badge} label={statusCfg.label} />
                      </td>

                      {/* 所属客户（可跳转） */}
                      <td className="px-4 py-3">
                        {b.customer ? (
                          <button
                            onClick={() => onNavigateToCustomer && onNavigateToCustomer(b.customerId)}
                            className="flex items-center gap-1.5 group hover:text-primary transition-colors"
                          >
                            <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Users size={10} className="text-primary" />
                            </div>
                            <span className="text-xs text-foreground leading-tight max-w-32 truncate group-hover:text-primary group-hover:underline underline-offset-2">{b.customer}</span>
                            <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary flex-shrink-0" />
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>

                      {/* 所属项目（可跳转） */}
                      <td className="px-4 py-3">
                        {b.project ? (
                          <button
                            onClick={() => onNavigateToProject && onNavigateToProject(b.projectId)}
                            className="flex items-center gap-1.5 group hover:text-primary transition-colors"
                          >
                            <div className="w-5 h-5 rounded bg-success/10 flex items-center justify-center flex-shrink-0">
                              <Layers size={10} className="text-success" />
                            </div>
                            <span className="text-xs text-foreground leading-tight max-w-32 truncate group-hover:text-primary group-hover:underline underline-offset-2">{b.project}</span>
                            <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary flex-shrink-0" />
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>

                      {/* 电池型号（可跳转） */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => onNavigateToModel && onNavigateToModel(b.modelId)}
                          className="flex items-center gap-1 group hover:text-primary transition-colors"
                        >
                          <span className="text-xs font-medium text-foreground whitespace-nowrap group-hover:text-primary group-hover:underline underline-offset-2">{b.model}</span>
                          <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary flex-shrink-0" />
                        </button>
                      </td>

                      {/* 保护板（可跳转） */}
                      <td className="px-4 py-3">
                        {b.protectionBoard ? (
                          <button
                            onClick={() => onNavigateToProtectionBoard && onNavigateToProtectionBoard(b.protectionBoardId)}
                            className="flex items-center gap-1.5 group hover:text-primary transition-colors"
                          >
                            <div className="w-5 h-5 rounded bg-muted flex items-center justify-center flex-shrink-0">
                              <ShieldCheck size={10} className="text-muted-foreground" />
                            </div>
                            <span className="text-xs text-foreground leading-tight max-w-28 truncate group-hover:text-primary group-hover:underline underline-offset-2">{b.protectionBoard}</span>
                            <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary flex-shrink-0" />
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>

                      {/* SOC */}
                      <td className="px-4 py-3">
                        <SocBar value={b.soc} />
                      </td>

                      {/* 循环次数 */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <RefreshCw size={11} className="text-muted-foreground flex-shrink-0" />
                          <span className="text-xs font-medium text-foreground tabular-nums">{b.cycles}</span>
                          <span className="text-xs text-muted-foreground">次</span>
                        </div>
                      </td>

                      {/* SOH */}
                      <td className="px-4 py-3">
                        <SohBadge value={b.soh} />
                      </td>

                      {/* 更新时间 */}
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{b.updatedAt}</td>

                      {/* 操作 */}
                      <td className="px-4 py-3">
                        {actions.length > 0 ? (
                          <div className="relative">
                            <button
                              onClick={() => setOpenActionMenu(isMenuOpen ? null : b.sn)}
                              className="flex items-center gap-1 px-2 py-1.5 rounded-md border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors"
                            >
                              <MoreHorizontal size={13} />
                              操作
                            </button>
                            {isMenuOpen && (
                              <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-lg shadow-custom min-w-28 py-1 overflow-hidden">
                                {actions.map(action => {
                                  const IconComp = ACTION_ICONS[action.iconName] || ArrowRight;
                                  return (
                                    <button
                                      key={action.key}
                                      onClick={() => { setActionTarget({ sn: b.sn, action }); setOpenActionMenu(null); }}
                                      className={`w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium hover:bg-muted transition-colors text-left ${
                                        action.variant === "danger" ? "text-destructive hover:bg-destructive/5" : "text-foreground"
                                      }`}
                                    >
                                      <IconComp size={12} />
                                      {action.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-border">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              共 <span className="font-semibold text-foreground">{filtered.length}</span> 条记录
              {filtered.length > PAGE_SIZE && (
                <span className="ml-1">· 第 {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} 条</span>
              )}
            </span>
            {selectedSns.size > 0 && (
              <span className="text-xs text-primary font-medium">已选 {selectedSns.size} 台</span>
            )}
          </div>
          <Pagination
            total={filtered.length}
            page={currentPage}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* 状态流转说明 */}
      <StatusFlowChart />

      {/* 弹窗 */}
      {showStockInModal && (
        <StockInModal
          onClose={() => setShowStockInModal(false)}
          onConfirm={handleStockInConfirm}
        />
      )}
      {showAssignModal && (
        <AssignModal
          batteries={selectedBatteries}
          onClose={() => setShowAssignModal(false)}
          onConfirm={handleAssignConfirm}
        />
      )}
      {actionTarget && (
        <ActionConfirmModal
          sn={actionTarget.sn}
          action={actionTarget.action}
          onClose={() => setActionTarget(null)}
          onConfirm={() => executeAction(actionTarget.sn, actionTarget.action)}
        />
      )}
      {batchAction && (
        <BatchStatusModal
          batteries={selectedBatteries}
          targetStatus={batchAction.targetStatus}
          actionLabel={batchAction.label}
          onClose={() => setBatchAction(null)}
          onConfirm={handleBatchActionConfirm}
        />
      )}
    </div>
  );
};

export default BatteryArchivePage;
