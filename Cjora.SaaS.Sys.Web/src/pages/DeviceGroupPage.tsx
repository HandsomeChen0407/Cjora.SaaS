import { useState, useEffect } from "react";
import {
  Plus, Trash2, ChevronRight, X,
  Network, Cpu, AlertTriangle,
  FolderTree, Link as LinkIcon, FileText,
  ArrowLeft, Building2, FolderOpen, ChevronDown, Filter,
  Search, CheckSquare, Square, Layers, ChevronLeft,
  Tag, Users, FolderPlus, ExternalLink, Download, Settings2,
  Check
} from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import StatCard from "../components/StatCard";

// ============================================================
// 客户-项目 Mock 数据
// ============================================================
interface CustomerOption { id: string; name: string; }
interface ProjectOption { id: string; name: string; customerId: string; }

export const ALL_CUSTOMERS: CustomerOption[] = [
  { id: "C001", name: "深圳储能科技有限公司" },
  { id: "C002", name: "广州新能源集团" },
  { id: "C004", name: "上海锂电科技股份有限公司" },
  { id: "C005", name: "北京绿能电池有限公司" },
  { id: "C007", name: "成都智储能源科技" },
];

export const ALL_PROJECTS: ProjectOption[] = [
  { id: "P001", name: "深圳储能基站项目A", customerId: "C001" },
  { id: "P001B", name: "深圳储能基站项目B", customerId: "C001" },
  { id: "P002", name: "广州光储充一体化项目", customerId: "C002" },
  { id: "P002B", name: "广州调峰储能试验项目", customerId: "C002" },
  { id: "P003", name: "上海园区储能示范工程", customerId: "C004" },
  { id: "P003B", name: "上海浦东分布式储能项目", customerId: "C004" },
  { id: "P004", name: "北京调峰储能项目", customerId: "C005" },
  { id: "P005", name: "成都新能源汽车充电站", customerId: "C007" },
];

// ============================================================
// 分组架构
// ============================================================
interface GroupNode {
  id: string; name: string; parentId: string | null; level: number;
}

// ============================================================
// 电池设备数据类型（新字段）
// ============================================================
type ServiceStatus = "inactive" | "normal" | "arrears" | "cancelled";
type OnlineStatus = "online" | "offline";
type RunStatus = "charging" | "discharging" | "idle" | "sleep";

interface BatteryRecord {
  batteryNo: string;       // 电池编号
  sn: string;              // 电池SN号
  imei: string;            // IMEI
  serviceStatus: ServiceStatus; // 服务状态
  onlineStatus: OnlineStatus;   // 在线状态
  runStatus: RunStatus;         // 运行状态
  lastReportTime: string;       // 某次上报时间
  soc: number;                  // SOC %
  city: string;                 // 城市
  area: string;                 // 地区
  signal: number;               // 信号强度 (0-5)
  alarmInfo: string;            // 告警信息
  lastChargeTime: string;       // 末次充电时间
  lastDischargeTime: string;    // 末次放电时间
  cycleCount: number;           // 循环次数
  totalMileage: number;         // 总里程 (km)
  chargeDuration: string;       // 充电时长
  dischargeDuration: string;    // 放电时长
  serviceExpireTime: string;    // 服务到期时间
  // 内部用
  groupId: string;
  projectId: string;
}

// ============================================================
// Mock 分组树
// ============================================================
const INITIAL_GROUPS: GroupNode[] = [
  { id: "G_ROOT", name: "全部分组", parentId: null, level: 0 },
  { id: "G_SHENZHEN", name: "深圳站点群", parentId: "G_ROOT", level: 1 },
  { id: "G_SZ_A", name: "深圳A区基础阵列", parentId: "G_SHENZHEN", level: 2 },
  { id: "G_SZ_B", name: "深圳B区扩容阵列", parentId: "G_SHENZHEN", level: 2 },
  { id: "G_GUANGZHOU", name: "广州站点群", parentId: "G_ROOT", level: 1 },
  { id: "G_GZ_SOLAR", name: "光伏并网组", parentId: "G_GUANGZHOU", level: 2 },
  { id: "G_GZ_CHARGE", name: "充电桩群组", parentId: "G_GUANGZHOU", level: 2 },
  { id: "G_SHANGHAI", name: "上海站点群", parentId: "G_ROOT", level: 1 },
  { id: "G_SH_EAST", name: "园区东区", parentId: "G_SHANGHAI", level: 2 },
  { id: "G_SH_WEST", name: "园区西区", parentId: "G_SHANGHAI", level: 2 },
  { id: "G_BEIJING", name: "北京站点群", parentId: "G_ROOT", level: 1 },
  { id: "G_CHENGDU", name: "成都站点群", parentId: "G_ROOT", level: 1 },
];

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
const CITIES = ["深圳", "广州", "上海", "北京", "成都"];
const AREAS = ["南山区", "天河区", "浦东新区", "朝阳区", "高新区", "福田区", "越秀区", "静安区", "海淀区", "锦江区"];
const ALARM_INFOS = ["无告警", "无告警", "无告警", "电压过高", "温度异常", "SOC过低", "通信超时"];

function makeDevice(
  batteryNo: string,
  sn: string,
  groupId: string,
  projectId: string,
  onlineStatus: OnlineStatus,
  runStatus: RunStatus,
  serviceStatus: ServiceStatus
): BatteryRecord {
  const cityIdx = rand(0, CITIES.length - 1);
  return {
    batteryNo,
    sn,
    imei: `86${rand(1000000000000, 9999999999999)}`,
    serviceStatus,
    onlineStatus,
    runStatus,
    lastReportTime: onlineStatus === "online" ? `2025-06-${rand(10, 20)} ${rand(8, 22)}:${String(rand(0,59)).padStart(2,'0')}:${String(rand(0,59)).padStart(2,'0')}` : `2025-06-${rand(1, 9)} ${rand(8, 20)}:00:00`,
    soc: rand(10, 99),
    city: CITIES[cityIdx],
    area: AREAS[rand(0, AREAS.length - 1)],
    signal: rand(1, 5),
    alarmInfo: ALARM_INFOS[rand(0, ALARM_INFOS.length - 1)],
    lastChargeTime: `2025-06-${rand(10, 20)} ${rand(8, 22)}:${String(rand(0,59)).padStart(2,'0')}`,
    lastDischargeTime: `2025-06-${rand(1, 15)} ${rand(8, 22)}:${String(rand(0,59)).padStart(2,'0')}`,
    cycleCount: rand(50, 800),
    totalMileage: rand(500, 50000),
    chargeDuration: `${rand(1, 8)}h${rand(0, 59)}min`,
    dischargeDuration: `${rand(2, 12)}h${rand(0, 59)}min`,
    serviceExpireTime: `2026-${String(rand(1,12)).padStart(2,'0')}-${String(rand(1,28)).padStart(2,'0')}`,
    groupId,
    projectId,
  };
}

const INITIAL_BATTERIES: BatteryRecord[] = [
  makeDevice("BAT-0001","BMS-000001","G_SZ_A","P001","online","charging","normal"),
  makeDevice("BAT-0002","BMS-000002","G_SZ_A","P001","online","discharging","normal"),
  makeDevice("BAT-0003","BMS-SZB-001","G_SZ_A","P001B","online","idle","normal"),
  makeDevice("BAT-0004","BMS-SZB-002","G_SZ_A","P001B","offline","sleep","arrears"),
  makeDevice("BAT-0005","BMS-000003","G_SZ_B","P001","offline","idle","normal"),
  makeDevice("BAT-0006","BMS-000004","G_SZ_B","P001","online","charging","normal"),
  makeDevice("BAT-0007","BMS-SZB-003","G_SZ_B","P001B","online","discharging","normal"),
  makeDevice("BAT-0008","BMS-GZ-001","G_GZ_SOLAR","P002","online","charging","normal"),
  makeDevice("BAT-0009","BMS-GZB-001","G_GZ_SOLAR","P002B","online","idle","normal"),
  makeDevice("BAT-0010","BMS-GZB-002","G_GZ_SOLAR","P002B","online","discharging","normal"),
  makeDevice("BAT-0011","BMS-GZ-002","G_GZ_CHARGE","P002","offline","sleep","arrears"),
  makeDevice("BAT-0012","BMS-GZ-003","G_GZ_CHARGE","P002","online","charging","normal"),
  makeDevice("BAT-0013","BMS-SH-001","G_SH_EAST","P003","online","discharging","normal"),
  makeDevice("BAT-0014","BMS-SH3B-001","G_SH_EAST","P003B","online","idle","normal"),
  makeDevice("BAT-0015","BMS-SH-002","G_SH_WEST","P003","offline","sleep","cancelled"),
  makeDevice("BAT-0016","BMS-SH-003","G_SH_WEST","P003","online","charging","normal"),
  makeDevice("BAT-0017","BMS-BJ-001","G_BEIJING","P004","offline","idle","inactive"),
  makeDevice("BAT-0018","BMS-BJ-002","G_BEIJING","P004","offline","sleep","arrears"),
  makeDevice("BAT-0019","BMS-CD-001","G_CHENGDU","P005","online","charging","normal"),
  makeDevice("BAT-0020","BMS-CD-002","G_CHENGDU","P005","online","discharging","normal"),
  makeDevice("BAT-0021","BMS-FREE-01","G_ROOT","P001","online","idle","normal"),
  makeDevice("BAT-0022","BMS-FREE-02","G_ROOT","P003","offline","sleep","inactive"),
];

const ALL_UNASSIGNED_DEVICES: { sn: string; projectId: string }[] = [
  { sn: "BMS-FREE-03", projectId: "P001" },
  { sn: "BMS-FREE-04", projectId: "P002" },
  { sn: "BMS-FREE-05", projectId: "P001B" },
  { sn: "BMS-FREE-06", projectId: "P003" },
  { sn: "BMS-FREE-07", projectId: "P003B" },
];

// ============================================================
// 字段定义
// ============================================================
interface ColumnDef {
  key: string;
  label: string;
  defaultVisible: boolean;
  width?: string;
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: "batteryNo",          label: "电池编号",     defaultVisible: true,  width: "100px" },
  { key: "sn",                 label: "电池SN号",     defaultVisible: true,  width: "130px" },
  { key: "imei",               label: "IMEI",         defaultVisible: true,  width: "150px" },
  { key: "serviceStatus",      label: "服务状态",     defaultVisible: true,  width: "90px" },
  { key: "onlineStatus",       label: "在线状态",     defaultVisible: true,  width: "80px" },
  { key: "runStatus",          label: "运行状态",     defaultVisible: true,  width: "80px" },
  { key: "lastReportTime",     label: "上报时间",     defaultVisible: true,  width: "150px" },
  { key: "soc",                label: "SOC",          defaultVisible: true,  width: "70px" },
  { key: "city",               label: "城市",         defaultVisible: true,  width: "70px" },
  { key: "area",               label: "地区",         defaultVisible: true,  width: "80px" },
  { key: "signal",             label: "信号强度",     defaultVisible: true,  width: "80px" },
  { key: "alarmInfo",          label: "告警信息",     defaultVisible: true,  width: "100px" },
  { key: "lastChargeTime",     label: "末次充电时间", defaultVisible: false, width: "140px" },
  { key: "lastDischargeTime",  label: "末次放电时间", defaultVisible: false, width: "140px" },
  { key: "cycleCount",         label: "循环次数",     defaultVisible: false, width: "80px" },
  { key: "totalMileage",       label: "总里程(km)",   defaultVisible: false, width: "90px" },
  { key: "chargeDuration",     label: "充电时长",     defaultVisible: false, width: "90px" },
  { key: "dischargeDuration",  label: "放电时长",     defaultVisible: false, width: "90px" },
  { key: "serviceExpireTime",  label: "服务到期时间", defaultVisible: false, width: "130px" },
];

// ============================================================
// 辅助渲染函数
// ============================================================
const SERVICE_STATUS_MAP: Record<ServiceStatus, { label: string; cls: string }> = {
  inactive:  { label: "未激活", cls: "bg-muted text-muted-foreground" },
  normal:    { label: "正常",   cls: "bg-green-50 text-green-700 border border-green-200" },
  arrears:   { label: "欠费",   cls: "bg-orange-50 text-orange-700 border border-orange-200" },
  cancelled: { label: "注销",   cls: "bg-red-50 text-red-600 border border-red-200" },
};

const RUN_STATUS_MAP: Record<RunStatus, { label: string; cls: string }> = {
  charging:    { label: "充电", cls: "bg-blue-50 text-blue-700 border border-blue-200" },
  discharging: { label: "放电", cls: "bg-purple-50 text-purple-700 border border-purple-200" },
  idle:        { label: "空闲", cls: "bg-muted text-muted-foreground" },
  sleep:       { label: "休眠", cls: "bg-slate-100 text-slate-500" },
};

function SignalBars({ level = 0 }: { level: number }) {
  return (
    <div className="flex items-end gap-0.5 h-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-1.5 rounded-sm ${i <= level ? "bg-green-500" : "bg-muted"}`}
          style={{ height: `${i * 3 + 2}px` }}
        />
      ))}
    </div>
  );
}

// ============================================================
// Props
// ============================================================
interface DeviceGroupPageProps {
  initialProjectId?: string;
  initialCustomerId?: string;
  onBack?: () => void;
  projectId?: string;
  projectName?: string;
  onViewBatteryDetail?: (sn: string, projectId: string, status: string) => void;
}

function getAllDescendantIds(groupId: string, allGroups: GroupNode[]): string[] {
  const result: string[] = [groupId];
  const children = allGroups.filter((g) => g.parentId === groupId);
  for (const child of children) {
    result.push(...getAllDescendantIds(child.id, allGroups));
  }
  return result;
}

// ============================================================
// Component
// ============================================================
const DeviceGroupPage = ({
  initialProjectId = "",
  initialCustomerId = "",
  onBack,
  onViewBatteryDetail,
}: DeviceGroupPageProps) => {
  const [groups, setGroups] = useState<GroupNode[]>(INITIAL_GROUPS);
  const [batteries, setBatteries] = useState<BatteryRecord[]>(INITIAL_BATTERIES);

  const [filterCustomerId, setFilterCustomerId] = useState<string>(initialCustomerId);
  const [filterProjectId, setFilterProjectId] = useState<string>(initialProjectId);

  useEffect(() => {
    setFilterCustomerId(initialCustomerId);
    setFilterProjectId(initialProjectId);
  }, [initialCustomerId, initialProjectId]);

  const handleCustomerChange = (cid: string) => {
    setFilterCustomerId(cid);
    setFilterProjectId("");
  };

  const projectsUnderCustomer = filterCustomerId
    ? ALL_PROJECTS.filter((p) => p.customerId === filterCustomerId)
    : ALL_PROJECTS;

  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [expandedNodes, setExpandedNodes] = useState<string[]>(["G_ROOT", "G_SHENZHEN", "G_GUANGZHOU", "G_SHANGHAI"]);
  const [snSearch, setSnSearch] = useState<string>("");
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSns, setSelectedSns] = useState<string[]>([]);
  const [showBindPanel, setShowBindPanel] = useState(false);
  const [bindTargetGroupId, setBindTargetGroupId] = useState<string>("");

  // 字段可见性
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key))
  );
  const [showColumnPanel, setShowColumnPanel] = useState(false);

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const activeColumns = ALL_COLUMNS.filter((c) => visibleColumns.has(c.key));

  // 统计
  const filteredByProject: BatteryRecord[] = (() => {
    if (filterProjectId) return batteries.filter((d) => d.projectId === filterProjectId);
    if (filterCustomerId) {
      const pids = new Set(ALL_PROJECTS.filter((p) => p.customerId === filterCustomerId).map((p) => p.id));
      return batteries.filter((d) => pids.has(d.projectId));
    }
    return batteries;
  })();

  const totalDev = filteredByProject.length;
  const onlineDev = filteredByProject.filter((d) => d.onlineStatus === "online").length;
  const alarmDev = filteredByProject.filter((d) => d.alarmInfo !== "无告警").length;
  const offlineDev = filteredByProject.filter((d) => d.onlineStatus === "offline").length;

  // 模态框
  const [groupModal, setGroupModal] = useState<{
    isOpen: boolean; mode: "add" | "edit"; parentId?: string; targetId?: string; name?: string;
  }>({ isOpen: false, mode: "add" });
  const [assignModal, setAssignModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean; title: string; msg: string; onConfirm: () => void;
  } | null>(null);

  // 右侧设备列表
  const baseDisplayDevices: BatteryRecord[] = (() => {
    let pool = filteredByProject;
    if (!selectedGroupId) return pool;
    const selGroup = groups.find((g) => g.id === selectedGroupId);
    if (!selGroup) return pool;
    if (selGroup.parentId === null) return pool;
    const nodeIds = getAllDescendantIds(selectedGroupId, groups);
    return pool.filter((d) => nodeIds.includes(d.groupId));
  })();

  const displayDevices = snSearch.trim()
    ? baseDisplayDevices.filter((d) =>
        d.sn.toLowerCase().includes(snSearch.trim().toLowerCase()) ||
        d.batteryNo.toLowerCase().includes(snSearch.trim().toLowerCase()) ||
        d.imei.toLowerCase().includes(snSearch.trim().toLowerCase())
      )
    : baseDisplayDevices;

  const totalPages = Math.max(1, Math.ceil(displayDevices.length / PAGE_SIZE));
  const pagedDevices = displayDevices.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedSns([]);
  }, [snSearch, filterCustomerId, filterProjectId, selectedGroupId]);

  const selGroupName = selectedGroupId
    ? groups.find((g) => g.id === selectedGroupId)?.name || "全部分组"
    : "全部设备";

  const selGroupIsRoot = selectedGroupId
    ? groups.find((g) => g.id === selectedGroupId)?.parentId === null
    : true;

  const involvedProjects = (() => {
    const pids = new Set(baseDisplayDevices.map((d) => d.projectId));
    return ALL_PROJECTS.filter((p) => pids.has(p.id));
  })();

  const isAllPageSelected = pagedDevices.length > 0 && pagedDevices.every((d) => selectedSns.includes(d.sn));
  const isIndeterminate = pagedDevices.some((d) => selectedSns.includes(d.sn)) && !isAllPageSelected;

  const toggleSelectAll = () => {
    if (isAllPageSelected) {
      setSelectedSns((prev) => prev.filter((sn) => !pagedDevices.find((d) => d.sn === sn)));
    } else {
      const newSns = pagedDevices.map((d) => d.sn).filter((sn) => !selectedSns.includes(sn));
      setSelectedSns((prev) => [...prev, ...newSns]);
    }
  };

  const toggleSelect = (sn: string) => {
    setSelectedSns((prev) => prev.includes(sn) ? prev.filter((s) => s !== sn) : [...prev, sn]);
  };

  const handleBatchBind = () => {
    if (!bindTargetGroupId || selectedSns.length === 0) return;
    setBatteries((prev) =>
      prev.map((d) => selectedSns.includes(d.sn) ? { ...d, groupId: bindTargetGroupId } : d)
    );
    setSelectedSns([]);
    setBindTargetGroupId("");
    setShowBindPanel(false);
    console.log("[DeviceGroupPage] 批量绑定", selectedSns.length, "台设备");
  };

  // 导出 CSV
  const handleExport = () => {
    const headers = ["电池编号","电池SN号","IMEI","服务状态","在线状态","运行状态","上报时间","SOC(%)","城市","地区","信号强度","告警信息","末次充电时间","末次放电时间","循环次数","总里程(km)","充电时长","放电时长","服务到期时间"];
    const svcMap: Record<string, string> = { inactive:"未激活", normal:"正常", arrears:"欠费", cancelled:"注销" };
    const runMap: Record<string, string> = { charging:"充电", discharging:"放电", idle:"空闲", sleep:"休眠" };
    const rows = displayDevices.map((d) => [
      d.batteryNo, d.sn, d.imei,
      svcMap[d.serviceStatus] || d.serviceStatus,
      d.onlineStatus === "online" ? "在线" : "离线",
      runMap[d.runStatus] || d.runStatus,
      d.lastReportTime, d.soc, d.city, d.area, d.signal,
      d.alarmInfo, d.lastChargeTime, d.lastDischargeTime,
      d.cycleCount, d.totalMileage, d.chargeDuration, d.dischargeDuration, d.serviceExpireTime,
    ]);
    const csvContent = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `电池列表_${new Date().toLocaleDateString()}.csv`; a.click();
    URL.revokeObjectURL(url);
    console.log("[DeviceGroupPage] 导出", displayDevices.length, "条记录");
  };

  // 分组树渲染
  const renderTree = (parentId: string | null) => {
    return groups
      .filter((g) => g.parentId === parentId)
      .map((node) => {
        const hasChildren = groups.some((g) => g.parentId === node.id);
        const isExpanded = expandedNodes.includes(node.id);
        const isSelected = selectedGroupId === node.id;
        const nodeIds = getAllDescendantIds(node.id, groups);
        const nodeDeviceCount = batteries.filter((d) => nodeIds.includes(d.groupId)).length;

        return (
          <div key={node.id} className="w-full">
            <div
              className={`flex items-center justify-between py-2 px-2 rounded-md cursor-pointer transition-colors group/node ${
                isSelected ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted"
              }`}
              style={{ paddingLeft: `${node.level * 1.25 + 0.5}rem` }}
              onClick={() => { setSelectedGroupId(node.id); setSnSearch(""); }}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <button
                  className={`p-0.5 rounded flex-shrink-0 text-muted-foreground hover:bg-black/5 ${!hasChildren && "invisible"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedNodes((prev) => isExpanded ? prev.filter((id) => id !== node.id) : [...prev, node.id]);
                  }}
                >
                  <ChevronRight size={13} className={`transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </button>
                <FolderTree size={14} className={`flex-shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-sm truncate max-w-[90px]">{node.name}</span>
                <span className="text-xs text-muted-foreground bg-muted px-1.5 rounded flex-shrink-0">{nodeDeviceCount}</span>
              </div>

              <div className="opacity-0 group-hover/node:opacity-100 flex items-center gap-0.5 transition-opacity flex-shrink-0">
                {node.level < 2 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setGroupModal({ isOpen: true, mode: "add", parentId: node.id }); }}
                    className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded"
                    title="添加子分组"
                  >
                    <Plus size={13} />
                  </button>
                )}
                {node.parentId !== null && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setGroupModal({ isOpen: true, mode: "edit", targetId: node.id, name: node.name }); }}
                      className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded"
                      title="编辑"
                    ><FileText size={13} /></button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDialog({
                          isOpen: true, title: "删除分组",
                          msg: `确定要删除分组「${node.name}」吗？此操作不可恢复，该分组下的设备将被移至根节点。`,
                          onConfirm: () => {
                            setGroups((prev) => prev.filter((g) => g.id !== node.id && g.parentId !== node.id));
                            setBatteries((prev) => prev.map((d) => d.groupId === node.id ? { ...d, groupId: "G_ROOT" } : d));
                            if (selectedGroupId === node.id) setSelectedGroupId("");
                            setConfirmDialog(null);
                          },
                        });
                      }}
                      className="p-1 text-muted-foreground hover:text-destructive hover:bg-red-50 rounded"
                      title="删除"
                    ><Trash2 size={13} /></button>
                  </>
                )}
              </div>
            </div>
            {isExpanded && hasChildren && <div className="w-full">{renderTree(node.id)}</div>}
          </div>
        );
      });
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get("name") as string;
    if (groupModal.mode === "add") {
      const parentGroup = groups.find((g) => g.id === groupModal.parentId);
      const newLevel = (parentGroup?.level ?? 0) + 1;
      setGroups([...groups, { id: `G_NEW_${Date.now()}`, name, parentId: groupModal.parentId || null, level: newLevel }]);
      if (groupModal.parentId && !expandedNodes.includes(groupModal.parentId)) {
        setExpandedNodes([...expandedNodes, groupModal.parentId]);
      }
    } else {
      setGroups(groups.map((g) => g.id === groupModal.targetId ? { ...g, name } : g));
    }
    setGroupModal({ isOpen: false, mode: "add" });
  };

  const handleAssignDevice = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const sn = formData.get("sn") as string;
    const pid = formData.get("pid") as string;
    if (!sn || !pid) return;
    const dev = ALL_UNASSIGNED_DEVICES.find((d) => d.sn === sn);
    if (dev) {
      const newBat = makeDevice(
        `BAT-NEW-${Date.now()}`, sn,
        selectedGroupId || "G_ROOT", pid, "offline", "idle", "inactive"
      );
      setBatteries([newBat, ...batteries]);
    }
    setAssignModal(false);
  };

  const assignableDevices = ALL_UNASSIGNED_DEVICES.filter((d) => !batteries.find((b) => b.sn === d.sn));
  const hasFilter = !!filterCustomerId || !!filterProjectId;
  const filterDesc = (() => {
    const cname = ALL_CUSTOMERS.find((c) => c.id === filterCustomerId)?.name;
    const pname = ALL_PROJECTS.find((p) => p.id === filterProjectId)?.name;
    if (pname) return pname;
    if (cname) return cname;
    return "";
  })();

  console.log("[DeviceGroupPage] 渲染, 设备数:", displayDevices.length, "可见列数:", activeColumns.length);

  // 渲染某列的单元格值
  const renderCell = (d: BatteryRecord, key: string) => {
    switch (key) {
      case "batteryNo":
        return <span className="font-mono text-xs font-medium">{d.batteryNo}</span>;
      case "sn":
        return (
          <span
            className="font-mono text-xs font-medium text-primary underline decoration-dashed underline-offset-2 cursor-pointer hover:text-primary/80 transition-colors flex items-center gap-1"
            onClick={(e) => {
              e.stopPropagation();
              if (onViewBatteryDetail) onViewBatteryDetail(d.sn, d.projectId, d.onlineStatus);
            }}
            title={`查看 ${d.sn} 详情`}
          >
            {d.sn}<ExternalLink size={10} className="flex-shrink-0 opacity-60" />
          </span>
        );
      case "imei":
        return <span className="font-mono text-xs text-muted-foreground">{d.imei}</span>;
      case "serviceStatus": {
        const s = SERVICE_STATUS_MAP[d.serviceStatus];
        return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>;
      }
      case "onlineStatus":
        return (
          <StatusBadge
            status={d.onlineStatus === "online" ? "online" : "offline"}
            label={d.onlineStatus === "online" ? "在线" : "离线"}
          />
        );
      case "runStatus": {
        const r = RUN_STATUS_MAP[d.runStatus];
        return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.cls}`}>{r.label}</span>;
      }
      case "lastReportTime":
        return <span className="text-xs text-muted-foreground">{d.lastReportTime}</span>;
      case "soc":
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${d.soc >= 60 ? "bg-green-500" : d.soc >= 30 ? "bg-yellow-500" : "bg-red-500"}`}
                style={{ width: `${d.soc}%` }}
              />
            </div>
            <span className="text-xs font-medium">{d.soc}%</span>
          </div>
        );
      case "city":
        return <span className="text-xs">{d.city}</span>;
      case "area":
        return <span className="text-xs text-muted-foreground">{d.area}</span>;
      case "signal":
        return <SignalBars level={d.signal} />;
      case "alarmInfo":
        return (
          <span className={`text-xs ${d.alarmInfo === "无告警" ? "text-muted-foreground" : "text-red-600 font-medium"}`}>
            {d.alarmInfo}
          </span>
        );
      case "lastChargeTime":
        return <span className="text-xs text-muted-foreground">{d.lastChargeTime}</span>;
      case "lastDischargeTime":
        return <span className="text-xs text-muted-foreground">{d.lastDischargeTime}</span>;
      case "cycleCount":
        return <span className="text-xs font-medium">{d.cycleCount}</span>;
      case "totalMileage":
        return <span className="text-xs font-medium">{d.totalMileage.toLocaleString()}</span>;
      case "chargeDuration":
        return <span className="text-xs text-muted-foreground">{d.chargeDuration}</span>;
      case "dischargeDuration":
        return <span className="text-xs text-muted-foreground">{d.dischargeDuration}</span>;
      case "serviceExpireTime":
        return <span className="text-xs text-muted-foreground">{d.serviceExpireTime}</span>;
      default:
        return null;
    }
  };

  return (
    <div
      data-cmp="DeviceGroupPage"
      className="flex flex-col h-full bg-background animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      {/* Header bar */}
      <div className="bg-card border-b border-border px-6 py-3 flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 -ml-2 rounded-full hover:bg-muted text-muted-foreground transition-colors flex-shrink-0"
              title="返回"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="flex-shrink-0">
            <div className="flex items-center gap-2">
              <Network size={17} className="text-primary" />
              <h2 className="text-base font-bold text-foreground">设备分组管理</h2>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <Layers size={11} /> 独立维度·跨项目
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">分组架构独立于项目，支持跨项目聚合多设备；点击电池SN可查看详情</p>
          </div>

          <div className="w-px h-8 bg-border flex-shrink-0 mx-1"></div>

          <div className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Filter size={14} className="text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">筛选范围：</span>
            </div>
            <div className="relative flex-shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:border-primary/50 transition-colors cursor-pointer">
                <Users size={13} className="text-muted-foreground flex-shrink-0" />
                <select
                  value={filterCustomerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="text-sm text-foreground bg-transparent border-0 outline-none cursor-pointer pr-4 min-w-[120px]"
                >
                  <option value="">全部客户</option>
                  {ALL_CUSTOMERS.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
            </div>
            <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
            <div className="relative flex-shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:border-primary/50 transition-colors cursor-pointer">
                <FolderOpen size={13} className="text-muted-foreground flex-shrink-0" />
                <select
                  value={filterProjectId}
                  onChange={(e) => setFilterProjectId(e.target.value)}
                  className="text-sm text-foreground bg-transparent border-0 outline-none cursor-pointer pr-4 min-w-[140px]"
                  disabled={projectsUnderCustomer.length === 0}
                >
                  <option value="">全部项目</option>
                  {projectsUnderCustomer.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </div>
            </div>
            {hasFilter && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/8 border border-primary/20">
                <Tag size={12} className="text-primary" />
                <span className="text-xs text-primary font-medium truncate max-w-[160px]">{filterDesc}</span>
                <button
                  onClick={() => { setFilterCustomerId(""); setFilterProjectId(""); }}
                  className="text-primary/60 hover:text-primary transition-colors ml-0.5"
                  title="清除筛选"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="px-6 pt-4 pb-2 flex-shrink-0">
        <div className="flex gap-3">
          <div className="flex-1"><StatCard title={hasFilter ? "筛选设备数" : "设备总数"} value={String(totalDev)} unit="台" iconName="cpu" colorType="blue" /></div>
          <div className="flex-1"><StatCard title="在线设备" value={String(onlineDev)} unit="台" iconName="activity" colorType="green" /></div>
          <div className="flex-1"><StatCard title="异常告警" value={String(alarmDev)} unit="台" iconName="alert" colorType="red" /></div>
          <div className="flex-1"><StatCard title="离线失联" value={String(offlineDev)} unit="台" iconName="alert" colorType="orange" /></div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden px-6 pb-6 pt-3 flex gap-4">
        {/* Left: Group tree */}
        <div className="w-64 bg-card rounded-xl shadow-custom border border-border flex flex-col flex-shrink-0 overflow-hidden">
          <div className="p-3 border-b border-border flex items-center justify-between bg-muted/20">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <FolderTree size={14} className="text-primary" /> 分组架构树
            </h3>
            <button
              onClick={() => setGroupModal({ isOpen: true, mode: "add", parentId: "G_ROOT" })}
              className="flex items-center gap-1 text-xs text-primary hover:bg-primary/10 px-2 py-1 rounded-md transition-colors font-medium"
              title="新建顶级分组"
            >
              <FolderPlus size={13} /> 新建分组
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {(() => {
              const root = groups.find((g) => g.parentId === null);
              if (!root) return null;
              const isSelected = selectedGroupId === root.id;
              const isExpanded = expandedNodes.includes(root.id);
              const hasChildren = groups.some((g) => g.parentId === root.id);
              return (
                <div key={root.id} className="w-full">
                  <div
                    className={`flex items-center justify-between py-2 px-2 rounded-md cursor-pointer transition-colors ${isSelected ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted"}`}
                    onClick={() => { setSelectedGroupId(root.id); setSnSearch(""); }}
                  >
                    <div className="flex items-center gap-1.5">
                      <button
                        className={`p-0.5 rounded text-muted-foreground hover:bg-black/5 ${!hasChildren && "invisible"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedNodes((prev) => isExpanded ? prev.filter((id) => id !== root.id) : [...prev, root.id]);
                        }}
                      >
                        <ChevronRight size={13} className={`transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      </button>
                      <FolderOpen size={14} className={isSelected ? "text-primary" : "text-muted-foreground"} />
                      <span className="text-sm font-medium">{root.name}</span>
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 rounded">{batteries.length}</span>
                    </div>
                  </div>
                  {isExpanded && hasChildren && <div className="w-full">{renderTree(root.id)}</div>}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right: Battery list */}
        <div className="flex-1 bg-card rounded-xl shadow-custom border border-border flex flex-col overflow-hidden min-w-0">
          {/* 右侧面板头部 */}
          <div className="px-4 pt-3 pb-3 border-b border-border bg-muted/20 flex-shrink-0">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <Cpu size={14} className="text-primary" />
                  {selGroupName}
                  <span className="text-xs font-normal text-muted-foreground">
                    （{displayDevices.length}{snSearch ? `/${baseDisplayDevices.length}` : ""} 台设备）
                  </span>
                  {selGroupIsRoot && (
                    <span className="text-xs text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded font-normal">全部设备</span>
                  )}
                </h3>
                {involvedProjects.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">涉及项目：</span>
                    {involvedProjects.slice(0, 4).map((p) => (
                      <span key={p.id} className="text-xs bg-primary/8 text-primary border border-primary/20 px-1.5 py-0.5 rounded">{p.name}</span>
                    ))}
                    {involvedProjects.length > 4 && <span className="text-xs text-muted-foreground">+{involvedProjects.length - 4}</span>}
                  </div>
                )}
              </div>

              {/* 操作按钮区 */}
              <div className="flex items-center gap-2">
                {selGroupIsRoot && selectedSns.length > 0 && (
                  <button
                    onClick={() => setShowBindPanel(true)}
                    className="bms-btn-primary flex items-center gap-1.5 text-xs py-1.5 h-fit"
                  >
                    <LinkIcon size={13} /> 批量绑定至分组（{selectedSns.length}）
                  </button>
                )}
                {selectedGroupId && !selGroupIsRoot && (
                  <button
                    onClick={() => setAssignModal(true)}
                    className="bms-btn-primary flex items-center gap-1.5 text-xs py-1.5 h-fit"
                  >
                    <LinkIcon size={13} /> 分配设备入组
                  </button>
                )}

                {/* 字段选择按钮 */}
                <div className="relative">
                  <button
                    onClick={() => setShowColumnPanel((v) => !v)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-background hover:border-primary/50 hover:text-primary transition-colors text-muted-foreground"
                    title="自定义显示字段"
                  >
                    <Settings2 size={13} /> 字段设置
                  </button>
                  {showColumnPanel && (
                    <div className="absolute right-0 top-full mt-1 z-30 bg-card rounded-xl shadow-custom border border-border w-64 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/20">
                        <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          <Settings2 size={14} className="text-primary" /> 列字段设置
                        </span>
                        <button onClick={() => setShowColumnPanel(false)} className="text-muted-foreground hover:text-foreground">
                          <X size={14} />
                        </button>
                      </div>
                      <div className="p-3 max-h-80 overflow-y-auto">
                        {ALL_COLUMNS.map((col) => {
                          const checked = visibleColumns.has(col.key);
                          return (
                            <button
                              key={col.key}
                              onClick={() => toggleColumn(col.key)}
                              className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors text-left"
                            >
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked ? "bg-primary border-primary" : "border-border bg-background"}`}>
                                {checked && <Check size={10} className="text-primary-foreground" strokeWidth={3} />}
                              </div>
                              <span className={`text-sm ${checked ? "text-foreground font-medium" : "text-muted-foreground"}`}>{col.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="px-3 py-2 border-t border-border bg-muted/10 flex gap-2">
                        <button
                          onClick={() => setVisibleColumns(new Set(ALL_COLUMNS.map((c) => c.key)))}
                          className="flex-1 text-xs py-1 rounded-md border border-border hover:border-primary hover:text-primary transition-colors text-muted-foreground"
                        >全选</button>
                        <button
                          onClick={() => setVisibleColumns(new Set(ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key)))}
                          className="flex-1 text-xs py-1 rounded-md border border-border hover:border-primary hover:text-primary transition-colors text-muted-foreground"
                        >重置</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 导出按钮 */}
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-background hover:border-primary/50 hover:text-primary transition-colors text-muted-foreground"
                  title="导出当前列表"
                >
                  <Download size={13} /> 导出
                </button>
              </div>
            </div>

            {/* 搜索框 */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜索电池编号 / SN号 / IMEI..."
                  value={snSearch}
                  onChange={(e) => setSnSearch(e.target.value)}
                  className="bms-input pl-8 w-72 text-sm"
                />
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                {snSearch && (
                  <button onClick={() => setSnSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X size={13} />
                  </button>
                )}
              </div>
              {selectedSns.length > 0 && (
                <span className="text-xs text-primary font-medium bg-primary/8 border border-primary/20 px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <CheckSquare size={12} /> 已选 {selectedSns.length} 台
                  <button onClick={() => setSelectedSns([])} className="ml-1 text-primary/60 hover:text-primary"><X size={11} /></button>
                </span>
              )}
            </div>
          </div>

          {/* 表格 */}
          <div className="flex-1 overflow-auto">
            <table className="w-full" style={{ minWidth: "900px" }}>
              <thead className="sticky top-0 bg-card z-10 shadow-sm">
                <tr className="bms-table-header text-left">
                  {selGroupIsRoot && (
                    <th className="px-3 py-3 w-10 sticky left-0 bg-card z-20">
                      <button
                        onClick={toggleSelectAll}
                        className="flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                        title={isAllPageSelected ? "取消全选" : "全选当页"}
                      >
                        {isAllPageSelected ? (
                          <CheckSquare size={15} className="text-primary" />
                        ) : isIndeterminate ? (
                          <div className="w-[15px] h-[15px] border-2 border-primary rounded-sm flex items-center justify-center">
                            <div className="w-2 h-0.5 bg-primary rounded"></div>
                          </div>
                        ) : (
                          <Square size={15} />
                        )}
                      </button>
                    </th>
                  )}
                  {activeColumns.map((col) => (
                    <th key={col.key} className="px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap" style={{ minWidth: col.width }}>
                      {col.label}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-xs font-medium text-muted-foreground text-center whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pagedDevices.length > 0 ? (
                  pagedDevices.map((d) => {
                    const isChecked = selectedSns.includes(d.sn);
                    return (
                      <tr
                        key={d.sn}
                        className={`hover:bg-muted/30 transition-colors text-sm ${isChecked ? "bg-primary/5" : ""}`}
                        onClick={() => selGroupIsRoot && toggleSelect(d.sn)}
                        style={{ cursor: selGroupIsRoot ? "pointer" : "default" }}
                      >
                        {selGroupIsRoot && (
                          <td className="px-3 py-2.5 sticky left-0 bg-inherit">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleSelect(d.sn); }}
                              className="flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                            >
                              {isChecked ? <CheckSquare size={15} className="text-primary" /> : <Square size={15} />}
                            </button>
                          </td>
                        )}
                        {activeColumns.map((col) => (
                          <td key={col.key} className="px-3 py-2.5" onClick={(e) => col.key === "sn" && e.stopPropagation()}>
                            {renderCell(d, col.key)}
                          </td>
                        ))}
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {onViewBatteryDetail && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onViewBatteryDetail(d.sn, d.projectId, d.onlineStatus); }}
                                className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                                title="查看电池详情"
                              ><ExternalLink size={14} /></button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDialog({
                                  isOpen: true, title: "移除设备",
                                  msg: `确定要将设备 ${d.sn} 从当前分组移除吗？移除后将变为未分配状态。`,
                                  onConfirm: () => {
                                    setBatteries((prev) => prev.map((dev) => dev.sn === d.sn ? { ...dev, groupId: "G_ROOT" } : dev));
                                    setConfirmDialog(null);
                                  },
                                });
                              }}
                              className="p-1.5 rounded hover:bg-orange-50 text-muted-foreground hover:text-orange-500 transition-colors"
                              title="移出分组"
                            ><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={activeColumns.length + (selGroupIsRoot ? 2 : 1)} className="py-16 text-center text-muted-foreground text-sm">
                      {snSearch ? `未找到包含「${snSearch}」的设备` : hasFilter ? "当前筛选条件下暂无设备" : "该分组下暂无设备"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-border flex items-center justify-between flex-shrink-0 bg-muted/10">
              <span className="text-xs text-muted-foreground">
                共 {displayDevices.length} 条，第 {currentPage}/{totalPages} 页
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground transition-colors"
                ><ChevronLeft size={14} /></button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let page = i + 1;
                  if (totalPages > 7) {
                    if (currentPage <= 4) page = i + 1;
                    else if (currentPage >= totalPages - 3) page = totalPages - 6 + i;
                    else page = currentPage - 3 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 rounded text-xs font-medium transition-colors ${currentPage === page ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                    >{page}</button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground transition-colors"
                ><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 批量绑定侧滑面板 */}
      {showBindPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={() => setShowBindPanel(false)} />
          <div className="w-96 bg-card shadow-custom border-l border-border flex flex-col animate-in slide-in-from-right duration-300">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground flex items-center gap-2"><LinkIcon size={16} className="text-primary" /> 批量绑定至分组</h3>
                <p className="text-xs text-muted-foreground mt-0.5">已选 <span className="text-primary font-medium">{selectedSns.length}</span> 台设备</p>
              </div>
              <button onClick={() => setShowBindPanel(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">待绑定设备（{selectedSns.length} 台）</label>
                <div className="space-y-1 max-h-40 overflow-y-auto border border-border rounded-lg p-2 bg-muted/20">
                  {selectedSns.map((sn) => (
                    <div key={sn} className="flex items-center py-1 px-2 rounded hover:bg-muted/40 text-xs">
                      <span className="font-mono text-accent-foreground">{sn}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">目标分组 <span className="text-destructive">*</span></label>
                <select value={bindTargetGroupId} onChange={(e) => setBindTargetGroupId(e.target.value)} className="bms-input w-full">
                  <option value="">-- 请选择目标分组 --</option>
                  {groups.filter((g) => g.parentId !== null).map((g) => (
                    <option key={g.id} value={g.id}>{"　".repeat(g.level - 1)}{g.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border flex justify-end gap-3 flex-shrink-0">
              <button onClick={() => setShowBindPanel(false)} className="bms-btn-secondary py-2 px-4">取消</button>
              <button onClick={handleBatchBind} disabled={!bindTargetGroupId} className="bms-btn-primary py-2 px-4 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                <LinkIcon size={14} /> 确认绑定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 分组模态框 */}
      {groupModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-card w-full max-w-sm rounded-xl shadow-custom overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-foreground">{groupModal.mode === "add" ? "新增分组" : "编辑分组"}</h3>
              <button onClick={() => setGroupModal({ isOpen: false, mode: "add" })} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveGroup} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">分组名称</label>
                <input required name="name" defaultValue={groupModal.name} placeholder="例如：华南区站点群" className="bms-input w-full" autoFocus />
              </div>
              {groupModal.mode === "add" && groupModal.parentId && (
                <div className="p-2.5 bg-muted/40 rounded-lg text-xs text-muted-foreground flex items-center gap-2">
                  <FolderTree size={12} className="text-primary flex-shrink-0" />
                  上级分组：<span className="font-medium text-foreground">{groups.find((g) => g.id === groupModal.parentId)?.name}</span>
                </div>
              )}
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setGroupModal({ isOpen: false, mode: "add" })} className="bms-btn-secondary py-1.5">取消</button>
                <button type="submit" className="bms-btn-primary py-1.5">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 分配设备模态框 */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-card w-full max-w-md rounded-xl shadow-custom overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-foreground">分配设备入组</h3>
              <button onClick={() => setAssignModal(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>
            <form onSubmit={handleAssignDevice} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">选择未分配的设备</label>
                <select name="sn" required className="bms-input w-full">
                  <option value="">-- 请选择设备 --</option>
                  {assignableDevices.map((d) => (<option key={d.sn} value={d.sn}>{d.sn}</option>))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">归属项目</label>
                <select name="pid" required className="bms-input w-full">
                  <option value="">-- 请选择项目 --</option>
                  {ALL_PROJECTS.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </div>
              <div className="pt-4 mt-2 border-t border-border flex justify-end gap-3">
                <button type="button" onClick={() => setAssignModal(false)} className="bms-btn-secondary py-1.5">取消</button>
                <button type="submit" className="bms-btn-primary py-1.5">确认分配</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 确认对话框 */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-card w-full max-w-sm rounded-xl shadow-custom overflow-hidden">
            <div className="p-6 pb-5">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="text-warning flex-shrink-0" size={24} />
                <h3 className="font-bold text-foreground text-lg">{confirmDialog.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground pl-9">{confirmDialog.msg}</p>
            </div>
            <div className="px-6 py-4 bg-muted/30 border-t border-border flex justify-end gap-3">
              <button onClick={() => setConfirmDialog(null)} className="bms-btn-secondary py-1.5">取消</button>
              <button onClick={confirmDialog.onConfirm} className="bms-btn-primary bg-destructive hover:bg-destructive/90 py-1.5">确定执行</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceGroupPage;
