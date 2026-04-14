import { useState } from "react";
import { Upload, Edit2, Trash2, Download, Search, Package, X, Plus, ChevronDown, Save, RefreshCw } from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import StatCard from "../components/StatCard";
import Pagination from "../components/Pagination";

interface FirmwareRecord {
  id: string;
  version: string;
  protectionBoardId: string;
  protectionBoardName: string;
  hardware: string;
  size: string;
  status: "stable" | "beta" | "deprecated";
  released: string;
  desc: string;
  devices: number;
}

interface OtaRecord {
  id: string;
  firmwareId: string;
  sn: string;
  fromVersion: string;
  toVersion: string;
  operator: string;
  startTime: string;
  endTime: string;
  status: "success" | "failed" | "upgrading";
  progress: number;
}

const PROTECTION_BOARDS = [
  { id: "PB-001", name: "BMS-V3 保护板" },
  { id: "PB-002", name: "BMS-V4 保护板" },
];

const MOCK_FIRMWARES: FirmwareRecord[] = [
  { id: "FW-001", version: "v2.1.3", protectionBoardId: "PB-001", protectionBoardName: "BMS-V3 保护板", hardware: "HW-3.x", size: "1.2 MB", status: "stable", released: "2024-05-20", desc: "优化充电控制算法，修复过温告警偶发误报", devices: 345 },
  { id: "FW-002", version: "v2.1.2", protectionBoardId: "PB-001", protectionBoardName: "BMS-V3 保护板", hardware: "HW-3.x", size: "1.2 MB", status: "deprecated", released: "2024-04-10", desc: "新增MQTT心跳机制，修复通信超时bug", devices: 12 },
  { id: "FW-003", version: "v3.0.0", protectionBoardId: "PB-002", protectionBoardName: "BMS-V4 保护板", hardware: "HW-4.x", size: "1.8 MB", status: "stable", released: "2024-06-01", desc: "全新架构，支持双向充放电控制", devices: 220 },
  { id: "FW-004", version: "v2.2.0-beta", protectionBoardId: "PB-001", protectionBoardName: "BMS-V3 保护板", hardware: "HW-3.x", size: "1.5 MB", status: "beta", released: "2024-06-05", desc: "Beta版本：新增SOH计算模型V2", devices: 15 },
  { id: "FW-005", version: "v1.5.0", protectionBoardId: "PB-001", protectionBoardName: "BMS-V3 保护板", hardware: "HW-2.x", size: "0.8 MB", status: "deprecated", released: "2023-12-01", desc: "旧版本，请升级", devices: 5 },
  { id: "FW-006", version: "v3.0.1", protectionBoardId: "PB-002", protectionBoardName: "BMS-V4 保护板", hardware: "HW-4.x", size: "1.8 MB", status: "beta", released: "2024-06-09", desc: "修复v3.0.0充电截止电压计算问题", devices: 8 },
];

const MOCK_OTA_RECORDS: OtaRecord[] = [
  { id: "OTA-0001", firmwareId: "FW-001", sn: "BMS-000001", fromVersion: "v2.1.2", toVersion: "v2.1.3", operator: "Admin", startTime: "2024-06-10 10:00:00", endTime: "2024-06-10 10:04:32", status: "success", progress: 100 },
  { id: "OTA-0002", firmwareId: "FW-001", sn: "BMS-000002", fromVersion: "v2.1.2", toVersion: "v2.1.3", operator: "Admin", startTime: "2024-06-10 10:00:00", endTime: "2024-06-10 10:05:18", status: "success", progress: 100 },
  { id: "OTA-0003", firmwareId: "FW-003", sn: "BMS-000003", fromVersion: "v3.0.0", toVersion: "v3.0.1", operator: "张伟", startTime: "2024-06-10 09:30:00", endTime: "2024-06-10 09:34:55", status: "failed", progress: 65 },
  { id: "OTA-0004", firmwareId: "FW-004", sn: "BMS-000005", fromVersion: "v2.1.0", toVersion: "v2.2.0-beta", operator: "Admin", startTime: "2024-06-09 16:00:00", endTime: "-", status: "upgrading", progress: 42 },
  { id: "OTA-0005", firmwareId: "FW-001", sn: "BMS-000006", fromVersion: "v2.1.1", toVersion: "v2.1.3", operator: "李明", startTime: "2024-06-09 14:30:00", endTime: "2024-06-09 14:35:22", status: "success", progress: 100 },
  { id: "OTA-0006", firmwareId: "FW-001", sn: "BMS-000008", fromVersion: "v2.1.2", toVersion: "v2.1.3", operator: "Admin", startTime: "2024-06-09 11:20:00", endTime: "2024-06-09 11:24:50", status: "success", progress: 100 },
  { id: "OTA-0007", firmwareId: "FW-003", sn: "BMS-000010", fromVersion: "v2.9.0", toVersion: "v3.0.0", operator: "张伟", startTime: "2024-06-08 09:00:00", endTime: "2024-06-08 09:06:11", status: "success", progress: 100 },
  { id: "OTA-0008", firmwareId: "FW-006", sn: "BMS-000011", fromVersion: "v3.0.0", toVersion: "v3.0.1", operator: "Admin", startTime: "2024-06-07 15:30:00", endTime: "-", status: "upgrading", progress: 78 },
];

const statusLabelMap: Record<string, { status: string; label: string }> = {
  stable:     { status: "inuse",   label: "稳定版" },
  beta:       { status: "warning", label: "Beta" },
  deprecated: { status: "offline", label: "废弃" },
};

// ── 新增/编辑固件弹窗 ────────────────────────────────────────────────────────
interface FirmwareFormModalProps {
  firmware: FirmwareRecord | null;
  onClose: () => void;
  onSave: (data: Partial<FirmwareRecord>) => void;
}

const FirmwareFormModal = ({ firmware, onClose, onSave }: FirmwareFormModalProps) => {
  const isEdit = !!firmware?.id;
  const [form, setForm] = useState({
    version:          firmware?.version          || "",
    protectionBoardId: firmware?.protectionBoardId || "",
    hardware:         firmware?.hardware         || "HW-3.x",
    status:           firmware?.status           || "beta" as FirmwareRecord["status"],
    desc:             firmware?.desc             || "",
  });

  const handleSave = () => {
    if (!form.version || !form.protectionBoardId) return;
    const pb = PROTECTION_BOARDS.find(b => b.id === form.protectionBoardId);
    onSave({
      ...firmware,
      version: form.version,
      protectionBoardId: form.protectionBoardId,
      protectionBoardName: pb?.name || "",
      hardware: form.hardware,
      status: form.status,
      desc: form.desc,
      size: "1.0 MB",
      released: new Date().toISOString().split("T")[0],
      devices: 0,
    });
    console.log(`[FirmwareVersion] ${isEdit ? "编辑" : "新增"}固件: ${form.version}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="bg-card w-full max-w-lg rounded-2xl shadow-custom border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package size={15} className="text-primary" />
            </div>
            <h3 className="font-bold text-foreground">{isEdit ? "编辑固件" : "上传新固件"}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">版本号 <span className="text-destructive">*</span></label>
              <input
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                placeholder="如 v2.1.4"
                className="bms-input w-full text-sm"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">适配保护板 <span className="text-destructive">*</span></label>
              <div className="relative">
                <select
                  value={form.protectionBoardId}
                  onChange={(e) => setForm({ ...form, protectionBoardId: e.target.value })}
                  className="bms-input w-full text-sm pr-7 appearance-none"
                >
                  <option value="">-- 选择保护板 --</option>
                  {PROTECTION_BOARDS.map(pb => (
                    <option key={pb.id} value={pb.id}>{pb.name}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">适配硬件版本</label>
              <div className="relative">
                <select
                  value={form.hardware}
                  onChange={(e) => setForm({ ...form, hardware: e.target.value })}
                  className="bms-input w-full text-sm pr-7 appearance-none"
                >
                  <option value="HW-2.x">HW-2.x</option>
                  <option value="HW-3.x">HW-3.x</option>
                  <option value="HW-4.x">HW-4.x</option>
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">版本状态</label>
              <div className="flex gap-2">
                {(["beta", "stable"] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setForm({ ...form, status: s })}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                      form.status === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {s === "beta" ? "Beta" : "稳定版"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">版本说明</label>
            <textarea
              value={form.desc}
              onChange={(e) => setForm({ ...form, desc: e.target.value })}
              placeholder="简述此版本更新内容"
              rows={3}
              className="bms-input w-full text-sm resize-none"
            />
          </div>
          {!isEdit && (
            <div className="border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/50 transition-colors">
              <Upload size={20} className="text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">点击上传或拖拽固件文件到此处</p>
              <p className="text-xs text-muted-foreground mt-1">.bin / .hex 格式，最大 10MB</p>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-muted/10">
          <button onClick={onClose} className="bms-btn-secondary py-2 px-4 text-xs">取消</button>
          <button
            onClick={handleSave}
            disabled={!form.version || !form.protectionBoardId}
            className="bms-btn-primary py-2 px-4 flex items-center gap-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={13} /> {isEdit ? "保存更改" : "确认上传"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── 主页面 ────────────────────────────────────────────────────────────────────
const FirmwareVersionPage = () => {
  const [firmwares, setFirmwares] = useState<FirmwareRecord[]>(MOCK_FIRMWARES);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [boardFilter, setBoardFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"firmware" | "ota">("firmware");
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingFirmware, setEditingFirmware] = useState<FirmwareRecord | null>(null);

  // 固件列表分页
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // OTA记录分页
  const [otaPage, setOtaPage] = useState(1);
  const [otaPageSize] = useState(10);

  const filtered = firmwares.filter((f) => {
    const matchSearch = f.version.includes(search) || f.protectionBoardName.includes(search);
    const matchStatus = statusFilter === "all" || f.status === statusFilter;
    const matchBoard = boardFilter === "all" || f.protectionBoardId === boardFilter;
    return matchSearch && matchStatus && matchBoard;
  });

  const pagedFirmwares = filtered.slice((page - 1) * pageSize, page * pageSize);
  const pagedOta = MOCK_OTA_RECORDS.slice((otaPage - 1) * otaPageSize, otaPage * otaPageSize);

  const stable = firmwares.filter((f) => f.status === "stable").length;
  const beta = firmwares.filter((f) => f.status === "beta").length;
  const totalDevices = firmwares.reduce((s, f) => s + f.devices, 0);
  const otaSuccessCount = MOCK_OTA_RECORDS.filter(r => r.status === "success").length;

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleStatusFilter = (v: string) => { setStatusFilter(v); setPage(1); };

  const handleSaveFirmware = (data: Partial<FirmwareRecord>) => {
    if (data.id) {
      setFirmwares(prev => prev.map(f => f.id === data.id ? { ...f, ...data } as FirmwareRecord : f));
    } else {
      const newFw: FirmwareRecord = {
        id: `FW-${String(firmwares.length + 1).padStart(3, "0")}`,
        version: data.version || "",
        protectionBoardId: data.protectionBoardId || "",
        protectionBoardName: data.protectionBoardName || "",
        hardware: data.hardware || "HW-3.x",
        size: data.size || "1.0 MB",
        status: data.status || "beta",
        released: data.released || new Date().toISOString().split("T")[0],
        desc: data.desc || "",
        devices: 0,
      };
      setFirmwares(prev => [...prev, newFw]);
    }
    setShowFormModal(false);
    setEditingFirmware(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <div className="flex gap-4">
        <div className="flex-1"><StatCard title="固件版本数" value={String(firmwares.length)} iconName="cpu" colorType="blue" /></div>
        <div className="flex-1"><StatCard title="稳定版本" value={String(stable)} iconName="check" colorType="green" /></div>
        <div className="flex-1"><StatCard title="Beta版本" value={String(beta)} iconName="alert" colorType="orange" /></div>
        <div className="flex-1"><StatCard title="已覆盖设备" value={String(totalDevices)} unit="台" iconName="battery" colorType="teal" /></div>
        <div className="flex-1"><StatCard title="OTA升级成功" value={String(otaSuccessCount)} unit="次" iconName="activity" colorType="green" /></div>
      </div>

      <div className="bms-card p-0">
        {/* Tab 切换 */}
        <div className="flex border-b border-border px-2">
          {[
            { key: "firmware" as const, label: "固件版本列表" },
            { key: "ota" as const, label: "OTA升级记录" },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {t.label}
              {t.key === "ota" && (
                <span className="ml-1.5 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{MOCK_OTA_RECORDS.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* 固件版本 */}
        {activeTab === "firmware" && (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <input
                    placeholder="搜索版本号/保护板..."
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="bms-input pl-8 w-52 text-sm"
                  />
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  {search && (
                    <button onClick={() => handleSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X size={12} />
                    </button>
                  )}
                </div>
                <div className="relative">
                  <select value={boardFilter} onChange={(e) => { setBoardFilter(e.target.value); setPage(1); }} className="bms-input text-sm pr-7 appearance-none">
                    <option value="all">全部保护板</option>
                    {PROTECTION_BOARDS.map(pb => <option key={pb.id} value={pb.id}>{pb.name}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
                <select value={statusFilter} onChange={(e) => handleStatusFilter(e.target.value)} className="bms-input text-sm">
                  <option value="all">全部状态</option>
                  <option value="stable">稳定版</option>
                  <option value="beta">Beta</option>
                  <option value="deprecated">废弃</option>
                </select>
              </div>
              <button
                onClick={() => { setEditingFirmware(null); setShowFormModal(true); }}
                className="bms-btn-primary flex items-center gap-2 text-xs"
              >
                <Upload size={13} />
                上传固件
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bms-table-header text-left">
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">版本号</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">适配保护板</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">硬件版本</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">文件大小</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">状态</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">发布日期</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">已覆盖设备</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">版本说明</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedFirmwares.length > 0 ? pagedFirmwares.map((f, i) => {
                    const s = statusLabelMap[f.status];
                    return (
                      <tr key={f.id} className={`table-row-hover border-b border-border text-sm ${i % 2 === 0 ? "" : "bg-muted/30"}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <Package size={14} className="text-primary flex-shrink-0" />
                            <span className="font-semibold text-foreground font-mono">{f.version}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-sm text-foreground">{f.protectionBoardName}</span>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{f.hardware}</td>
                        <td className="px-5 py-3 text-muted-foreground">{f.size}</td>
                        <td className="px-5 py-3">
                          <StatusBadge status={s.status} label={s.label} />
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{f.released}</td>
                        <td className="px-5 py-3 text-foreground">{f.devices} 台</td>
                        <td className="px-5 py-3 text-muted-foreground text-xs max-w-48 truncate">{f.desc}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <button className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-primary" title="下载">
                              <Download size={13} />
                            </button>
                            <button
                              onClick={() => { setEditingFirmware(f); setShowFormModal(true); }}
                              className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-primary"
                              title="编辑"
                            >
                              <Edit2 size={13} />
                            </button>
                            {f.status === "deprecated" && (
                              <button
                                onClick={() => setFirmwares(prev => prev.filter(fw => fw.id !== f.id))}
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
                      <td colSpan={9} className="py-12 text-center text-muted-foreground text-sm">
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
              onPageSizeChange={(s) => { setPage(1); }}
            />
          </>
        )}

        {/* OTA升级记录 */}
        {activeTab === "ota" && (
          <>
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <RefreshCw size={13} className="text-primary" />
              <span className="text-xs text-muted-foreground">以下为所有固件的OTA空中升级历史记录，按时间倒序排列</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bms-table-header text-left">
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">任务ID</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">设备SN</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">升级路径</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">升级进度</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">状态</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">操作人</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">开始时间</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">完成时间</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedOta.length > 0 ? pagedOta.map((h, i) => (
                    <tr key={h.id} className={`table-row-hover border-b border-border text-sm ${i % 2 === 0 ? "" : "bg-muted/30"}`}>
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{h.id}</td>
                      <td className="px-5 py-3 font-mono text-xs text-accent-foreground font-medium">{h.sn}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs text-muted-foreground">{h.fromVersion}</span>
                        <span className="mx-1 text-muted-foreground">→</span>
                        <span className="text-xs font-medium text-foreground">{h.toVersion}</span>
                      </td>
                      <td className="px-5 py-3 w-36">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${h.progress}%`,
                                background: h.status === "success" ? "var(--success)" : h.status === "failed" ? "var(--destructive)" : "var(--primary)"
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8">{h.progress}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge
                          status={h.status === "success" ? "inuse" : h.status === "failed" ? "alarm" : "warning"}
                          label={h.status === "success" ? "成功" : h.status === "failed" ? "失败" : "升级中"}
                        />
                      </td>
                      <td className="px-5 py-3 text-foreground text-sm">{h.operator}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{h.startTime}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{h.endTime}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground text-sm">暂无OTA升级记录</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              total={MOCK_OTA_RECORDS.length}
              page={otaPage}
              pageSize={otaPageSize}
              onPageChange={setOtaPage}
              onPageSizeChange={() => {}}
            />
          </>
        )}
      </div>

      {showFormModal && (
        <FirmwareFormModal
          firmware={editingFirmware}
          onClose={() => { setShowFormModal(false); setEditingFirmware(null); }}
          onSave={handleSaveFirmware}
        />
      )}
    </div>
  );
};

export default FirmwareVersionPage;
