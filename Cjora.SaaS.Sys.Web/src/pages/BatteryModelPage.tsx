import { useState } from "react";
import {
  Battery, Zap, Thermometer, Box, Award, Search, Plus, Edit2, Eye,
  ChevronRight, X, CheckCircle, FileText, BarChart2, Shield, Tag, Clock,
  History, FolderOpen, ExternalLink, Save, Trash2
} from "lucide-react";
import StatCard from "../components/StatCard";

// ─── Types ───────────────────────────────────────────────────────────────────
interface SpecItem {
  label: string;
  value: string;
}

interface SpecGroup {
  title: string;
  icon: string;
  items: SpecItem[];
}

interface ElectricalSpec {
  name: string;
  spec: string;
  actual: string;
  status: "pass" | "warn" | "fail";
}

interface TestItem {
  name: string;
  standard: string;
  result: string;
  status: "pass" | "warn" | "fail";
  date: string;
}

interface DrawingDoc {
  name: string;
  type: string;
  version: string;
  format: string;
  date: string;
}

interface ChangeRecord {
  id: string;
  time: string;
  operator: string;
  field: string;
  oldValue: string;
  newValue: string;
}

interface LinkedProject {
  id: string;
  name: string;
  customer: string;
  status: "active" | "completed" | "pending" | "suspended";
}

interface BatteryModel {
  id: string;
  name: string;
  chemistry: string;
  voltage: number;
  capacity: number;
  energy: number;
  status: "active" | "deprecated" | "development";
  createdAt: string;
  specs: SpecGroup[];
  electrical: ElectricalSpec[];
  testItems: TestItem[];
  drawings: DrawingDoc[];
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const CHANGE_RECORDS: Record<string, ChangeRecord[]> = {
  "BM-001": [
    { id: "CR-001", time: "2024-05-15 14:22:00", operator: "Admin", field: "状态", oldValue: "开发中", newValue: "使用中" },
    { id: "CR-002", time: "2024-04-01 09:10:00", operator: "张伟", field: "最大持续充电电流", oldValue: "45 A (0.45C)", newValue: "50 A (0.5C)" },
    { id: "CR-003", time: "2024-01-10 16:33:00", operator: "Admin", field: "循环寿命", oldValue: "≥ 1800 次", newValue: "≥ 2000 次 (80% DoD)" },
    { id: "CR-004", time: "2023-10-22 11:05:00", operator: "李明", field: "防护等级", oldValue: "IP54", newValue: "IP55" },
  ],
  "BM-002": [
    { id: "CR-005", time: "2024-02-20 10:00:00", operator: "Admin", field: "状态", oldValue: "开发中", newValue: "使用中" },
    { id: "CR-006", time: "2024-01-05 14:30:00", operator: "张伟", field: "额定能量", oldValue: "19.0 kWh", newValue: "19.2 kWh" },
  ],
  "BM-003": [
    { id: "CR-007", time: "2023-03-01 09:00:00", operator: "Admin", field: "状态", oldValue: "使用中", newValue: "已停用" },
  ],
};

const LINKED_PROJECTS: Record<string, LinkedProject[]> = {
  "BM-001": [
    { id: "PRJ-001", name: "南京储能站 A 期", customer: "南京能源集团", status: "active" },
    { id: "PRJ-003", name: "武汉工业园区储能项目", customer: "武汉制造有限公司", status: "active" },
    { id: "PRJ-005", name: "上海港口备用电源系统", customer: "上海港务局", status: "completed" },
  ],
  "BM-002": [
    { id: "PRJ-002", name: "深圳数据中心 UPS 项目", customer: "深圳科技有限公司", status: "active" },
    { id: "PRJ-004", name: "广州商业综合体储能", customer: "广州万恒地产", status: "pending" },
  ],
  "BM-003": [],
};

const BATTERY_MODELS_INIT: BatteryModel[] = [
  {
    id: "BM-001",
    name: "LFP-100Ah-48V",
    chemistry: "磷酸铁锂 (LFP)",
    voltage: 48,
    capacity: 100,
    energy: 4.8,
    status: "active",
    createdAt: "2023-06-01",
    specs: [
      {
        title: "基本电气参数",
        icon: "zap",
        items: [
          { label: "标称电压", value: "48 V" },
          { label: "标称容量", value: "100 Ah" },
          { label: "标称能量", value: "4.8 kWh" },
          { label: "充电截止电压", value: "54.75 V" },
          { label: "放电截止电压", value: "40.0 V" },
          { label: "最大持续充电电流", value: "50 A (0.5C)" },
          { label: "最大持续放电电流", value: "100 A (1C)" },
          { label: "峰值放电电流", value: "200 A (30s)" },
          { label: "自放电率", value: "≤ 3% / 月" },
        ],
      },
      {
        title: "温度特性",
        icon: "thermometer",
        items: [
          { label: "工作温度（充电）", value: "0 ~ 45 °C" },
          { label: "工作温度（放电）", value: "-20 ~ 60 °C" },
          { label: "存储温度", value: "-30 ~ 35 °C" },
          { label: "最优工作温度", value: "25 ± 5 °C" },
          { label: "热失控触发温度", value: "≥ 130 °C" },
        ],
      },
      {
        title: "物理规格",
        icon: "box",
        items: [
          { label: "外形尺寸（L×W×H）", value: "440 × 150 × 220 mm" },
          { label: "单体电池规格", value: "3.2V / 100Ah" },
          { label: "串并联结构", value: "15S1P" },
          { label: "重量", value: "约 28 kg" },
          { label: "外壳材质", value: "阳极氧化铝合金" },
          { label: "防护等级", value: "IP55" },
        ],
      },
      {
        title: "循环寿命与认证",
        icon: "award",
        items: [
          { label: "循环寿命", value: "≥ 2000 次 (80% DoD)" },
          { label: "日历寿命", value: "≥ 10 年" },
          { label: "容量保持率", value: "≥ 80% @ 2000 次" },
          { label: "相关认证", value: "GB/T 36276-2018, UN38.3, IEC 62619" },
          { label: "安全标准", value: "UL 1973, CE, RoHS" },
        ],
      },
    ],
    electrical: [
      { name: "额定容量验证", spec: "≥ 100 Ah", actual: "102.3 Ah", status: "pass" },
      { name: "额定能量验证", spec: "≥ 4.8 kWh", actual: "4.91 kWh", status: "pass" },
      { name: "内阻测试", spec: "≤ 30 mΩ", actual: "18.5 mΩ", status: "pass" },
      { name: "0.5C 充电效率", spec: "≥ 96%", actual: "97.2%", status: "pass" },
      { name: "1C 放电效率", spec: "≥ 94%", actual: "95.8%", status: "pass" },
      { name: "高温放电 (45°C)", spec: "≥ 90% CN", actual: "91.5% CN", status: "pass" },
      { name: "低温放电 (-10°C)", spec: "≥ 75% CN", actual: "73.1% CN", status: "warn" },
    ],
    testItems: [
      { name: "GB/T 36276-2018 检测", standard: "GB/T 36276", result: "合格", status: "pass", date: "2024-01-05" },
      { name: "UN38.3 运输安全测试", standard: "UN38.3", result: "合格", status: "pass", date: "2023-11-15" },
      { name: "IEC 62619 安全认证", standard: "IEC 62619", result: "合格", status: "pass", date: "2023-10-20" },
      { name: "低温循环测试 (-20°C)", standard: "内部标准", result: "需关注", status: "warn", date: "2024-01-10" },
    ],
    drawings: [
      { name: "LFP-100Ah-48V 电池组装配图", type: "图纸", version: "V2.1", format: "PDF/DWG", date: "2024-01-10" },
      { name: "LFP-100Ah-48V 尺寸公差图纸", type: "图纸", version: "V1.3", format: "DWG", date: "2024-01-08" },
      { name: "LFP-100Ah-48V 使用与安装手册", type: "手册", version: "V2.0", format: "PDF", date: "2023-12-20" },
      { name: "LFP-100Ah-48V 产品规格书", type: "规格书", version: "V3.0", format: "PDF", date: "2024-01-15" },
    ],
  },
  {
    id: "BM-002",
    name: "NMC-200Ah-96V",
    chemistry: "三元锂 (NMC)",
    voltage: 96,
    capacity: 200,
    energy: 19.2,
    status: "active",
    createdAt: "2023-09-01",
    specs: [
      {
        title: "基本电气参数",
        icon: "zap",
        items: [
          { label: "标称电压", value: "96 V" },
          { label: "标称容量", value: "200 Ah" },
          { label: "标称能量", value: "19.2 kWh" },
          { label: "充电截止电压", value: "109.2 V" },
          { label: "放电截止电压", value: "76.8 V" },
        ],
      },
      {
        title: "物理规格",
        icon: "box",
        items: [
          { label: "外形尺寸（L×W×H）", value: "600 × 200 × 280 mm" },
          { label: "串并联结构", value: "26S2P" },
          { label: "重量", value: "约 65 kg" },
          { label: "防护等级", value: "IP67" },
        ],
      },
    ],
    electrical: [
      { name: "额定容量验证", spec: "≥ 200 Ah", actual: "205.1 Ah", status: "pass" },
      { name: "额定能量验证", spec: "≥ 19.2 kWh", actual: "19.7 kWh", status: "pass" },
      { name: "内阻测试", spec: "≤ 20 mΩ", actual: "14.2 mΩ", status: "pass" },
    ],
    testItems: [
      { name: "GB/T 36276-2018 检测", standard: "GB/T 36276", result: "合格", status: "pass", date: "2024-02-10" },
      { name: "UN38.3 运输安全测试", standard: "UN38.3", result: "合格", status: "pass", date: "2024-01-20" },
    ],
    drawings: [
      { name: "NMC-200Ah-96V 电池组装配图", type: "图纸", version: "V1.5", format: "PDF/DWG", date: "2024-02-01" },
      { name: "NMC-200Ah-96V 产品规格书", type: "规格书", version: "V2.0", format: "PDF", date: "2024-02-05" },
    ],
  },
  {
    id: "BM-003",
    name: "LFP-50Ah-24V",
    chemistry: "磷酸铁锂 (LFP)",
    voltage: 24,
    capacity: 50,
    energy: 1.2,
    status: "deprecated",
    createdAt: "2022-01-01",
    specs: [
      {
        title: "基本电气参数",
        icon: "zap",
        items: [
          { label: "标称电压", value: "24 V" },
          { label: "标称容量", value: "50 Ah" },
          { label: "自放电率", value: "≤ 3% / 月" },
        ],
      },
    ],
    electrical: [
      { name: "额定容量验证", spec: "≥ 50 Ah", actual: "51.2 Ah", status: "pass" },
    ],
    testItems: [
      { name: "GB/T 36276-2018 检测", standard: "GB/T 36276", result: "合格", status: "pass", date: "2022-06-01" },
    ],
    drawings: [
      { name: "LFP-50Ah-24V 产品规格书", type: "规格书", version: "V1.0", format: "PDF", date: "2022-06-01" },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  active:      { label: "使用中",  cls: "bg-success/10 text-success border-success/30" },
  deprecated:  { label: "已停用",  cls: "bg-muted text-muted-foreground border-border" },
  development: { label: "开发中",  cls: "bg-primary/10 text-primary border-primary/30" },
};

const PROJECT_STATUS_CFG = {
  active:    { label: "进行中", cls: "bg-success/10 text-success border-success/30" },
  completed: { label: "已完成", cls: "bg-muted text-muted-foreground border-border" },
  pending:   { label: "待启动", cls: "bg-warning/10 text-warning-foreground border-warning/30" },
  suspended: { label: "已暂停", cls: "bg-destructive/10 text-destructive border-destructive/30" },
};

const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  zap:         Zap,
  thermometer: Thermometer,
  box:         Box,
  award:       Award,
};

type DetailTab = "basic" | "specs" | "electrical" | "test" | "drawings" | "changelog" | "linked-projects";

const DETAIL_TABS: { id: DetailTab; label: string }[] = [
  { id: "basic",           label: "基础信息" },
  { id: "specs",           label: "技术规格" },
  { id: "electrical",      label: "电气性能" },
  { id: "test",            label: "测试报告" },
  { id: "drawings",        label: "图纸资料" },
  { id: "changelog",       label: "变更记录" },
  { id: "linked-projects", label: "关联项目" },
];

// ─── Inline Editable Field ────────────────────────────────────────────────────
interface EditableFieldProps {
  value: string;
  onSave: (v: string) => void;
}

const EditableField = ({ value = "", onSave }: EditableFieldProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    onSave(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
          className="bms-input text-xs py-0.5 px-1.5 w-36"
        />
        <button onClick={commit} className="text-success hover:opacity-80"><CheckCircle size={13} /></button>
        <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground"><X size={12} /></button>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setDraft(value); setEditing(true); }}
      className="group flex items-center gap-1 text-xs font-medium text-foreground hover:text-primary transition-colors"
      title="点击编辑"
    >
      {value}
      <Edit2 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
    </button>
  );
};

// ─── Model Form Modal ─────────────────────────────────────────────────────────
interface ModelFormModalProps {
  model: Partial<BatteryModel> | null;
  onClose: () => void;
  onSave: (model: Partial<BatteryModel>) => void;
}

const ModelFormModal = ({ model, onClose, onSave }: ModelFormModalProps) => {
  const isEdit = !!(model && model.id);
  const [activeTab, setActiveTab] = useState<DetailTab>("basic");

  // ---- 基础信息 ----
  const [form, setForm] = useState({
    name:      model?.name      || "",
    chemistry: model?.chemistry || "",
    voltage:   String(model?.voltage   || ""),
    capacity:  String(model?.capacity  || ""),
    energy:    String(model?.energy    || ""),
    status:    (model?.status || "development") as BatteryModel["status"],
  });

  // ---- 技术规格（可编辑列表） ----
  const [specs, setSpecs] = useState<SpecGroup[]>(model?.specs ? JSON.parse(JSON.stringify(model.specs)) : []);

  // ---- 电气性能 ----
  const [electrical, setElectrical] = useState<ElectricalSpec[]>(model?.electrical ? JSON.parse(JSON.stringify(model.electrical)) : []);

  // ---- 测试报告 ----
  const [testItems, setTestItems] = useState<TestItem[]>(model?.testItems ? JSON.parse(JSON.stringify(model.testItems)) : []);

  // ---- 图纸资料 ----
  const [drawings, setDrawings] = useState<DrawingDoc[]>(model?.drawings ? JSON.parse(JSON.stringify(model.drawings)) : []);

  const handleSave = () => {
    if (!form.name || !form.chemistry) return;
    onSave({
      ...model,
      name:      form.name,
      chemistry: form.chemistry,
      voltage:   Number(form.voltage),
      capacity:  Number(form.capacity),
      energy:    Number(form.energy),
      status:    form.status,
      specs,
      electrical,
      testItems,
      drawings,
    });
    console.log(`[BatteryModel] ${isEdit ? "编辑" : "新增"}型号: ${form.name}`);
  };

  const formTabs: { id: DetailTab; label: string }[] = [
    { id: "basic",     label: "基础信息" },
    { id: "specs",     label: "技术规格" },
    { id: "electrical",label: "电气性能" },
    { id: "test",      label: "测试报告" },
    { id: "drawings",  label: "图纸资料" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="bg-card w-full max-w-2xl rounded-2xl shadow-custom border border-border overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Battery size={15} className="text-primary" />
            </div>
            <h3 className="font-bold text-foreground">{isEdit ? "编辑电池型号" : "新增电池型号"}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-border bg-card flex-shrink-0 px-2">
          {formTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 基础信息 */}
          {activeTab === "basic" && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">型号名称 <span className="text-destructive">*</span></label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如 LFP-100Ah-48V" className="bms-input w-full text-sm" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">化学体系 <span className="text-destructive">*</span></label>
                  <select value={form.chemistry} onChange={(e) => setForm({ ...form, chemistry: e.target.value })} className="bms-input w-full text-sm">
                    <option value="">-- 选择体系 --</option>
                    <option value="磷酸铁锂 (LFP)">磷酸铁锂 (LFP)</option>
                    <option value="三元锂 (NMC)">三元锂 (NMC)</option>
                    <option value="锰酸锂 (LMO)">锰酸锂 (LMO)</option>
                    <option value="钴酸锂 (LCO)">钴酸锂 (LCO)</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">标称电压 (V)</label>
                  <input type="number" value={form.voltage} onChange={(e) => setForm({ ...form, voltage: e.target.value })} placeholder="如 48" className="bms-input w-full text-sm" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">标称容量 (Ah)</label>
                  <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="如 100" className="bms-input w-full text-sm" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">标称能量 (kWh)</label>
                  <input type="number" value={form.energy} onChange={(e) => setForm({ ...form, energy: e.target.value })} placeholder="如 4.8" className="bms-input w-full text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">状态</label>
                <div className="flex gap-2">
                  {(["development", "active", "deprecated"] as const).map((s) => (
                    <button key={s} onClick={() => setForm({ ...form, status: s })}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${form.status === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                      {STATUS_CFG[s].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 技术规格 */}
          {activeTab === "specs" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">可在此处编辑各规格分组及参数条目</p>
              {specs.map((group, gi) => (
                <div key={gi} className="border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/30 border-b border-border">
                    <input
                      value={group.title}
                      onChange={(e) => {
                        const next = [...specs];
                        next[gi] = { ...next[gi], title: e.target.value };
                        setSpecs(next);
                      }}
                      className="bms-input text-xs py-1 px-2 flex-1"
                    />
                    <button onClick={() => setSpecs(specs.filter((_, i) => i !== gi))} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="divide-y divide-border">
                    {group.items.map((item, ii) => (
                      <div key={ii} className="flex items-center gap-2 px-4 py-2">
                        <input
                          value={item.label}
                          onChange={(e) => {
                            const next = [...specs];
                            next[gi].items[ii] = { ...next[gi].items[ii], label: e.target.value };
                            setSpecs(next);
                          }}
                          className="bms-input text-xs py-1 px-2 flex-1"
                          placeholder="参数名称"
                        />
                        <input
                          value={item.value}
                          onChange={(e) => {
                            const next = [...specs];
                            next[gi].items[ii] = { ...next[gi].items[ii], value: e.target.value };
                            setSpecs(next);
                          }}
                          className="bms-input text-xs py-1 px-2 flex-1"
                          placeholder="参数值"
                        />
                        <button onClick={() => {
                          const next = [...specs];
                          next[gi].items = next[gi].items.filter((_, i) => i !== ii);
                          setSpecs(next);
                        }} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-border">
                    <button
                      onClick={() => {
                        const next = [...specs];
                        next[gi].items = [...next[gi].items, { label: "", value: "" }];
                        setSpecs(next);
                      }}
                      className="flex items-center gap-1 text-xs text-primary hover:opacity-80 transition-opacity"
                    >
                      <Plus size={11} /> 添加参数
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setSpecs([...specs, { title: "新分组", icon: "zap", items: [] }])}
                className="w-full py-2 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus size={12} /> 添加规格分组
              </button>
            </div>
          )}

          {/* 电气性能 */}
          {activeTab === "electrical" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">可在此处编辑电气性能测试项目</p>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-left">测试项目</th>
                      <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-left">技术规范</th>
                      <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-left">实测值</th>
                      <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-left">结论</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {electrical.map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5">
                          <input value={row.name} onChange={(e) => {
                            const next = [...electrical];
                            next[i] = { ...next[i], name: e.target.value };
                            setElectrical(next);
                          }} className="bms-input text-xs py-1 px-2 w-full" />
                        </td>
                        <td className="px-3 py-1.5">
                          <input value={row.spec} onChange={(e) => {
                            const next = [...electrical];
                            next[i] = { ...next[i], spec: e.target.value };
                            setElectrical(next);
                          }} className="bms-input text-xs py-1 px-2 w-full font-mono" />
                        </td>
                        <td className="px-3 py-1.5">
                          <input value={row.actual} onChange={(e) => {
                            const next = [...electrical];
                            next[i] = { ...next[i], actual: e.target.value };
                            setElectrical(next);
                          }} className="bms-input text-xs py-1 px-2 w-full font-mono" />
                        </td>
                        <td className="px-3 py-1.5">
                          <select value={row.status} onChange={(e) => {
                            const next = [...electrical];
                            next[i] = { ...next[i], status: e.target.value as ElectricalSpec["status"] };
                            setElectrical(next);
                          }} className="bms-input text-xs py-1 px-2">
                            <option value="pass">合格</option>
                            <option value="warn">关注</option>
                            <option value="fail">不合格</option>
                          </select>
                        </td>
                        <td className="px-3 py-1.5">
                          <button onClick={() => setElectrical(electrical.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={() => setElectrical([...electrical, { name: "", spec: "", actual: "", status: "pass" }])}
                className="flex items-center gap-1.5 text-xs text-primary hover:opacity-80 transition-opacity"
              >
                <Plus size={12} /> 添加测试项
              </button>
            </div>
          )}

          {/* 测试报告 */}
          {activeTab === "test" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">可在此处编辑认证与测试报告</p>
              <div className="space-y-3">
                {testItems.map((item, i) => (
                  <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs text-muted-foreground">报告名称</label>
                        <input value={item.name} onChange={(e) => {
                          const next = [...testItems];
                          next[i] = { ...next[i], name: e.target.value };
                          setTestItems(next);
                        }} className="bms-input text-xs py-1 px-2 w-full" />
                      </div>
                      <div className="w-32 space-y-1">
                        <label className="text-xs text-muted-foreground">标准</label>
                        <input value={item.standard} onChange={(e) => {
                          const next = [...testItems];
                          next[i] = { ...next[i], standard: e.target.value };
                          setTestItems(next);
                        }} className="bms-input text-xs py-1 px-2 w-full" />
                      </div>
                      <div className="w-24 space-y-1">
                        <label className="text-xs text-muted-foreground">日期</label>
                        <input type="date" value={item.date} onChange={(e) => {
                          const next = [...testItems];
                          next[i] = { ...next[i], date: e.target.value };
                          setTestItems(next);
                        }} className="bms-input text-xs py-1 px-2 w-full" />
                      </div>
                      <div className="w-24 space-y-1">
                        <label className="text-xs text-muted-foreground">结果</label>
                        <select value={item.status} onChange={(e) => {
                          const next = [...testItems];
                          const s = e.target.value as TestItem["status"];
                          next[i] = { ...next[i], status: s, result: s === "pass" ? "合格" : s === "warn" ? "需关注" : "不合格" };
                          setTestItems(next);
                        }} className="bms-input text-xs py-1 px-2">
                          <option value="pass">合格</option>
                          <option value="warn">需关注</option>
                          <option value="fail">不合格</option>
                        </select>
                      </div>
                      <button onClick={() => setTestItems(testItems.filter((_, j) => j !== i))} className="mt-5 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setTestItems([...testItems, { name: "", standard: "", result: "合格", status: "pass", date: new Date().toISOString().split("T")[0] }])}
                className="flex items-center gap-1.5 text-xs text-primary hover:opacity-80 transition-opacity"
              >
                <Plus size={12} /> 添加报告
              </button>
            </div>
          )}

          {/* 图纸资料 */}
          {activeTab === "drawings" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">可在此处编辑图纸与技术文件列表</p>
              <div className="space-y-3">
                {drawings.map((doc, i) => (
                  <div key={i} className="border border-border rounded-lg p-3">
                    <div className="flex gap-2 flex-wrap">
                      <div className="flex-1 min-w-48 space-y-1">
                        <label className="text-xs text-muted-foreground">文件名称</label>
                        <input value={doc.name} onChange={(e) => {
                          const next = [...drawings];
                          next[i] = { ...next[i], name: e.target.value };
                          setDrawings(next);
                        }} className="bms-input text-xs py-1 px-2 w-full" />
                      </div>
                      <div className="w-24 space-y-1">
                        <label className="text-xs text-muted-foreground">类型</label>
                        <input value={doc.type} onChange={(e) => {
                          const next = [...drawings];
                          next[i] = { ...next[i], type: e.target.value };
                          setDrawings(next);
                        }} className="bms-input text-xs py-1 px-2 w-full" />
                      </div>
                      <div className="w-20 space-y-1">
                        <label className="text-xs text-muted-foreground">版本</label>
                        <input value={doc.version} onChange={(e) => {
                          const next = [...drawings];
                          next[i] = { ...next[i], version: e.target.value };
                          setDrawings(next);
                        }} className="bms-input text-xs py-1 px-2 w-full" />
                      </div>
                      <div className="w-24 space-y-1">
                        <label className="text-xs text-muted-foreground">格式</label>
                        <input value={doc.format} onChange={(e) => {
                          const next = [...drawings];
                          next[i] = { ...next[i], format: e.target.value };
                          setDrawings(next);
                        }} className="bms-input text-xs py-1 px-2 w-full" />
                      </div>
                      <div className="w-28 space-y-1">
                        <label className="text-xs text-muted-foreground">日期</label>
                        <input type="date" value={doc.date} onChange={(e) => {
                          const next = [...drawings];
                          next[i] = { ...next[i], date: e.target.value };
                          setDrawings(next);
                        }} className="bms-input text-xs py-1 px-2 w-full" />
                      </div>
                      <button onClick={() => setDrawings(drawings.filter((_, j) => j !== i))} className="mt-5 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setDrawings([...drawings, { name: "", type: "图纸", version: "V1.0", format: "PDF", date: new Date().toISOString().split("T")[0] }])}
                className="flex items-center gap-1.5 text-xs text-primary hover:opacity-80 transition-opacity"
              >
                <Plus size={12} /> 添加文件
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-muted/10 flex-shrink-0">
          <button onClick={onClose} className="bms-btn-secondary py-2 px-4 text-xs">取消</button>
          <button
            onClick={handleSave}
            disabled={!form.name || !form.chemistry}
            className="bms-btn-primary py-2 px-4 flex items-center gap-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={13} /> {isEdit ? "保存更改" : "创建型号"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Detail Panel ─────────────────────────────────────────────────────────────
interface ModelDetailPanelProps {
  model: BatteryModel;
  onClose: () => void;
  onEdit: (model: BatteryModel) => void;
  onNavigateToProject: (projectId: string) => void;
}

const ModelDetailPanel = ({ model, onClose, onEdit, onNavigateToProject }: ModelDetailPanelProps) => {
  const [activeTab, setActiveTab] = useState<DetailTab>("basic");
  const changeRecords = CHANGE_RECORDS[model.id] || [];
  const linkedProjects = LINKED_PROJECTS[model.id] || [];

  const renderContent = () => {
    switch (activeTab) {
      case "basic":
        return (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl border border-border">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Battery size={28} className="text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground">{model.name}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{model.chemistry}</p>
                <span className={`inline-flex items-center mt-1.5 text-xs px-2 py-0.5 rounded border font-medium ${STATUS_CFG[model.status].cls}`}>
                  {STATUS_CFG[model.status].label}
                </span>
              </div>
              <button onClick={() => onEdit(model)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors">
                <Edit2 size={12} /> 编辑
              </button>
            </div>
            <div className="flex gap-4">
              <div className="flex-1 bg-card rounded-xl border border-border p-4 text-center">
                <p className="text-2xl font-bold text-primary">{model.voltage}<span className="text-sm font-normal text-muted-foreground ml-1">V</span></p>
                <p className="text-xs text-muted-foreground mt-1">标称电压</p>
              </div>
              <div className="flex-1 bg-card rounded-xl border border-border p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{model.capacity}<span className="text-sm font-normal text-muted-foreground ml-1">Ah</span></p>
                <p className="text-xs text-muted-foreground mt-1">标称容量</p>
              </div>
              <div className="flex-1 bg-card rounded-xl border border-border p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{model.energy}<span className="text-sm font-normal text-muted-foreground ml-1">kWh</span></p>
                <p className="text-xs text-muted-foreground mt-1">标称能量</p>
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/20">
                <p className="text-sm font-semibold text-foreground">档案信息</p>
              </div>
              <div className="divide-y divide-border">
                {[
                  { label: "型号编码", value: model.id },
                  { label: "电芯化学体系", value: model.chemistry },
                  { label: "创建时间", value: model.createdAt },
                  { label: "电气规格", value: `${model.voltage}V / ${model.capacity}Ah / ${model.energy}kWh` },
                  { label: "当前状态", value: STATUS_CFG[model.status].label },
                  { label: "关联项目数", value: `${linkedProjects.length} 个` },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className="text-xs font-medium text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "specs":
        return (
          <div className="p-6 space-y-4">
            <div className="flex flex-wrap gap-4">
              {model.specs.map((group) => {
                const IconComp = ICON_MAP[group.icon] || Zap;
                return (
                  <div key={group.title} className="flex-1 min-w-64 bg-card rounded-xl border border-border overflow-hidden">
                    <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border bg-muted/20">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                        <IconComp size={14} className="text-primary" />
                      </div>
                      <h4 className="text-sm font-semibold text-foreground">{group.title}</h4>
                    </div>
                    <div className="divide-y divide-border">
                      {group.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between px-5 py-2.5 hover:bg-muted/20">
                          <span className="text-xs text-muted-foreground">{item.label}</span>
                          <span className="text-xs font-medium text-foreground">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case "electrical":
        return (
          <div className="p-6 space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 bg-card rounded-xl border border-border p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle size={16} className="text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">通过项</p>
                  <p className="text-lg font-bold text-success">{model.electrical.filter(e => e.status === "pass").length}</p>
                </div>
              </div>
              <div className="flex-1 bg-card rounded-xl border border-border p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center">
                  <BarChart2 size={16} className="text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">需关注</p>
                  <p className="text-lg font-bold text-warning">{model.electrical.filter(e => e.status === "warn").length}</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-left">测试项目</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-left">技术规范</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-left">实测值</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-left">结论</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {model.electrical.map((row, i) => (
                    <tr key={i} className="hover:bg-muted/20">
                      <td className="px-5 py-3 text-xs text-foreground">{row.name}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground font-mono">{row.spec}</td>
                      <td className="px-5 py-3 text-xs font-mono font-medium text-foreground">{row.actual}</td>
                      <td className="px-5 py-3">
                        {row.status === "pass" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-success font-medium"><CheckCircle size={11} /> 合格</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-warning font-medium"><BarChart2 size={11} /> 关注</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "test":
        return (
          <div className="p-6 space-y-4">
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
                <Shield size={14} className="text-primary" />
                <h4 className="text-sm font-semibold text-foreground">认证与测试报告</h4>
              </div>
              <div className="divide-y divide-border">
                {model.testItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.status === "pass" ? "bg-success/10" : "bg-warning/10"}`}>
                      <FileText size={14} className={item.status === "pass" ? "text-success" : "text-warning"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Tag size={10} /> {item.standard}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={10} /> {item.date}</span>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium flex-shrink-0 ${item.status === "pass" ? "bg-success/10 text-success border-success/30" : "bg-warning/10 text-warning border-warning/30"}`}>
                      {item.result}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "drawings":
        return (
          <div className="p-6 space-y-4">
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
                <FileText size={14} className="text-primary" />
                <h4 className="text-sm font-semibold text-foreground">图纸与技术文件</h4>
              </div>
              {(model.drawings || []).map((doc, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-border last:border-0 hover:bg-muted/20">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <FileText size={15} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{doc.type}</span>
                      <span className="text-xs text-muted-foreground">{doc.version}</span>
                      <span className="text-xs text-muted-foreground">{doc.format}</span>
                      <span className="text-xs text-muted-foreground">{doc.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="预览">
                      <Eye size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "changelog":
        return (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground mb-2">
              <History size={12} className="text-primary" />
              以下为字段变更历史记录，仅供查阅，不可编辑或删除
            </div>
            {changeRecords.length > 0 ? (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
                  <History size={14} className="text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">变更记录</h4>
                  <span className="ml-auto text-xs text-muted-foreground">{changeRecords.length} 条记录</span>
                </div>
                <div className="divide-y divide-border">
                  {changeRecords.map((record) => (
                    <div key={record.id} className="px-5 py-4 hover:bg-muted/20">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">{record.field}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={10} /> {record.time}</span>
                        <span className="text-xs text-muted-foreground">操作人：{record.operator}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded line-through">{record.oldValue}</span>
                        <ChevronRight size={12} className="text-muted-foreground flex-shrink-0" />
                        <span className="text-xs bg-success/10 text-success border border-success/20 px-2 py-1 rounded font-medium">{record.newValue}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-muted-foreground">
                <History size={32} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">暂无变更记录</p>
              </div>
            )}
          </div>
        );

      case "linked-projects":
        return (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground mb-2">
              <FolderOpen size={12} className="text-primary" />
              以下为使用本型号的关联项目，点击项目名称可跳转查看详情
            </div>
            {linkedProjects.length > 0 ? (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
                  <FolderOpen size={14} className="text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">关联项目</h4>
                  <span className="ml-auto text-xs text-muted-foreground">{linkedProjects.length} 个项目</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-left">项目名称</th>
                        <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-left">客户</th>
                        <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-left">状态</th>
                        <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-left">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {linkedProjects.map((proj) => (
                        <tr key={proj.id} className="hover:bg-muted/20">
                          <td className="px-5 py-3">
                            <button onClick={() => { onNavigateToProject(proj.id); onClose(); }}
                              className="text-sm font-medium text-primary hover:underline flex items-center gap-1 transition-colors">
                              {proj.name}
                              <ExternalLink size={11} />
                            </button>
                          </td>
                          <td className="px-5 py-3 text-sm text-foreground">{proj.customer}</td>
                          <td className="px-5 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded border font-medium ${PROJECT_STATUS_CFG[proj.status].cls}`}>
                              {PROJECT_STATUS_CFG[proj.status].label}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <button onClick={() => { onNavigateToProject(proj.id); onClose(); }}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                              <ExternalLink size={12} /> 查看详情
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-muted-foreground">
                <FolderOpen size={32} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">该型号暂未关联任何项目</p>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="ml-auto w-full max-w-3xl bg-background h-full flex flex-col shadow-custom border-l border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Battery size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">{model.name}</h2>
              <p className="text-xs text-muted-foreground">{model.chemistry}</p>
            </div>
            <span className={`ml-1 text-xs px-2 py-0.5 rounded border font-medium ${STATUS_CFG[model.status].cls}`}>
              {STATUS_CFG[model.status].label}
            </span>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex border-b border-border bg-card flex-shrink-0 px-2 overflow-x-auto">
          {DETAIL_TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {tab.label}
              {tab.id === "changelog" && changeRecords.length > 0 && (
                <span className="ml-1.5 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{changeRecords.length}</span>
              )}
              {tab.id === "linked-projects" && linkedProjects.length > 0 && (
                <span className="ml-1.5 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{linkedProjects.length}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">{renderContent()}</div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
interface BatteryModelPageProps {
  onNavigateToProject?: (projectId: string) => void;
}

const BatteryModelPage = ({ onNavigateToProject = () => {} }: BatteryModelPageProps) => {
  const [models, setModels] = useState<BatteryModel[]>(BATTERY_MODELS_INIT);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "deprecated" | "development">("all");
  const [selectedModel, setSelectedModel] = useState<BatteryModel | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingModel, setEditingModel] = useState<BatteryModel | null>(null);

  const filtered = models.filter((m) => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.chemistry.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeCount = models.filter(m => m.status === "active").length;
  const depCount = models.filter(m => m.status === "deprecated").length;
  const devCount = models.filter(m => m.status === "development").length;

  const handleOpenNew = () => { setEditingModel(null); setShowFormModal(true); };
  const handleOpenEdit = (model: BatteryModel) => { setEditingModel(model); setSelectedModel(null); setShowFormModal(true); };

  const handleSaveModel = (data: Partial<BatteryModel>) => {
    if (data.id) {
      setModels(prev => prev.map(m => m.id === data.id ? { ...m, ...data } as BatteryModel : m));
      console.log("[BatteryModelPage] 编辑型号:", data.name);
    } else {
      const newModel: BatteryModel = {
        id: `BM-${String(models.length + 1).padStart(3, "0")}`,
        name: data.name || "",
        chemistry: data.chemistry || "",
        voltage: data.voltage || 0,
        capacity: data.capacity || 0,
        energy: data.energy || 0,
        status: data.status || "development",
        createdAt: new Date().toISOString().split("T")[0],
        specs: data.specs || [],
        electrical: data.electrical || [],
        testItems: data.testItems || [],
        drawings: data.drawings || [],
      };
      setModels(prev => [...prev, newModel]);
      console.log("[BatteryModelPage] 新增型号:", newModel.name);
    }
    setShowFormModal(false);
    setEditingModel(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      <div className="flex gap-3">
        <div className="flex-1"><StatCard title="电池型号总数" value={String(models.length)} unit="个" iconName="battery" colorType="blue" /></div>
        <div className="flex-1"><StatCard title="使用中型号" value={String(activeCount)} unit="个" iconName="activity" colorType="green" /></div>
        <div className="flex-1"><StatCard title="开发中型号" value={String(devCount)} unit="个" iconName="cpu" colorType="teal" /></div>
        <div className="flex-1"><StatCard title="已停用型号" value={String(depCount)} unit="个" iconName="check" colorType="orange" /></div>
      </div>

      <div className="bms-card p-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索型号名称..." className="bms-input pl-8 w-52 text-sm" />
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={12} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
              {(["all", "active", "development", "deprecated"] as const).map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${statusFilter === s ? "bg-card text-foreground shadow-custom" : "text-muted-foreground hover:text-foreground"}`}>
                  {s === "all" ? "全部" : STATUS_CFG[s].label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleOpenNew} className="bms-btn-primary flex items-center gap-1.5 text-xs">
            <Plus size={13} /> 新增型号
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bms-table-header text-left">
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">型号名称</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">化学体系</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">标称电压</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">标称容量</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">标称能量</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">状态</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">创建时间</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map((m, i) => (
                <tr key={m.id} className={`table-row-hover border-b border-border text-sm ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Battery size={14} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{m.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{m.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-foreground">{m.chemistry}</td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-sm font-semibold text-foreground">{m.voltage} <span className="text-xs font-normal text-muted-foreground">V</span></span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-sm font-semibold text-foreground">{m.capacity} <span className="text-xs font-normal text-muted-foreground">Ah</span></span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-sm font-semibold text-foreground">{m.energy} <span className="text-xs font-normal text-muted-foreground">kWh</span></span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${STATUS_CFG[m.status].cls}`}>{STATUS_CFG[m.status].label}</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{m.createdAt}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelectedModel(m)} className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-primary" title="查看详情">
                        <Eye size={13} />
                      </button>
                      <button onClick={() => handleOpenEdit(m)} className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-primary" title="编辑">
                        <Edit2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-muted-foreground text-sm">
                    <Battery size={32} className="mx-auto mb-3 opacity-20" />
                    未找到匹配的电池型号
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/10">
          <span className="text-xs text-muted-foreground">共 {filtered.length} 条记录</span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ChevronRight size={12} /> 点击操作列按钮查看完整技术规格
          </div>
        </div>
      </div>

      {selectedModel && (
        <ModelDetailPanel model={selectedModel} onClose={() => setSelectedModel(null)} onEdit={handleOpenEdit} onNavigateToProject={onNavigateToProject} />
      )}

      {showFormModal && (
        <ModelFormModal
          model={editingModel}
          onClose={() => { setShowFormModal(false); setEditingModel(null); }}
          onSave={handleSaveModel}
        />
      )}
    </div>
  );
};

export default BatteryModelPage;
