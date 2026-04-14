import { useState } from "react";
import {
  ShieldCheck, Cpu, Zap, Thermometer, AlertTriangle, CheckCircle,
  Search, Plus, Eye, Edit2, X, ChevronRight, GitBranch, FileText,
  MessageSquare, Tag, Clock, Activity, History, FolderOpen, ExternalLink,
  Save, Trash2, RefreshCw, ArrowRight, Check, AlertCircle, Filter
} from "lucide-react";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import { OTA_RECORDS_GLOBAL } from "./FirmwareManagePage";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CircuitSpecItem {
  label: string;
  value: string;
  tolerance?: string;
}

interface CircuitSpec {
  category: string;
  icon: string;
  color: string;
  items: CircuitSpecItem[];
}

interface FirmwareVersion {
  version: string;
  status: "stable" | "beta" | "deprecated";
  released: string;
  desc: string;
  hardware: string;
}

interface CommDetail {
  protocol: string;
  baudRate: string;
  frameFormat: string;
  desc: string;
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

interface ProtectionBoard {
  id: string;
  name: string;
  model: string;
  chipset: string;
  series: number;
  balanceType: string;
  comProtocols: string[];
  status: "active" | "deprecated" | "development";
  createdAt: string;
  circuitSpecs: CircuitSpec[];
  firmwareVersions: FirmwareVersion[];
  commDetails: CommDetail[];
  drawings: DrawingDoc[];
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const CHANGE_RECORDS: Record<string, ChangeRecord[]> = {
  "PB-001": [
    { id: "CR-PB-001", time: "2024-05-10 10:30:00", operator: "Admin", field: "状态", oldValue: "开发中", newValue: "使用中" },
    { id: "CR-PB-002", time: "2024-03-22 14:15:00", operator: "张伟", field: "充电过流检测值 (OCC)", oldValue: "50 A", newValue: "55 A" },
    { id: "CR-PB-003", time: "2024-02-01 09:40:00", operator: "李明", field: "均衡方式", oldValue: "主动均衡", newValue: "被动均衡（电阻耗散型）" },
    { id: "CR-PB-004", time: "2023-12-15 16:00:00", operator: "Admin", field: "SOC估算算法", oldValue: "库伦积分法", newValue: "库伦积分法 + EKF 修正" },
  ],
  "PB-002": [
    { id: "CR-PB-005", time: "2024-04-18 11:00:00", operator: "Admin", field: "状态", oldValue: "开发中", newValue: "使用中" },
    { id: "CR-PB-006", time: "2024-03-05 09:20:00", operator: "张伟", field: "放电过流检测值 I (OCD1)", oldValue: "230 A", newValue: "250 A" },
  ],
};

const LINKED_PROJECTS: Record<string, LinkedProject[]> = {
  "PB-001": [
    { id: "PRJ-001", name: "南京储能站 A 期", customer: "南京能源集团", status: "active" },
    { id: "PRJ-005", name: "上海港口备用电源系统", customer: "上海港务局", status: "completed" },
  ],
  "PB-002": [
    { id: "PRJ-002", name: "深圳数据中心 UPS 项目", customer: "深圳科技有限公司", status: "active" },
    { id: "PRJ-004", name: "广州商业综合体储能", customer: "广州万恒地产", status: "pending" },
    { id: "PRJ-006", name: "苏州新能源汽车充电站", customer: "苏州充电网络", status: "active" },
  ],
};

const PROTECTION_BOARDS_INIT: ProtectionBoard[] = [
  {
    id: "PB-001",
    name: "BMS-V3 保护板",
    model: "LFP-100Ah-48V",
    chipset: "TI BQ76952",
    series: 15,
    balanceType: "被动均衡（电阻耗散型）",
    comProtocols: ["CAN 2.0B", "RS485 (MODBUS RTU)"],
    status: "active",
    createdAt: "2023-05-01",
    circuitSpecs: [
      {
        category: "过充保护",
        icon: "zap",
        color: "destructive",
        items: [
          { label: "单体过充检测电压", value: "3.65 V", tolerance: "± 30 mV" },
          { label: "单体过充保护恢复电压", value: "3.50 V", tolerance: "± 50 mV" },
          { label: "过充检测延时", value: "1 s", tolerance: "± 0.2 s" },
        ],
      },
      {
        category: "过放保护",
        icon: "zap",
        color: "warning",
        items: [
          { label: "单体过放检测电压", value: "2.50 V", tolerance: "± 50 mV" },
          { label: "单体过放保护恢复电压", value: "2.80 V", tolerance: "± 50 mV" },
          { label: "过放检测延时", value: "200 ms", tolerance: "± 50 ms" },
        ],
      },
      {
        category: "过流保护",
        icon: "shield",
        color: "primary",
        items: [
          { label: "充电过流检测值 (OCC)", value: "55 A", tolerance: "± 3 A" },
          { label: "放电过流检测值 I (OCD1)", value: "120 A", tolerance: "± 5 A" },
          { label: "短路保护关断时间", value: "< 200 µs", tolerance: "-" },
        ],
      },
      {
        category: "温度保护",
        icon: "thermometer",
        color: "destructive",
        items: [
          { label: "充电过温保护 (CHG OTP)", value: "50 °C", tolerance: "± 2 °C" },
          { label: "放电过温保护 (DSG OTP)", value: "65 °C", tolerance: "± 2 °C" },
          { label: "充电低温保护 (CHG UTP)", value: "-5 °C", tolerance: "± 3 °C" },
        ],
      },
    ],
    firmwareVersions: [
      { version: "v2.1.3", status: "stable", released: "2024-05-20", desc: "优化充电控制算法，修复过温告警偶发误报", hardware: "HW-3.x" },
      { version: "v2.1.2", status: "deprecated", released: "2024-04-10", desc: "新增MQTT心跳机制，修复通信超时bug", hardware: "HW-3.x" },
      { version: "v2.2.0-beta", status: "beta", released: "2024-06-05", desc: "Beta版本：新增SOH计算模型V2", hardware: "HW-3.x" },
    ],
    commDetails: [
      { protocol: "CAN 2.0B", baudRate: "250 kbps", frameFormat: "标准帧 11-bit / 扩展帧 29-bit", desc: "主要用于电池管理系统实时数据上报，支持广播与点对点通信。" },
      { protocol: "RS485 (MODBUS RTU)", baudRate: "9600 ~ 115200 bps", frameFormat: "MODBUS RTU 帧", desc: "用于配置参数读写与诊断，支持多设备总线级联，最多 32 节点。" },
    ],
    drawings: [
      { name: "BMS-V3 保护板 电路原理图", type: "原理图", version: "V3.0", format: "PDF/SCH", date: "2024-01-08" },
      { name: "BMS-V3 保护板 PCB Layout", type: "PCB", version: "V3.0", format: "Gerber", date: "2024-01-08" },
      { name: "BMS-V3 保护板 通信协议手册", type: "手册", version: "V1.5", format: "PDF", date: "2024-01-12" },
    ],
  },
  {
    id: "PB-002",
    name: "BMS-V4 保护板",
    model: "NMC-200Ah-96V",
    chipset: "TI BQ76972",
    series: 26,
    balanceType: "主动均衡（电感型）",
    comProtocols: ["CAN FD", "RS485 (MODBUS RTU)", "MQTT"],
    status: "active",
    createdAt: "2023-09-15",
    circuitSpecs: [
      {
        category: "过充保护",
        icon: "zap",
        color: "destructive",
        items: [
          { label: "单体过充检测电压", value: "4.25 V", tolerance: "± 25 mV" },
          { label: "过充保护恢复电压", value: "4.10 V", tolerance: "± 40 mV" },
          { label: "过充检测延时", value: "0.8 s", tolerance: "± 0.2 s" },
        ],
      },
      {
        category: "过流保护",
        icon: "shield",
        color: "primary",
        items: [
          { label: "充电过流检测值 (OCC)", value: "110 A", tolerance: "± 5 A" },
          { label: "放电过流检测值 I (OCD1)", value: "250 A", tolerance: "± 10 A" },
          { label: "短路保护关断时间", value: "< 150 µs", tolerance: "-" },
        ],
      },
    ],
    firmwareVersions: [
      { version: "v3.0.0", status: "stable", released: "2024-06-01", desc: "全新架构，支持双向充放电控制", hardware: "HW-4.x" },
      { version: "v3.0.1", status: "beta", released: "2024-06-09", desc: "修复v3.0.0充电截止电压计算问题", hardware: "HW-4.x" },
    ],
    commDetails: [
      { protocol: "CAN FD", baudRate: "1 Mbps (仲裁段) / 5 Mbps (数据段)", frameFormat: "CAN FD 扩展帧", desc: "高速数据传输，适合高频率实时监控场景。" },
      { protocol: "MQTT", baudRate: "以太网", frameFormat: "JSON 负载", desc: "通过以太网接入云平台，支持Topic订阅与发布。" },
    ],
    drawings: [
      { name: "BMS-V4 保护板 电路原理图", type: "原理图", version: "V4.0", format: "PDF/SCH", date: "2024-02-10" },
      { name: "BMS-V4 保护板 硬件设计规格书", type: "规格书", version: "V2.1", format: "PDF", date: "2023-12-15" },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  active:      { label: "使用中", cls: "bg-success/10 text-success border-success/30" },
  deprecated:  { label: "已停用", cls: "bg-muted text-muted-foreground border-border" },
  development: { label: "开发中", cls: "bg-primary/10 text-primary border-primary/30" },
};

const PROJECT_STATUS_CFG = {
  active:    { label: "进行中", cls: "bg-success/10 text-success border-success/30" },
  completed: { label: "已完成", cls: "bg-muted text-muted-foreground border-border" },
  pending:   { label: "待启动", cls: "bg-warning/10 text-warning-foreground border-warning/30" },
  suspended: { label: "已暂停", cls: "bg-destructive/10 text-destructive border-destructive/30" },
};

const FW_STATUS_CFG = {
  stable:     { label: "稳定版", cls: "bg-success/10 text-success border-success/30", dot: "bg-success" },
  beta:       { label: "Beta",   cls: "bg-warning/10 text-warning-foreground border-warning/30", dot: "bg-warning" },
  deprecated: { label: "废弃",   cls: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
};

const COLOR_MAP: Record<string, string> = {
  destructive: "bg-destructive/10 text-destructive",
  warning:     "bg-warning/10 text-warning",
  primary:     "bg-primary/10 text-primary",
};
const BORDER_MAP: Record<string, string> = {
  destructive: "border-destructive/30",
  warning:     "border-warning/30",
  primary:     "border-primary/30",
};
const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  zap:         Zap,
  shield:      ShieldCheck,
  thermometer: Thermometer,
};

type DetailTab = "basic" | "circuit" | "firmware" | "comm" | "drawings" | "changelog" | "linked-projects";

const DETAIL_TABS: { id: DetailTab; label: string }[] = [
  { id: "basic",           label: "基础信息" },
  { id: "circuit",         label: "电路规格" },
  { id: "firmware",        label: "固件版本" },
  { id: "comm",            label: "通讯协议" },
  { id: "drawings",        label: "图纸资料" },
  { id: "changelog",       label: "变更记录" },
  { id: "linked-projects", label: "关联项目" },
];

const getBmsParams = (board: ProtectionBoard) => [
  { label: "主控芯片", value: board.chipset },
  { label: "串联节数", value: `${board.series}S` },
  { label: "均衡方式", value: board.balanceType },
  { label: "均衡开启电压差", value: "≥ 20 mV" },
  { label: "均衡电流", value: "100 mA @ 3.2V" },
  { label: "SOC 估算算法", value: "库伦积分法 + EKF 修正" },
  { label: "SOC 估算精度", value: "≤ ± 5%" },
  { label: "SOH 估算精度", value: "≤ ± 8%" },
  { label: "通信接口", value: board.comProtocols.join(" / ") },
  { label: "采样精度（电压）", value: "± 5 mV" },
  { label: "采样精度（温度）", value: "± 1 °C" },
  { label: "采样精度（电流）", value: "± 0.5 A" },
  { label: "静态功耗", value: "≤ 30 mW" },
  { label: "工作温度范围", value: "-40 ~ 85 °C" },
];

// ─── OTA Panel (保护板详情内嵌，按该保护板过滤) ──────────────────────────────
interface BoardOtaPanelProps {
  boardId: string;
  boardName: string;
  onNavigateToDevice: (deviceId: string) => void;
  onNavigateToProject: (projectId: string) => void;
}

const BoardOtaPanel = ({ boardId, boardName, onNavigateToDevice, onNavigateToProject }: BoardOtaPanelProps) => {
  const [deviceFilter, setDeviceFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");

  // 只显示该保护板的OTA记录
  const boardOtaRecords = OTA_RECORDS_GLOBAL.filter(r => r.bmsId === boardId);
  const allProjects = Array.from(new Set(boardOtaRecords.map(r => r.projectName)));

  const filtered = boardOtaRecords.filter(r => {
    const matchDevice = !deviceFilter || r.deviceId.toLowerCase().includes(deviceFilter.toLowerCase()) || r.deviceSn.toLowerCase().includes(deviceFilter.toLowerCase());
    const matchProject = projectFilter === "all" || r.projectName === projectFilter;
    const matchResult = resultFilter === "all" || r.result === resultFilter;
    return matchDevice && matchProject && matchResult;
  });

  const successCount = filtered.filter(r => r.result === "success").length;
  const failedCount = filtered.filter(r => r.result === "failed").length;

  console.log(`[ProtectionBoard] OTA记录面板加载: ${boardName}, 共 ${boardOtaRecords.length} 条`);

  return (
    <div className="space-y-4">
      {/* 说明 */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <AlertCircle size={12} className="text-warning flex-shrink-0" />
        以下为本保护板（{boardName}）的 OTA 升级历史记录，仅供查阅，不允许修改或删除
      </div>

      {/* 统计 */}
      <div className="flex gap-3">
        <div className="flex-1 bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-foreground">{filtered.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">匹配记录</p>
        </div>
        <div className="flex-1 bg-success/5 border border-success/20 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-success">{successCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">升级成功</p>
        </div>
        <div className="flex-1 bg-destructive/5 border border-destructive/20 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-destructive">{failedCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">升级失败</p>
        </div>
        <div className="flex-1 bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-foreground">
            {filtered.length > 0 ? Math.round((successCount / filtered.length) * 100) : 0}%
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">成功率</p>
        </div>
      </div>

      {/* 筛选 */}
      <div className="bg-muted/20 border border-border rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
        <Filter size={12} className="text-muted-foreground flex-shrink-0" />
        <div className="relative">
          <input
            placeholder="搜索设备ID / SN..."
            value={deviceFilter}
            onChange={e => setDeviceFilter(e.target.value)}
            className="bms-input pl-7 w-44 text-xs"
          />
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          {deviceFilter && (
            <button onClick={() => setDeviceFilter("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={10} />
            </button>
          )}
        </div>
        <select
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
          className="bms-input text-xs w-44"
        >
          <option value="all">全部项目</option>
          {allProjects.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          {(["all", "success", "failed"] as const).map(s => (
            <button
              key={s}
              onClick={() => setResultFilter(s)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${resultFilter === s ? "bg-card text-foreground shadow-custom" : "text-muted-foreground hover:text-foreground"}`}
            >
              {s === "all" ? "全部" : s === "success" ? "✓ 成功" : "✗ 失败"}
            </button>
          ))}
        </div>
        {(deviceFilter || projectFilter !== "all" || resultFilter !== "all") && (
          <button onClick={() => { setDeviceFilter(""); setProjectFilter("all"); setResultFilter("all"); }} className="text-xs text-destructive hover:opacity-80 flex items-center gap-0.5">
            <X size={10} /> 清除
          </button>
        )}
      </div>

      {/* 表格 */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
          <RefreshCw size={14} className="text-primary" />
          <h4 className="text-sm font-semibold text-foreground">升级记录</h4>
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} 条</span>
        </div>
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-left">设备ID</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-left">所属项目</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-left">固件版本（升级前→后）</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-left">升级时间</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-left">升级结果</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-left">操作人</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-left">跳转</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-xs font-mono font-medium text-foreground">{r.deviceId}</p>
                        <p className="text-xs text-muted-foreground font-mono">{r.deviceSn}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground">{r.projectName}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-muted-foreground line-through">{r.fromVersion}</span>
                        <ArrowRight size={10} className="text-primary flex-shrink-0" />
                        <span className="text-xs font-mono font-bold text-primary">{r.toVersion}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock size={10} />
                        <span className="text-xs">{r.upgradeTime}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {r.result === "success" ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border bg-success/10 text-success border-success/30 font-medium">
                          <Check size={10} /> 成功
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border bg-destructive/10 text-destructive border-destructive/30 font-medium">
                          <X size={10} /> 失败
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground">{r.operator}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onNavigateToDevice(r.deviceId)}
                          className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                          title={`跳转至设备 ${r.deviceId}`}
                        >
                          <ExternalLink size={11} /> 设备
                        </button>
                        <button
                          onClick={() => onNavigateToProject(r.projectId)}
                          className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                          title={`跳转至项目 ${r.projectName}`}
                        >
                          <ExternalLink size={11} /> 项目
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            <RefreshCw size={28} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm">
              {boardOtaRecords.length === 0 ? `${boardName} 暂无OTA升级记录` : "未找到匹配的升级记录"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Board Form Modal ─────────────────────────────────────────────────────────
interface BoardFormModalProps {
  board: Partial<ProtectionBoard> | null;
  onClose: () => void;
  onSave: (board: Partial<ProtectionBoard>) => void;
}

const BoardFormModal = ({ board, onClose, onSave }: BoardFormModalProps) => {
  const isEdit = !!(board && board.id);
  const [activeTab, setActiveTab] = useState<"basic" | "circuit" | "comm" | "drawings">("basic");

  const [form, setForm] = useState({
    name:        board?.name        || "",
    model:       board?.model       || "",
    chipset:     board?.chipset     || "",
    series:      String(board?.series  || ""),
    balanceType: board?.balanceType || "",
    status:      (board?.status || "development") as ProtectionBoard["status"],
  });

  const [circuitSpecs, setCircuitSpecs] = useState<CircuitSpec[]>(board?.circuitSpecs ? JSON.parse(JSON.stringify(board.circuitSpecs)) : []);
  const [commDetails, setCommDetails] = useState<CommDetail[]>(board?.commDetails ? JSON.parse(JSON.stringify(board.commDetails)) : []);
  const [drawings, setDrawings] = useState<DrawingDoc[]>(board?.drawings ? JSON.parse(JSON.stringify(board.drawings || [])) : []);

  const handleSave = () => {
    if (!form.name || !form.model) return;
    onSave({
      ...board,
      name:        form.name,
      model:       form.model,
      chipset:     form.chipset,
      series:      Number(form.series),
      balanceType: form.balanceType,
      status:      form.status,
      circuitSpecs,
      commDetails,
      drawings,
    });
    console.log(`[ProtectionBoard] ${isEdit ? "编辑" : "新增"}保护板: ${form.name}`);
  };

  const formTabs = [
    { id: "basic" as const, label: "基础信息" },
    { id: "circuit" as const, label: "电路规格" },
    { id: "comm" as const, label: "通讯协议" },
    { id: "drawings" as const, label: "图纸资料" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="bg-card w-full max-w-2xl rounded-2xl shadow-custom border border-border overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShieldCheck size={15} className="text-primary" />
            </div>
            <h3 className="font-bold text-foreground">{isEdit ? "编辑保护板" : "新增保护板"}</h3>
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

        <div className="flex-1 overflow-y-auto p-6">
          {/* 基础信息 */}
          {activeTab === "basic" && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">保护板名称 <span className="text-destructive">*</span></label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如 BMS-V5 保护板" className="bms-input w-full text-sm" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">适配型号 <span className="text-destructive">*</span></label>
                  <select value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="bms-input w-full text-sm">
                    <option value="">-- 选择型号 --</option>
                    <option value="LFP-100Ah-48V">LFP-100Ah-48V</option>
                    <option value="NMC-200Ah-96V">NMC-200Ah-96V</option>
                    <option value="NCM-150Ah-72V">NCM-150Ah-72V</option>
                    <option value="LFP-50Ah-24V">LFP-50Ah-24V</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">主控芯片</label>
                  <input value={form.chipset} onChange={(e) => setForm({ ...form, chipset: e.target.value })} placeholder="如 TI BQ76952" className="bms-input w-full text-sm" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">串联节数</label>
                  <input type="number" value={form.series} onChange={(e) => setForm({ ...form, series: e.target.value })} placeholder="如 15" className="bms-input w-full text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">均衡方式</label>
                <select value={form.balanceType} onChange={(e) => setForm({ ...form, balanceType: e.target.value })} className="bms-input w-full text-sm">
                  <option value="">-- 选择均衡方式 --</option>
                  <option value="被动均衡（电阻耗散型）">被动均衡（电阻耗散型）</option>
                  <option value="主动均衡（电感型）">主动均衡（电感型）</option>
                  <option value="主动均衡（电容型）">主动均衡（电容型）</option>
                </select>
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

          {/* 电路规格 */}
          {activeTab === "circuit" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">可在此处编辑各电路规格保护参数分组</p>
              {circuitSpecs.map((group, gi) => (
                <div key={gi} className="border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/30 border-b border-border">
                    <input
                      value={group.category}
                      onChange={(e) => {
                        const next = [...circuitSpecs];
                        next[gi] = { ...next[gi], category: e.target.value };
                        setCircuitSpecs(next);
                      }}
                      className="bms-input text-xs py-1 px-2 flex-1"
                      placeholder="分组名称"
                    />
                    <button onClick={() => setCircuitSpecs(circuitSpecs.filter((_, i) => i !== gi))} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="divide-y divide-border">
                    {group.items.map((item, ii) => (
                      <div key={ii} className="flex items-center gap-2 px-4 py-2">
                        <input
                          value={item.label}
                          onChange={(e) => {
                            const next = [...circuitSpecs];
                            next[gi].items[ii] = { ...next[gi].items[ii], label: e.target.value };
                            setCircuitSpecs(next);
                          }}
                          className="bms-input text-xs py-1 px-2 flex-1"
                          placeholder="参数名称"
                        />
                        <input
                          value={item.value}
                          onChange={(e) => {
                            const next = [...circuitSpecs];
                            next[gi].items[ii] = { ...next[gi].items[ii], value: e.target.value };
                            setCircuitSpecs(next);
                          }}
                          className="bms-input text-xs py-1 px-2 w-28"
                          placeholder="参数值"
                        />
                        <input
                          value={item.tolerance || ""}
                          onChange={(e) => {
                            const next = [...circuitSpecs];
                            next[gi].items[ii] = { ...next[gi].items[ii], tolerance: e.target.value };
                            setCircuitSpecs(next);
                          }}
                          className="bms-input text-xs py-1 px-2 w-24"
                          placeholder="容差"
                        />
                        <button onClick={() => {
                          const next = [...circuitSpecs];
                          next[gi].items = next[gi].items.filter((_, i) => i !== ii);
                          setCircuitSpecs(next);
                        }} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-border">
                    <button
                      onClick={() => {
                        const next = [...circuitSpecs];
                        next[gi].items = [...next[gi].items, { label: "", value: "", tolerance: "" }];
                        setCircuitSpecs(next);
                      }}
                      className="flex items-center gap-1 text-xs text-primary hover:opacity-80 transition-opacity"
                    >
                      <Plus size={11} /> 添加参数
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setCircuitSpecs([...circuitSpecs, { category: "新分类", icon: "shield", color: "primary", items: [] }])}
                className="w-full py-2 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus size={12} /> 添加规格分组
              </button>
            </div>
          )}

          {/* 通讯协议 */}
          {activeTab === "comm" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">可在此处编辑通讯协议配置</p>
              {commDetails.map((comm, i) => (
                <div key={i} className="border border-border rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-foreground">协议 {i + 1}</span>
                    <button onClick={() => setCommDetails(commDetails.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs text-muted-foreground">协议名称</label>
                      <input value={comm.protocol} onChange={(e) => {
                        const next = [...commDetails];
                        next[i] = { ...next[i], protocol: e.target.value };
                        setCommDetails(next);
                      }} className="bms-input text-xs py-1 px-2 w-full" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-xs text-muted-foreground">波特率/速率</label>
                      <input value={comm.baudRate} onChange={(e) => {
                        const next = [...commDetails];
                        next[i] = { ...next[i], baudRate: e.target.value };
                        setCommDetails(next);
                      }} className="bms-input text-xs py-1 px-2 w-full" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">帧格式</label>
                    <input value={comm.frameFormat} onChange={(e) => {
                      const next = [...commDetails];
                      next[i] = { ...next[i], frameFormat: e.target.value };
                      setCommDetails(next);
                    }} className="bms-input text-xs py-1 px-2 w-full" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">协议说明</label>
                    <textarea value={comm.desc} onChange={(e) => {
                      const next = [...commDetails];
                      next[i] = { ...next[i], desc: e.target.value };
                      setCommDetails(next);
                    }} rows={2} className="bms-input text-xs py-1 px-2 w-full resize-none" />
                  </div>
                </div>
              ))}
              <button
                onClick={() => setCommDetails([...commDetails, { protocol: "", baudRate: "", frameFormat: "", desc: "" }])}
                className="w-full py-2 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus size={12} /> 添加通讯协议
              </button>
            </div>
          )}

          {/* 图纸资料 */}
          {activeTab === "drawings" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">可在此处编辑图纸与技术文件列表</p>
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
                    <div className="w-20 space-y-1">
                      <label className="text-xs text-muted-foreground">类型</label>
                      <input value={doc.type} onChange={(e) => {
                        const next = [...drawings];
                        next[i] = { ...next[i], type: e.target.value };
                        setDrawings(next);
                      }} className="bms-input text-xs py-1 px-2 w-full" />
                    </div>
                    <div className="w-18 space-y-1">
                      <label className="text-xs text-muted-foreground">版本</label>
                      <input value={doc.version} onChange={(e) => {
                        const next = [...drawings];
                        next[i] = { ...next[i], version: e.target.value };
                        setDrawings(next);
                      }} className="bms-input text-xs py-1 px-2 w-full" />
                    </div>
                    <div className="w-20 space-y-1">
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
              <button
                onClick={() => setDrawings([...drawings, { name: "", type: "图纸", version: "V1.0", format: "PDF", date: new Date().toISOString().split("T")[0] }])}
                className="flex items-center gap-1.5 text-xs text-primary hover:opacity-80 transition-opacity"
              >
                <Plus size={12} /> 添加文件
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-muted/10 flex-shrink-0">
          <button onClick={onClose} className="bms-btn-secondary py-2 px-4 text-xs">取消</button>
          <button
            onClick={handleSave}
            disabled={!form.name || !form.model}
            className="bms-btn-primary py-2 px-4 flex items-center gap-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={13} /> {isEdit ? "保存更改" : "创建保护板"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Detail Panel ─────────────────────────────────────────────────────────────
interface BoardDetailPanelProps {
  board: ProtectionBoard;
  onClose: () => void;
  onEdit: (board: ProtectionBoard) => void;
  onNavigateToProject: (projectId: string) => void;
  onNavigateToDevice: (deviceId: string) => void;
}

const BoardDetailPanel = ({ board, onClose, onEdit, onNavigateToProject, onNavigateToDevice }: BoardDetailPanelProps) => {
  const [activeTab, setActiveTab] = useState<DetailTab>("basic");
  const [firmwareSubTab, setFirmwareSubTab] = useState<"versions" | "ota">("versions");
  const changeRecords = CHANGE_RECORDS[board.id] || [];
  const linkedProjects = LINKED_PROJECTS[board.id] || [];
  const boardOtaCount = OTA_RECORDS_GLOBAL.filter(r => r.bmsId === board.id).length;

  const renderContent = () => {
    switch (activeTab) {
      case "basic":
        return (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl border border-border">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={28} className="text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground">{board.name}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">适配型号：{board.model}</p>
                <span className={`inline-flex items-center mt-1.5 text-xs px-2 py-0.5 rounded border font-medium ${STATUS_CFG[board.status].cls}`}>
                  {STATUS_CFG[board.status].label}
                </span>
              </div>
              <button onClick={() => onEdit(board)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors">
                <Edit2 size={12} /> 编辑
              </button>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 bg-card rounded-xl border border-border p-4 text-center">
                <p className="text-xl font-bold text-primary">{board.series}<span className="text-sm font-normal text-muted-foreground ml-0.5">S</span></p>
                <p className="text-xs text-muted-foreground mt-1">串联节数</p>
              </div>
              <div className="flex-1 bg-card rounded-xl border border-border p-4 text-center">
                <p className="text-lg font-bold text-foreground font-mono">{board.chipset.split(" ")[1] || board.chipset}</p>
                <p className="text-xs text-muted-foreground mt-1">主控芯片</p>
              </div>
              <div className="flex-1 bg-card rounded-xl border border-border p-4 text-center">
                <p className="text-xl font-bold text-foreground">{board.comProtocols.length}</p>
                <p className="text-xs text-muted-foreground mt-1">通信协议</p>
              </div>
              <div className="flex-1 bg-card rounded-xl border border-border p-4 text-center">
                <p className="text-xl font-bold text-foreground">{linkedProjects.length}</p>
                <p className="text-xs text-muted-foreground mt-1">关联项目</p>
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">BMS 保护板综合规格</p>
                <span className="flex items-center gap-1 text-xs text-success font-medium">
                  <CheckCircle size={11} /> 通过认证
                </span>
              </div>
              <div className="flex flex-wrap">
                {getBmsParams(board).map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between px-5 py-2.5 hover:bg-muted/20 border-b border-border" style={{ flexBasis: "50%", minWidth: 260 }}>
                    <span className="text-xs text-muted-foreground">{p.label}</span>
                    <span className="text-xs font-medium text-foreground font-mono">{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "circuit":
        return (
          <div className="p-6 space-y-4">
            <div className="flex flex-wrap gap-4">
              {board.circuitSpecs.map((group) => {
                const IconComp = ICON_MAP[group.icon] || ShieldCheck;
                return (
                  <div key={group.category} className={`flex-1 min-w-56 bg-card rounded-xl border shadow-custom overflow-hidden ${BORDER_MAP[group.color] || "border-border"}`}>
                    <div className={`flex items-center gap-2 px-5 py-3 border-b ${BORDER_MAP[group.color] || "border-border"}`}>
                      <span className={`w-6 h-6 rounded flex items-center justify-center ${COLOR_MAP[group.color] || ""}`}>
                        <IconComp size={13} />
                      </span>
                      <h4 className="text-sm font-semibold text-foreground">{group.category}</h4>
                      <AlertTriangle size={12} className={`ml-auto ${group.color === "destructive" ? "text-destructive" : group.color === "warning" ? "text-warning" : "text-primary"}`} />
                    </div>
                    <div className="divide-y divide-border">
                      {group.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between px-5 py-2.5 hover:bg-muted/20">
                          <span className="text-xs text-muted-foreground">{item.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-mono text-foreground">{item.value}</span>
                            {item.tolerance && item.tolerance !== "-" && (
                              <span className="text-xs text-muted-foreground font-mono">{item.tolerance}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case "firmware":
        return (
          <div className="p-6 space-y-4">
            {/* 固件版本子Tab */}
            <div className="flex border-b border-border">
              {[
                { key: "versions" as const, label: "固件版本列表" },
                { key: "ota" as const, label: "OTA升级记录" },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setFirmwareSubTab(t.key)}
                  className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${firmwareSubTab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  {t.key === "versions" ? <GitBranch size={12} /> : <RefreshCw size={12} />}
                  {t.label}
                  {t.key === "ota" && boardOtaCount > 0 && (
                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{boardOtaCount}</span>
                  )}
                </button>
              ))}
            </div>

            {/* 固件版本列表 */}
            {firmwareSubTab === "versions" && (
              <>
                <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
                  <ChevronRight size={12} className="text-primary" />
                  以下固件版本为本保护板型号的专属版本记录，完整固件管理请前往固件列表模块。
                </div>
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
                    <GitBranch size={14} className="text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">固件版本列表</h4>
                    <span className="ml-auto text-xs text-muted-foreground">{board.firmwareVersions.length} 个版本</span>
                  </div>
                  <div className="divide-y divide-border">
                    {board.firmwareVersions.map((fw, i) => {
                      const fwCfg = FW_STATUS_CFG[fw.status];
                      return (
                        <div key={i} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${fwCfg.dot}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-sm font-bold text-foreground">{fw.version}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${fwCfg.cls}`}>{fwCfg.label}</span>
                              <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono">{fw.hardware}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{fw.desc}</p>
                          </div>
                          <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                            <Clock size={10} /> {fw.released}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* OTA升级记录（含完整字段、筛选、跳转） */}
            {firmwareSubTab === "ota" && (
              <BoardOtaPanel
                boardId={board.id}
                boardName={board.name}
                onNavigateToDevice={onNavigateToDevice}
                onNavigateToProject={(projectId) => { onNavigateToProject(projectId); onClose(); }}
              />
            )}
          </div>
        );

      case "comm":
        return (
          <div className="p-6 space-y-4">
            {board.commDetails.map((comm, i) => (
              <div key={i} className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/20">
                  <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                    <MessageSquare size={13} className="text-primary" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">{comm.protocol}</h4>
                </div>
                <div className="divide-y divide-border">
                  {[
                    { label: "协议名称", value: comm.protocol },
                    { label: "波特率/速率", value: comm.baudRate },
                    { label: "帧格式", value: comm.frameFormat },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between px-5 py-2.5 hover:bg-muted/20">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <span className="text-xs font-medium text-foreground font-mono">{item.value}</span>
                    </div>
                  ))}
                  <div className="px-5 py-3">
                    <p className="text-xs text-muted-foreground mb-1">协议说明</p>
                    <p className="text-xs text-foreground leading-relaxed bg-muted/30 p-3 rounded-lg">{comm.desc}</p>
                  </div>
                </div>
              </div>
            ))}
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
              {(board.drawings || []).map((doc, i) => (
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
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Tag size={9} /> {doc.date}</span>
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
              以下为使用本保护板的关联项目，点击项目名称可跳转查看详情
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
                              {proj.name}<ExternalLink size={11} />
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
                <p className="text-sm">该保护板暂未关联任何项目</p>
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
              <ShieldCheck size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">{board.name}</h2>
              <p className="text-xs text-muted-foreground">适配：{board.model}</p>
            </div>
            <span className={`ml-1 text-xs px-2 py-0.5 rounded border font-medium ${STATUS_CFG[board.status].cls}`}>
              {STATUS_CFG[board.status].label}
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
              {tab.id === "firmware" && (
                <span className="ml-1.5 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{board.firmwareVersions.length}</span>
              )}
              {tab.id === "changelog" && (CHANGE_RECORDS[board.id] || []).length > 0 && (
                <span className="ml-1.5 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{(CHANGE_RECORDS[board.id] || []).length}</span>
              )}
              {tab.id === "linked-projects" && (LINKED_PROJECTS[board.id] || []).length > 0 && (
                <span className="ml-1.5 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{(LINKED_PROJECTS[board.id] || []).length}</span>
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
interface ProtectionBoardPageProps {
  onNavigateToProject?: (projectId: string) => void;
  onNavigateToDevice?: (deviceId: string) => void;
}

const ProtectionBoardPage = ({
  onNavigateToProject = () => {},
  onNavigateToDevice = () => {},
}: ProtectionBoardPageProps) => {
  const [boards, setBoards] = useState<ProtectionBoard[]>(PROTECTION_BOARDS_INIT);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "deprecated" | "development">("all");
  const [selectedBoard, setSelectedBoard] = useState<ProtectionBoard | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingBoard, setEditingBoard] = useState<ProtectionBoard | null>(null);

  const filtered = boards.filter((b) => {
    const matchSearch = !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.model.toLowerCase().includes(search.toLowerCase()) || b.chipset.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeCount = boards.filter(b => b.status === "active").length;
  const totalFw = boards.reduce((s, b) => s + b.firmwareVersions.length, 0);
  const stableFw = boards.reduce((s, b) => s + b.firmwareVersions.filter(f => f.status === "stable").length, 0);

  const handleOpenNew = () => { setEditingBoard(null); setShowFormModal(true); };
  const handleOpenEdit = (board: ProtectionBoard) => { setEditingBoard(board); setSelectedBoard(null); setShowFormModal(true); };

  const handleSaveBoard = (data: Partial<ProtectionBoard>) => {
    if (data.id) {
      setBoards(prev => prev.map(b => b.id === data.id ? { ...b, ...data } as ProtectionBoard : b));
      console.log("[ProtectionBoard] 编辑保护板:", data.name);
    } else {
      const newBoard: ProtectionBoard = {
        id: `PB-${String(boards.length + 1).padStart(3, "0")}`,
        name: data.name || "",
        model: data.model || "",
        chipset: data.chipset || "",
        series: data.series || 0,
        balanceType: data.balanceType || "",
        comProtocols: [],
        status: data.status || "development",
        createdAt: new Date().toISOString().split("T")[0],
        circuitSpecs: data.circuitSpecs || [],
        firmwareVersions: [],
        commDetails: data.commDetails || [],
        drawings: data.drawings || [],
      };
      setBoards(prev => [...prev, newBoard]);
      console.log("[ProtectionBoard] 新增保护板:", newBoard.name);
    }
    setShowFormModal(false);
    setEditingBoard(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      <div className="flex gap-3">
        <div className="flex-1"><StatCard title="保护板型号" value={String(boards.length)} unit="款" iconName="cpu" colorType="blue" /></div>
        <div className="flex-1"><StatCard title="使用中" value={String(activeCount)} unit="款" iconName="activity" colorType="green" /></div>
        <div className="flex-1"><StatCard title="固件版本总数" value={String(totalFw)} unit="个" iconName="battery" colorType="teal" /></div>
        <div className="flex-1"><StatCard title="稳定版固件" value={String(stableFw)} unit="个" iconName="check" colorType="blue" /></div>
      </div>

      <div className="bms-card p-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索保护板型号..." className="bms-input pl-8 w-52 text-sm" />
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={12} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
              {(["all", "active", "deprecated"] as const).map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${statusFilter === s ? "bg-card text-foreground shadow-custom" : "text-muted-foreground hover:text-foreground"}`}>
                  {s === "all" ? "全部" : STATUS_CFG[s].label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleOpenNew} className="bms-btn-primary flex items-center gap-1.5 text-xs">
            <Plus size={13} /> 新增保护板
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bms-table-header text-left">
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">保护板名称</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">适配型号</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">主控芯片</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">串联节数</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">通信协议</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">固件版本数</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">OTA记录</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">状态</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map((b, i) => {
                const otaCount = OTA_RECORDS_GLOBAL.filter(r => r.bmsId === b.id).length;
                const otaFailed = OTA_RECORDS_GLOBAL.filter(r => r.bmsId === b.id && r.result === "failed").length;
                return (
                  <tr key={b.id} className={`table-row-hover border-b border-border text-sm ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <ShieldCheck size={14} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{b.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{b.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-foreground">{b.model}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs bg-muted px-2 py-0.5 rounded font-mono text-foreground">{b.chipset}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-sm font-semibold text-foreground">{b.series}<span className="text-xs font-normal text-muted-foreground">S</span></span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {b.comProtocols.slice(0, 2).map((p, pi) => (
                          <span key={pi} className="text-xs bg-secondary text-primary px-1.5 py-0.5 rounded font-medium">{p.split(" ")[0]}</span>
                        ))}
                        {b.comProtocols.length > 2 && (
                          <span className="text-xs text-muted-foreground">+{b.comProtocols.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <Activity size={12} className="text-primary" />
                        <span className="text-sm font-semibold text-foreground">{b.firmwareVersions.length}</span>
                        <span className="text-xs text-muted-foreground">个</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {otaCount > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <RefreshCw size={11} className="text-primary flex-shrink-0" />
                          <span className="text-sm font-semibold text-foreground">{otaCount}</span>
                          <span className="text-xs text-muted-foreground">条</span>
                          {otaFailed > 0 && (
                            <span className="text-xs text-destructive bg-destructive/10 px-1.5 py-0.5 rounded border border-destructive/20">
                              {otaFailed} 失败
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${STATUS_CFG[b.status].cls}`}>{STATUS_CFG[b.status].label}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSelectedBoard(b)} className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-primary" title="查看详情">
                          <Eye size={13} />
                        </button>
                        <button onClick={() => handleOpenEdit(b)} className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-primary" title="编辑">
                          <Edit2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-muted-foreground text-sm">
                    <ShieldCheck size={32} className="mx-auto mb-3 opacity-20" />
                    未找到匹配的保护板
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/10">
          <span className="text-xs text-muted-foreground">共 {filtered.length} 条记录</span>
        </div>
      </div>

      {selectedBoard && (
        <BoardDetailPanel
          board={selectedBoard}
          onClose={() => setSelectedBoard(null)}
          onEdit={handleOpenEdit}
          onNavigateToProject={onNavigateToProject}
          onNavigateToDevice={onNavigateToDevice}
        />
      )}

      {showFormModal && (
        <BoardFormModal
          board={editingBoard}
          onClose={() => { setShowFormModal(false); setEditingBoard(null); }}
          onSave={handleSaveBoard}
        />
      )}
    </div>
  );
};

export default ProtectionBoardPage;
