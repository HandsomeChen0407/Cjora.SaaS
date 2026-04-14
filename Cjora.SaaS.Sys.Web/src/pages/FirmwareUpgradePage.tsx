import { useState } from "react";
import { Upload, Search, CheckCircle, RefreshCw, Play, Layers } from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import StatCard from "../components/StatCard";
import Pagination from "../components/Pagination";

const upgradeHistory = [
  { id: "UPG-0001", sn: "BMS-000001", from: "v2.1.2", to: "v2.1.3", mode: "single", operator: "Admin", startTime: "2024-06-10 10:00:00", endTime: "2024-06-10 10:04:32", duration: "4m 32s", status: "success", progress: 100 },
  { id: "UPG-0002", sn: "BMS-000002", from: "v2.1.2", to: "v2.1.3", mode: "batch", operator: "Admin", startTime: "2024-06-10 10:00:00", endTime: "2024-06-10 10:05:18", duration: "5m 18s", status: "success", progress: 100 },
  { id: "UPG-0003", sn: "BMS-000003", from: "v3.0.0", to: "v3.0.1", mode: "single", operator: "张伟", startTime: "2024-06-10 09:30:00", endTime: "2024-06-10 09:34:55", duration: "4m 55s", status: "failed", progress: 65 },
  { id: "UPG-0004", sn: "BMS-000005", from: "v2.1.0", to: "v2.2.0-beta", mode: "single", operator: "Admin", startTime: "2024-06-09 16:00:00", endTime: "-", duration: "-", status: "upgrading", progress: 42 },
  { id: "UPG-0005", sn: "BMS-000006", from: "v2.1.1", to: "v2.1.3", mode: "batch", operator: "李明", startTime: "2024-06-09 14:30:00", endTime: "2024-06-09 14:35:22", duration: "5m 22s", status: "success", progress: 100 },
  { id: "UPG-0006", sn: "BMS-000008", from: "v2.1.2", to: "v2.1.3", mode: "single", operator: "Admin", startTime: "2024-06-09 11:20:00", endTime: "2024-06-09 11:24:50", duration: "4m 50s", status: "success", progress: 100 },
];

const deviceUpgradeList = [
  { sn: "BMS-000001", model: "LFP-100Ah-48V", currentFw: "v2.1.3", latestFw: "v2.1.3", status: "online", upToDate: true },
  { sn: "BMS-000002", model: "LFP-100Ah-48V", currentFw: "v2.1.2", latestFw: "v2.1.3", status: "online", upToDate: false },
  { sn: "BMS-000003", model: "NMC-200Ah-96V", currentFw: "v3.0.0", latestFw: "v3.0.1", status: "online", upToDate: false },
  { sn: "BMS-000005", model: "NCM-150Ah-72V", currentFw: "v2.1.0", latestFw: "v2.2.0-beta", status: "online", upToDate: false },
  { sn: "BMS-000006", model: "LFP-100Ah-48V", currentFw: "v2.1.3", latestFw: "v2.1.3", status: "online", upToDate: true },
  { sn: "BMS-000008", model: "LFP-100Ah-48V", currentFw: "v2.1.3", latestFw: "v2.1.3", status: "online", upToDate: true },
];

const FirmwareUpgradePage = () => {
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("task");

  // 分页状态（升级记录表格）
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const toggle = (sn: string) => {
    setSelected((prev) => prev.includes(sn) ? prev.filter((s) => s !== sn) : [...prev, sn]);
  };

  const needUpgrade = deviceUpgradeList.filter((d) => !d.upToDate).length;
  const successCount = upgradeHistory.filter((h) => h.status === "success").length;
  const successRate = ((successCount / upgradeHistory.length) * 100).toFixed(1);

  // 分页切片
  const pagedHistory = upgradeHistory.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <div className="flex gap-4">
        <div className="flex-1"><StatCard title="待升级设备" value={String(needUpgrade)} unit="台" iconName="alert" colorType="orange" /></div>
        <div className="flex-1"><StatCard title="升级成功" value={String(successCount)} unit="台" iconName="check" colorType="green" /></div>
        <div className="flex-1"><StatCard title="升级成功率" value={successRate} unit="%" iconName="activity" colorType="blue" /></div>
        <div className="flex-1"><StatCard title="本月升级次数" value="28" unit="次" iconName="cpu" colorType="teal" /></div>
      </div>

      <div className="flex gap-4">
        {/* Device Selection for Upgrade */}
        <div className="w-96 flex-shrink-0 bms-card p-0">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">选择升级设备</h3>
            <p className="text-xs text-muted-foreground mt-0.5">已选 {selected.length} 台设备</p>
          </div>
          <div className="px-4 py-2 border-b border-border">
            <div className="relative">
              <input
                placeholder="搜索设备..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bms-input pl-7 w-full text-xs"
              />
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {deviceUpgradeList.filter((d) => d.sn.includes(search)).map((d) => (
              <div
                key={d.sn}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${selected.includes(d.sn) ? "bg-secondary/40" : "hover:bg-muted/50"}`}
                onClick={() => toggle(d.sn)}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(d.sn)}
                  onChange={() => toggle(d.sn)}
                  className="rounded border-border"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-foreground">{d.sn}</p>
                    {!d.upToDate && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-warning/10 text-warning-foreground">
                        可升级
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{d.currentFw} → {d.latestFw}</p>
                </div>
                {d.upToDate ? (
                  <CheckCircle size={14} className="text-success" />
                ) : (
                  <Upload size={14} className="text-primary" />
                )}
              </div>
            ))}
          </div>

          <div className="px-4 py-4 border-t border-border space-y-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">目标固件版本</label>
              <select className="bms-input text-sm">
                <option>v2.1.3 (LFP-100Ah-48V 稳定版)</option>
                <option>v3.0.1 (NMC-200Ah-96V Beta)</option>
                <option>v2.2.0-beta (NCM-150Ah-72V Beta)</option>
              </select>
            </div>
            <button
              disabled={selected.length === 0}
              className="w-full bms-btn-primary flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selected.length > 1 ? <Layers size={14} /> : <Play size={14} />}
              {selected.length > 1 ? `批量升级 (${selected.length} 台)` : "开始升级"}
            </button>
          </div>
        </div>

        {/* History / Progress */}
        <div className="flex-1 bms-card p-0">
          <div className="flex border-b border-border">
            {[
              { key: "task", label: "升级任务" },
              { key: "history", label: "历史记录" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setPage(1); }}
                className={`px-5 py-3 text-sm font-medium transition-colors ${tab === t.key ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bms-table-header text-left">
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">任务ID</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">设备SN</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">升级路径</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">升级进度</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">耗时</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">状态</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">操作人</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">开始时间</th>
                </tr>
              </thead>
              <tbody>
                {pagedHistory.length > 0 ? pagedHistory.map((h, i) => (
                  <tr key={h.id} className={`table-row-hover border-b border-border text-sm ${i % 2 === 0 ? "" : "bg-muted/30"}`}>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{h.id}</td>
                    <td className="px-5 py-3 font-mono text-xs text-accent-foreground font-medium">{h.sn}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-muted-foreground">{h.from}</span>
                      <span className="mx-1 text-muted-foreground">→</span>
                      <span className="text-xs font-medium text-foreground">{h.to}</span>
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
                    <td className="px-5 py-3 text-xs text-muted-foreground">{h.duration}</td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        status={h.status === "success" ? "inuse" : h.status === "failed" ? "alarm" : "warning"}
                        label={h.status === "success" ? "成功" : h.status === "failed" ? "失败" : "升级中"}
                      />
                    </td>
                    <td className="px-5 py-3 text-foreground">{h.operator}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{h.startTime}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                      暂无升级记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            total={upgradeHistory.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        </div>
      </div>
    </div>
  );
};

export default FirmwareUpgradePage;
