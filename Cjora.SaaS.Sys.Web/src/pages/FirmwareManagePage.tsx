import { useState } from "react";
import {
  Upload, Edit2, Trash2, Download, Search, Package,
  CheckCircle, GitCompare, History, X, ChevronRight,
  Info, ArrowRight, Clock, Check, Diff, RefreshCw,
  ShieldCheck, ExternalLink, Filter, AlertCircle
} from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import StatCard from "../components/StatCard";
import Pagination from "../components/Pagination";

// ============================================================
// Types & Mock Data
// ============================================================

// 保护板型号列表（固件必须绑定保护板，而不是电池型号）
const BMS_MODELS = [
  { id: "PB-001", name: "BMS-V3 保护板", model: "LFP-100Ah-48V" },
  { id: "PB-002", name: "BMS-V4 保护板", model: "NMC-200Ah-96V" },
  { id: "PB-003", name: "BMS-V5 保护板", model: "NCM-150Ah-72V" },
  { id: "PB-004", name: "BMS-V2 保护板", model: "LFP-50Ah-24V" },
];

interface FirmwareRecord {
  id: string;
  version: string;
  bmsId: string;        // 绑定保护板 ID
  bmsName: string;      // 保护板名称
  hardware: string;
  size: string;
  status: "stable" | "beta" | "deprecated";
  released: string;
  desc: string;
  devices: number;
  changelog: ChangelogEntry[];
}

interface ChangelogEntry {
  type: "fix" | "feat" | "perf" | "breaking";
  content: string;
}

// OTA升级记录（完整字段）
interface OtaRecord {
  id: string;
  deviceId: string;       // 设备ID
  deviceSn: string;       // 设备SN
  projectId: string;      // 所属项目ID
  projectName: string;    // 所属项目名称
  bmsId: string;          // 保护板型号ID
  bmsName: string;        // 保护板名称
  fromVersion: string;    // 升级前版本
  toVersion: string;      // 升级后版本
  upgradeTime: string;    // 升级时间
  result: "success" | "failed"; // 升级结果
  operator: string;       // 操作人
}

const FIRMWARES: FirmwareRecord[] = [
  {
    id: "FW-001", version: "v2.1.3", bmsId: "PB-001", bmsName: "BMS-V3 保护板", hardware: "HW-3.x",
    size: "1.2 MB", status: "stable", released: "2024-05-20",
    desc: "优化充电控制算法，修复过温告警偶发误报",
    devices: 345,
    changelog: [
      { type: "perf", content: "充电控制算法响应时间降低 40%" },
      { type: "fix", content: "修复过温告警偶发误报问题（BUG-091）" },
      { type: "fix", content: "修复 SOC 跳变概率性问题" },
    ]
  },
  {
    id: "FW-002", version: "v2.1.2", bmsId: "PB-001", bmsName: "BMS-V3 保护板", hardware: "HW-3.x",
    size: "1.2 MB", status: "deprecated", released: "2024-04-10",
    desc: "新增MQTT心跳机制，修复通信超时bug",
    devices: 12,
    changelog: [
      { type: "feat", content: "新增 MQTT 心跳保活机制" },
      { type: "fix", content: "修复长时间通信超时导致断线的问题" },
    ]
  },
  {
    id: "FW-003", version: "v3.0.0", bmsId: "PB-002", bmsName: "BMS-V4 保护板", hardware: "HW-4.x",
    size: "1.8 MB", status: "stable", released: "2024-06-01",
    desc: "全新架构，支持双向充放电控制",
    devices: 220,
    changelog: [
      { type: "breaking", content: "通信协议升级至 v3.x，不向下兼容 HW-3.x" },
      { type: "feat", content: "支持双向充放电独立控制" },
      { type: "feat", content: "新增电池组均衡主动管理功能" },
      { type: "perf", content: "整体功耗降低 12%" },
    ]
  },
  {
    id: "FW-004", version: "v2.2.0-beta", bmsId: "PB-003", bmsName: "BMS-V5 保护板", hardware: "HW-3.x",
    size: "1.5 MB", status: "beta", released: "2024-06-05",
    desc: "Beta版本：新增SOH计算模型V2",
    devices: 15,
    changelog: [
      { type: "feat", content: "引入 SOH 计算模型 V2（基于电化学阻抗谱）" },
      { type: "feat", content: "新增实时容量衰减可视化接口" },
    ]
  },
  {
    id: "FW-005", version: "v1.5.0", bmsId: "PB-004", bmsName: "BMS-V2 保护板", hardware: "HW-2.x",
    size: "0.8 MB", status: "deprecated", released: "2023-12-01",
    desc: "旧版本，请升级",
    devices: 5,
    changelog: [
      { type: "fix", content: "修复低温环境充电保护误触发" },
    ]
  },
  {
    id: "FW-006", version: "v3.0.1", bmsId: "PB-002", bmsName: "BMS-V4 保护板", hardware: "HW-4.x",
    size: "1.8 MB", status: "beta", released: "2024-06-09",
    desc: "修复v3.0.0充电截止电压计算问题",
    devices: 8,
    changelog: [
      { type: "fix", content: "修复 v3.0.0 充电截止电压计算精度问题" },
      { type: "fix", content: "修复并发升级时部分设备超时失败" },
    ]
  },
];

// 完整OTA升级记录（历史日志，不允许修改删除）
export const OTA_RECORDS_GLOBAL: OtaRecord[] = [
  {
    id: "OTA-001", deviceId: "DEV-000001", deviceSn: "BMS-000001",
    projectId: "PRJ-001", projectName: "南京储能站 A 期",
    bmsId: "PB-001", bmsName: "BMS-V3 保护板",
    fromVersion: "v2.1.2", toVersion: "v2.1.3",
    upgradeTime: "2024-06-10 10:04:32", result: "success", operator: "Admin"
  },
  {
    id: "OTA-002", deviceId: "DEV-000002", deviceSn: "BMS-000002",
    projectId: "PRJ-001", projectName: "南京储能站 A 期",
    bmsId: "PB-001", bmsName: "BMS-V3 保护板",
    fromVersion: "v2.1.2", toVersion: "v2.1.3",
    upgradeTime: "2024-06-10 10:05:18", result: "success", operator: "Admin"
  },
  {
    id: "OTA-003", deviceId: "DEV-000003", deviceSn: "BMS-000003",
    projectId: "PRJ-002", projectName: "深圳数据中心 UPS 项目",
    bmsId: "PB-002", bmsName: "BMS-V4 保护板",
    fromVersion: "v3.0.0", toVersion: "v3.0.1",
    upgradeTime: "2024-06-10 09:34:55", result: "failed", operator: "张伟"
  },
  {
    id: "OTA-004", deviceId: "DEV-000006", deviceSn: "BMS-000006",
    projectId: "PRJ-001", projectName: "南京储能站 A 期",
    bmsId: "PB-001", bmsName: "BMS-V3 保护板",
    fromVersion: "v2.1.1", toVersion: "v2.1.3",
    upgradeTime: "2024-06-09 14:35:22", result: "success", operator: "李明"
  },
  {
    id: "OTA-005", deviceId: "DEV-000008", deviceSn: "BMS-000008",
    projectId: "PRJ-005", projectName: "上海港口备用电源系统",
    bmsId: "PB-001", bmsName: "BMS-V3 保护板",
    fromVersion: "v2.1.0", toVersion: "v2.1.2",
    upgradeTime: "2024-06-08 11:04:50", result: "success", operator: "Admin"
  },
  {
    id: "OTA-006", deviceId: "DEV-000010", deviceSn: "BMS-000010",
    projectId: "PRJ-002", projectName: "深圳数据中心 UPS 项目",
    bmsId: "PB-002", bmsName: "BMS-V4 保护板",
    fromVersion: "v2.9.0", toVersion: "v3.0.0",
    upgradeTime: "2024-06-08 09:06:11", result: "success", operator: "张伟"
  },
  {
    id: "OTA-007", deviceId: "DEV-000012", deviceSn: "BMS-000012",
    projectId: "PRJ-004", projectName: "广州商业综合体储能",
    bmsId: "PB-002", bmsName: "BMS-V4 保护板",
    fromVersion: "v2.9.0", toVersion: "v3.0.0",
    upgradeTime: "2024-06-07 15:30:00", result: "success", operator: "Admin"
  },
  {
    id: "OTA-008", deviceId: "DEV-000015", deviceSn: "BMS-000015",
    projectId: "PRJ-006", projectName: "苏州新能源汽车充电站",
    bmsId: "PB-002", bmsName: "BMS-V4 保护板",
    fromVersion: "v3.0.0", toVersion: "v3.0.1",
    upgradeTime: "2024-06-07 10:22:15", result: "failed", operator: "Admin"
  },
  {
    id: "OTA-009", deviceId: "DEV-000020", deviceSn: "BMS-000020",
    projectId: "PRJ-003", projectName: "北京工业园区微电网",
    bmsId: "PB-003", bmsName: "BMS-V5 保护板",
    fromVersion: "v2.1.0", toVersion: "v2.2.0-beta",
    upgradeTime: "2024-06-06 14:11:03", result: "success", operator: "李明"
  },
  {
    id: "OTA-010", deviceId: "DEV-000021", deviceSn: "BMS-000021",
    projectId: "PRJ-003", projectName: "北京工业园区微电网",
    bmsId: "PB-003", bmsName: "BMS-V5 保护板",
    fromVersion: "v2.0.0", toVersion: "v2.1.0",
    upgradeTime: "2024-06-05 09:55:42", result: "success", operator: "张伟"
  },
];

// ============================================================
// Helpers
// ============================================================
const STATUS_MAP = {
  stable:     { status: "inuse",   label: "稳定版", dot: "bg-success" },
  beta:       { status: "warning", label: "Beta",   dot: "bg-warning" },
  deprecated: { status: "offline", label: "废弃",   dot: "bg-muted-foreground" },
} as const;

const CHANGELOG_TYPE_MAP = {
  fix:      { label: "修复",    cls: "bg-destructive/10 text-destructive border-destructive/20" },
  feat:     { label: "新功能",  cls: "bg-primary/10 text-primary border-primary/20" },
  perf:     { label: "性能",    cls: "bg-success/10 text-success border-success/20" },
  breaking: { label: "破坏性",  cls: "bg-warning/10 text-warning-foreground border-warning/30" },
} as const;

// ============================================================
// Sub-components
// ============================================================

/** Version diff item */
const DiffRow = ({ label, vA, vB }: { label: string; vA: string; vB: string }) => {
  const changed = vA !== vB;
  return (
    <div className={`flex items-center gap-2 py-2 px-3 rounded-lg ${changed ? "bg-warning/5 border border-warning/20" : "bg-muted/30"}`}>
      <span className="text-xs text-muted-foreground w-24 flex-shrink-0">{label}</span>
      <span className={`text-xs font-mono font-medium flex-1 ${changed ? "line-through text-muted-foreground" : "text-foreground"}`}>{vA}</span>
      {changed && (
        <>
          <ArrowRight size={12} className="text-warning flex-shrink-0" />
          <span className="text-xs font-mono font-medium flex-1 text-primary">{vB}</span>
        </>
      )}
      {!changed && <span className="text-xs text-muted-foreground ml-auto">相同</span>}
    </div>
  );
};

// ============================================================
// OTA Records Panel (独立组件，供固件列表页使用)
// ============================================================
interface OtaRecordsPanelProps {
  onNavigateToDevice?: (deviceId: string) => void;
  onNavigateToProject?: (projectId: string) => void;
}

const OtaRecordsPanel = ({ onNavigateToDevice, onNavigateToProject }: OtaRecordsPanelProps) => {
  const [deviceFilter, setDeviceFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [bmsFilter, setBmsFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [otaPage, setOtaPage] = useState(1);
  const OTA_PAGE_SIZE = 8;

  const allProjects = Array.from(new Set(OTA_RECORDS_GLOBAL.map(r => r.projectName)));
  const allBms = Array.from(new Set(OTA_RECORDS_GLOBAL.map(r => r.bmsName)));

  const filtered = OTA_RECORDS_GLOBAL.filter(r => {
    const matchDevice = !deviceFilter || r.deviceId.toLowerCase().includes(deviceFilter.toLowerCase()) || r.deviceSn.toLowerCase().includes(deviceFilter.toLowerCase());
    const matchProject = projectFilter === "all" || r.projectName === projectFilter;
    const matchBms = bmsFilter === "all" || r.bmsName === bmsFilter;
    const matchResult = resultFilter === "all" || r.result === resultFilter;
    return matchDevice && matchProject && matchBms && matchResult;
  });

  const paged = filtered.slice((otaPage - 1) * OTA_PAGE_SIZE, otaPage * OTA_PAGE_SIZE);

  const successCount = filtered.filter(r => r.result === "success").length;
  const failedCount = filtered.filter(r => r.result === "failed").length;

  return (
    <div className="space-y-4">
      {/* 说明 */}
      <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
        <AlertCircle size={12} className="text-warning flex-shrink-0" />
        OTA升级记录为历史日志，仅供查阅，不允许修改或删除
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

      {/* 筛选栏 */}
      <div className="bms-card p-0">
        <div className="px-5 py-3 border-b border-border bg-muted/10 flex items-center gap-2">
          <Filter size={13} className="text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">筛选条件</span>
        </div>
        <div className="px-5 py-3 flex items-center gap-3 flex-wrap">
          <div className="relative">
            <input
              placeholder="搜索设备ID / SN..."
              value={deviceFilter}
              onChange={(e) => { setDeviceFilter(e.target.value); setOtaPage(1); }}
              className="bms-input pl-8 w-48 text-xs"
            />
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            {deviceFilter && (
              <button onClick={() => setDeviceFilter("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={11} />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-muted-foreground">所属项目</label>
            <select
              value={projectFilter}
              onChange={(e) => { setProjectFilter(e.target.value); setOtaPage(1); }}
              className="bms-input text-xs w-44"
            >
              <option value="all">全部项目</option>
              {allProjects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-muted-foreground">保护板型号</label>
            <select
              value={bmsFilter}
              onChange={(e) => { setBmsFilter(e.target.value); setOtaPage(1); }}
              className="bms-input text-xs w-40"
            >
              <option value="all">全部保护板</option>
              {allBms.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-muted-foreground">升级结果</label>
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
              {(["all", "success", "failed"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => { setResultFilter(s); setOtaPage(1); }}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${resultFilter === s ? "bg-card text-foreground shadow-custom" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {s === "all" ? "全部" : s === "success" ? "✓ 成功" : "✗ 失败"}
                </button>
              ))}
            </div>
          </div>

          {(deviceFilter || projectFilter !== "all" || bmsFilter !== "all" || resultFilter !== "all") && (
            <button
              onClick={() => { setDeviceFilter(""); setProjectFilter("all"); setBmsFilter("all"); setResultFilter("all"); setOtaPage(1); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors mt-4"
            >
              <X size={11} /> 清除筛选
            </button>
          )}
        </div>
      </div>

      {/* 表格 */}
      <div className="bms-card p-0">
        <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
          <RefreshCw size={14} className="text-primary" />
          <h4 className="text-sm font-semibold text-foreground">OTA升级记录</h4>
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} 条记录</span>
        </div>
        {paged.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bms-table-header text-left">
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">设备ID</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">所属项目</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">保护板型号</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">固件版本（升级前→后）</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">升级时间</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">升级结果</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">操作人</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">跳转</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r, i) => (
                  <tr key={r.id} className={`table-row-hover border-b border-border text-sm ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-xs font-mono font-medium text-foreground">{r.deviceId}</p>
                        <p className="text-xs text-muted-foreground font-mono">{r.deviceSn}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-foreground">{r.projectName}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck size={11} className="text-primary flex-shrink-0" />
                        <span className="text-xs text-foreground">{r.bmsName}</span>
                      </div>
                    </td>
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
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onNavigateToDevice && onNavigateToDevice(r.deviceId)}
                          className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                          title={`跳转到设备 ${r.deviceId}`}
                        >
                          <ExternalLink size={11} /> 设备
                        </button>
                        <span className="text-border">·</span>
                        <button
                          onClick={() => onNavigateToProject && onNavigateToProject(r.projectId)}
                          className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                          title={`跳转到项目 ${r.projectName}`}
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
          <div className="py-16 text-center text-muted-foreground">
            <RefreshCw size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">未找到匹配的OTA升级记录</p>
          </div>
        )}
        <Pagination
          total={filtered.length}
          page={otaPage}
          pageSize={OTA_PAGE_SIZE}
          onPageChange={setOtaPage}
          onPageSizeChange={() => {}}
        />
      </div>
    </div>
  );
};

// ============================================================
// Main Component
// ============================================================
interface FirmwareManagePageProps {
  onNavigateToDevice?: (deviceId: string) => void;
  onNavigateToProject?: (projectId: string) => void;
}

const FirmwareManagePage = ({
  onNavigateToDevice = () => {},
  onNavigateToProject = () => {},
}: FirmwareManagePageProps) => {
  const [activeTab, setActiveTab] = useState<"firmware" | "ota">("firmware");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showUpload, setShowUpload] = useState(false);
  const [editTarget, setEditTarget] = useState<FirmwareRecord | null>(null);
  const [detailTarget, setDetailTarget] = useState<FirmwareRecord | null>(null);
  const [compareA, setCompareA] = useState<string>("");
  const [compareB, setCompareB] = useState<string>("");
  const [showCompare, setShowCompare] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [firmwares, setFirmwares] = useState<FirmwareRecord[]>(FIRMWARES);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    version: "",
    bmsId: "",
    hardware: "HW-3.x",
    status: "beta" as FirmwareRecord["status"],
    desc: "",
  });

  const filtered = firmwares.filter((f) => {
    const matchSearch = f.version.toLowerCase().includes(search.toLowerCase()) ||
      f.bmsName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || f.status === statusFilter;
    return matchSearch && matchStatus;
  });
  const pagedFirmwares = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stable = firmwares.filter((f) => f.status === "stable").length;
  const beta = firmwares.filter((f) => f.status === "beta").length;
  const deprecated = firmwares.filter((f) => f.status === "deprecated").length;
  const totalDevices = firmwares.reduce((s, f) => s + f.devices, 0);

  const fwA = firmwares.find((f) => f.id === compareA);
  const fwB = firmwares.find((f) => f.id === compareB);

  const handleDelete = (id: string) => {
    setFirmwares((prev) => prev.filter((f) => f.id !== id));
    console.log("[FirmwareManage] 删除固件", id);
  };

  const handleStatusChange = (id: string, newStatus: FirmwareRecord["status"]) => {
    setFirmwares((prev) => prev.map((f) => f.id === id ? { ...f, status: newStatus } : f));
    setEditTarget(null);
    console.log("[FirmwareManage] 修改固件状态", id, newStatus);
  };

  const handleUpload = () => {
    if (!uploadForm.version || !uploadForm.bmsId) return;
    const bms = BMS_MODELS.find(b => b.id === uploadForm.bmsId);
    const newFw: FirmwareRecord = {
      id: `FW-${String(firmwares.length + 1).padStart(3, "0")}`,
      version: uploadForm.version,
      bmsId: uploadForm.bmsId,
      bmsName: bms?.name || "",
      hardware: uploadForm.hardware,
      size: "0.0 MB",
      status: uploadForm.status,
      released: new Date().toISOString().split("T")[0],
      desc: uploadForm.desc,
      devices: 0,
      changelog: [],
    };
    setFirmwares(prev => [...prev, newFw]);
    setShowUpload(false);
    setUploadForm({ version: "", bmsId: "", hardware: "HW-3.x", status: "beta", desc: "" });
    console.log("[FirmwareManage] 上传固件", newFw.version, "保护板:", newFw.bmsName);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* ===== Page Header Bar ===== */}
      <div className="bg-card border-b border-border px-6 py-4 flex-shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">固件管理</h2>
          <p className="text-xs text-muted-foreground mt-0.5">固件版本库管理与 OTA 升级记录查阅</p>
        </div>
      </div>

      {/* ===== Tab Bar ===== */}
      <div className="bg-card border-b border-border px-6 flex-shrink-0 flex items-center gap-1">
        <button
          onClick={() => setActiveTab("firmware")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "firmware" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Package size={14} />
          固件列表
        </button>
        <button
          onClick={() => setActiveTab("ota")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "ota" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <RefreshCw size={14} />
          OTA升级记录
          <span className="ml-0.5 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
            {OTA_RECORDS_GLOBAL.length}
          </span>
        </button>
      </div>

      {/* ===== Content ===== */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* ==================== 固件列表 Tab ==================== */}
        {activeTab === "firmware" && (
          <>
            {/* Stat Cards */}
            <div className="flex gap-4">
              <div className="flex-1"><StatCard title="固件版本数" value={String(firmwares.length)} iconName="cpu" colorType="blue" /></div>
              <div className="flex-1"><StatCard title="稳定版本" value={String(stable)} iconName="check" colorType="green" /></div>
              <div className="flex-1"><StatCard title="Beta 版本" value={String(beta)} iconName="alert" colorType="orange" /></div>
              <div className="flex-1"><StatCard title="已覆盖设备" value={String(totalDevices)} unit="台" iconName="battery" colorType="teal" /></div>
            </div>

            {/* Upload panel */}
            {showUpload && (
              <div className="bms-card border-2 border-dashed border-primary/30 bg-primary/2">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Upload size={15} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">上传新固件</h3>
                      <p className="text-xs text-muted-foreground">支持 .bin / .hex 格式，最大 10MB</p>
                    </div>
                  </div>
                  <button onClick={() => setShowUpload(false)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <X size={14} />
                  </button>
                </div>
                <div className="flex gap-4 flex-wrap mb-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">版本号 <span className="text-destructive">*</span></label>
                    <input
                      placeholder="如 v2.1.4"
                      value={uploadForm.version}
                      onChange={e => setUploadForm({ ...uploadForm, version: e.target.value })}
                      className="bms-input text-sm w-36"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      适配保护板型号 <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={uploadForm.bmsId}
                      onChange={e => setUploadForm({ ...uploadForm, bmsId: e.target.value })}
                      className="bms-input text-sm w-52"
                    >
                      <option value="">-- 选择保护板型号 --</option>
                      {BMS_MODELS.map(b => (
                        <option key={b.id} value={b.id}>{b.name}（{b.model}）</option>
                      ))}
                    </select>
                    <p className="text-xs text-primary/70 flex items-center gap-1 mt-0.5">
                      <ShieldCheck size={10} /> 固件必须绑定保护板（BMS）型号
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">适配硬件版本</label>
                    <select
                      value={uploadForm.hardware}
                      onChange={e => setUploadForm({ ...uploadForm, hardware: e.target.value })}
                      className="bms-input text-sm w-32"
                    >
                      <option>HW-2.x</option>
                      <option>HW-3.x</option>
                      <option>HW-4.x</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">版本状态</label>
                    <select
                      value={uploadForm.status}
                      onChange={e => setUploadForm({ ...uploadForm, status: e.target.value as FirmwareRecord["status"] })}
                      className="bms-input text-sm w-28"
                    >
                      <option value="beta">Beta</option>
                      <option value="stable">稳定版</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 flex-1 min-w-48">
                    <label className="text-xs font-medium text-muted-foreground">版本说明</label>
                    <input
                      placeholder="简述此版本更新内容"
                      value={uploadForm.desc}
                      onChange={e => setUploadForm({ ...uploadForm, desc: e.target.value })}
                      className="bms-input text-sm w-full"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/50 hover:bg-primary/2 transition-all group">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2 group-hover:bg-primary/10 transition-colors">
                      <Upload size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">点击上传或拖拽固件文件到此处</p>
                    <p className="text-xs text-muted-foreground mt-1">.bin / .hex 格式，最大 10MB</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleUpload}
                      disabled={!uploadForm.version || !uploadForm.bmsId}
                      className="bms-btn-primary flex items-center gap-2 text-xs whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload size={13} />确认上传
                    </button>
                    <button onClick={() => setShowUpload(false)} className="bms-btn-secondary text-xs">取消</button>
                  </div>
                </div>
              </div>
            )}

            {/* Main Table Card */}
            <div className="bms-card p-0">
              {/* Toolbar */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      placeholder="搜索版本号/保护板..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                      className="bms-input pl-8 w-52 text-sm"
                    />
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    {search && (
                      <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                    {(["all", "stable", "beta", "deprecated"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => { setStatusFilter(s); setPage(1); }}
                        className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${statusFilter === s ? "bg-card text-foreground shadow-custom" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {s === "all" ? "全部" : s === "stable" ? "稳定版" : s === "beta" ? "Beta" : "废弃"}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground border-l border-border pl-3">
                    废弃版本 <span className="font-medium text-foreground">{deprecated}</span> 个
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCompare(true)}
                    className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-border bg-background hover:border-primary/50 hover:text-primary transition-colors text-muted-foreground"
                  >
                    <GitCompare size={13} /> 版本对比
                  </button>
                  <button
                    onClick={() => setShowUpload(true)}
                    className="bms-btn-primary flex items-center gap-2 text-xs"
                  >
                    <Upload size={13} />上传固件
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bms-table-header text-left">
                      <th className="px-5 py-3 text-xs font-medium text-muted-foreground">版本号</th>
                      <th className="px-5 py-3 text-xs font-medium text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <ShieldCheck size={11} /> 适配保护板
                        </div>
                      </th>
                      <th className="px-5 py-3 text-xs font-medium text-muted-foreground">硬件版本</th>
                      <th className="px-5 py-3 text-xs font-medium text-muted-foreground">文件大小</th>
                      <th className="px-5 py-3 text-xs font-medium text-muted-foreground">状态</th>
                      <th className="px-5 py-3 text-xs font-medium text-muted-foreground">发布日期</th>
                      <th className="px-5 py-3 text-xs font-medium text-muted-foreground">已覆盖设备</th>
                      <th className="px-5 py-3 text-xs font-medium text-muted-foreground">变更说明</th>
                      <th className="px-5 py-3 text-xs font-medium text-muted-foreground">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedFirmwares.length > 0 ? pagedFirmwares.map((f, i) => {
                      const s = STATUS_MAP[f.status];
                      return (
                        <tr key={f.id} className={`table-row-hover border-b border-border text-sm ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                              <Package size={14} className="text-primary flex-shrink-0" />
                              <span className="font-semibold text-foreground font-mono">{f.version}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1.5">
                              <ShieldCheck size={12} className="text-primary flex-shrink-0" />
                              <div>
                                <p className="text-xs font-medium text-foreground">{f.bmsName}</p>
                                <p className="text-xs text-muted-foreground font-mono">{f.bmsId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-xs bg-muted px-2 py-0.5 rounded font-mono text-muted-foreground">{f.hardware}</span>
                          </td>
                          <td className="px-5 py-3 text-muted-foreground text-xs">{f.size}</td>
                          <td className="px-5 py-3">
                            <StatusBadge status={s.status} label={s.label} />
                          </td>
                          <td className="px-5 py-3 text-muted-foreground text-xs">{f.released}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1.5">
                              <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary/60 rounded-full" style={{ width: `${Math.min(100, (f.devices / 400) * 100)}%` }} />
                              </div>
                              <span className="text-xs font-medium text-foreground">{f.devices} 台</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1 flex-wrap max-w-48">
                              {f.changelog.slice(0, 2).map((c, ci) => {
                                const t = CHANGELOG_TYPE_MAP[c.type];
                                return (
                                  <span key={ci} className={`text-xs px-1.5 py-0.5 rounded border ${t.cls}`}>{t.label}</span>
                                );
                              })}
                              {f.changelog.length > 2 && (
                                <span className="text-xs text-muted-foreground">+{f.changelog.length - 2}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setDetailTarget(f)}
                                className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-primary"
                                title="查看详情与变更日志"
                              >
                                <Info size={13} />
                              </button>
                              <button
                                className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-primary"
                                title="下载固件"
                              >
                                <Download size={13} />
                              </button>
                              <button
                                onClick={() => setEditTarget(f)}
                                className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-primary"
                                title="编辑"
                              >
                                <Edit2 size={13} />
                              </button>
                              {f.status === "deprecated" && (
                                <button
                                  onClick={() => handleDelete(f.id)}
                                  className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                                  title="删除"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={9} className="py-16 text-center text-muted-foreground text-sm">
                          <Search size={32} className="mx-auto mb-3 opacity-20" />
                          未找到匹配的固件版本
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                total={filtered.length}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
              />
            </div>

            {/* Info Footer */}
            <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
              <CheckCircle size={12} className="text-success" />
              固件列表仅管理版本库，所有固件均绑定保护板（BMS）型号。OTA 升级记录请切换至"OTA升级记录"Tab 查阅。
              <ChevronRight size={11} />
            </div>
          </>
        )}

        {/* ==================== OTA升级记录 Tab ==================== */}
        {activeTab === "ota" && (
          <OtaRecordsPanel
            onNavigateToDevice={onNavigateToDevice}
            onNavigateToProject={onNavigateToProject}
          />
        )}
      </div>

      {/* ===== Edit Modal ===== */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-custom overflow-hidden border border-border">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <Edit2 size={16} className="text-primary" />
                <h3 className="font-bold text-foreground">编辑固件信息</h3>
              </div>
              <button onClick={() => setEditTarget(null)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <X size={15} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                <Package size={18} className="text-primary flex-shrink-0" />
                <div>
                  <p className="font-mono font-bold text-foreground">{editTarget.version}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ShieldCheck size={10} /> {editTarget.bmsName} · {editTarget.hardware}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">版本状态</label>
                <div className="flex gap-2">
                  {(["stable", "beta", "deprecated"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setEditTarget({ ...editTarget, status: s })}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                        editTarget.status === s
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {s === "stable" ? "稳定版" : s === "beta" ? "Beta" : "废弃"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">版本说明</label>
                <textarea
                  defaultValue={editTarget.desc}
                  rows={3}
                  className="bms-input w-full text-sm resize-none"
                  placeholder="描述此版本的主要变更..."
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border flex justify-end gap-3">
              <button onClick={() => setEditTarget(null)} className="bms-btn-secondary py-2 px-4 text-xs">取消</button>
              <button
                onClick={() => handleStatusChange(editTarget.id, editTarget.status)}
                className="bms-btn-primary py-2 px-4 flex items-center gap-1.5 text-xs"
              >
                <Check size={13} /> 保存更改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Detail / Changelog Modal ===== */}
      {detailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl shadow-custom overflow-hidden border border-border">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <History size={16} className="text-primary" />
                <h3 className="font-bold text-foreground">变更日志 · {detailTarget.version}</h3>
              </div>
              <button onClick={() => setDetailTarget(null)} className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors">
                <X size={15} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4 flex-wrap text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground"><Package size={13} /><span className="font-mono font-medium text-foreground">{detailTarget.version}</span></div>
                <div className="flex items-center gap-1.5 text-muted-foreground"><ShieldCheck size={13} /><span className="text-foreground">{detailTarget.bmsName}</span></div>
                <div className="flex items-center gap-1.5 text-muted-foreground"><Clock size={13} /><span>{detailTarget.released}</span></div>
                <StatusBadge status={STATUS_MAP[detailTarget.status].status} label={STATUS_MAP[detailTarget.status].label} />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Diff size={13} className="text-primary" /> 本次变更内容</p>
                {detailTarget.changelog.map((entry, idx) => {
                  const t = CHANGELOG_TYPE_MAP[entry.type];
                  return (
                    <div key={idx} className="flex items-start gap-2.5 py-2 px-3 rounded-lg bg-muted/30 border border-border">
                      <span className={`text-xs px-1.5 py-0.5 rounded border flex-shrink-0 mt-0.5 ${t.cls}`}>{t.label}</span>
                      <span className="text-sm text-foreground leading-relaxed">{entry.content}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 pt-2 border-t border-border">
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{detailTarget.devices}</p>
                  <p className="text-xs text-muted-foreground">覆盖设备数</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{detailTarget.size}</p>
                  <p className="text-xs text-muted-foreground">固件大小</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{detailTarget.changelog.length}</p>
                  <p className="text-xs text-muted-foreground">变更条目</p>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-border flex justify-end">
              <button onClick={() => setDetailTarget(null)} className="bms-btn-secondary py-1.5 px-4 text-xs">关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Version Compare Modal ===== */}
      {showCompare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-2xl shadow-custom overflow-hidden border border-border">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <GitCompare size={16} className="text-primary" />
                <h3 className="font-bold text-foreground">固件版本对比</h3>
              </div>
              <button onClick={() => setShowCompare(false)} className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors">
                <X size={15} />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">版本 A（对比基准）</label>
                  <select value={compareA} onChange={(e) => setCompareA(e.target.value)} className="bms-input w-full text-sm">
                    <option value="">-- 选择版本 --</option>
                    {firmwares.map((f) => (<option key={f.id} value={f.id}>{f.version} · {f.bmsName}</option>))}
                  </select>
                </div>
                <div className="pt-6 flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <ArrowRight size={16} className="text-primary" />
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">版本 B（目标版本）</label>
                  <select value={compareB} onChange={(e) => setCompareB(e.target.value)} className="bms-input w-full text-sm">
                    <option value="">-- 选择版本 --</option>
                    {firmwares.map((f) => (<option key={f.id} value={f.id}>{f.version} · {f.bmsName}</option>))}
                  </select>
                </div>
              </div>

              {fwA && fwB ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Diff size={13} className="text-primary" /> 属性差异对比</p>
                  <div className="space-y-1.5">
                    <DiffRow label="版本号" vA={fwA.version} vB={fwB.version} />
                    <DiffRow label="适配保护板" vA={fwA.bmsName} vB={fwB.bmsName} />
                    <DiffRow label="硬件版本" vA={fwA.hardware} vB={fwB.hardware} />
                    <DiffRow label="固件大小" vA={fwA.size} vB={fwB.size} />
                    <DiffRow label="版本状态" vA={fwA.status} vB={fwB.status} />
                    <DiffRow label="发布日期" vA={fwA.released} vB={fwB.released} />
                    <DiffRow label="覆盖设备" vA={`${fwA.devices} 台`} vB={`${fwB.devices} 台`} />
                  </div>
                  <div className="pt-3 border-t border-border space-y-2">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5"><History size={13} className="text-primary" /> 版本 B 的变更项</p>
                    {fwB.changelog.map((entry, idx) => {
                      const t = CHANGELOG_TYPE_MAP[entry.type];
                      return (
                        <div key={idx} className="flex items-start gap-2.5 py-2 px-3 rounded-lg bg-muted/30 border border-border">
                          <span className={`text-xs px-1.5 py-0.5 rounded border flex-shrink-0 ${t.cls}`}>{t.label}</span>
                          <span className="text-sm text-foreground">{entry.content}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-muted-foreground text-sm">
                  <GitCompare size={36} className="mx-auto mb-3 opacity-20" />
                  请选择两个版本以查看差异
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-border flex justify-end">
              <button onClick={() => setShowCompare(false)} className="bms-btn-secondary py-1.5 px-4 text-xs">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FirmwareManagePage;
