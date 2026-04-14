import { useState } from "react";
import { Search, AlertTriangle, CheckCircle, XCircle, Bell, Clock } from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import StatCard from "../components/StatCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const alarms = [
  { id: "ALM-0001", sn: "BMS-000003", type: "过温告警", level: "critical", value: "52.3°C", threshold: ">50°C", project: "P003", time: "2024-06-10 14:23:05", status: "pending" },
  { id: "ALM-0002", sn: "BMS-000001", type: "过压告警", level: "warning", value: "54.8V", threshold: ">54V", project: "P001", time: "2024-06-10 13:45:22", status: "confirmed" },
  { id: "ALM-0003", sn: "BMS-000006", type: "过流告警", level: "warning", value: "22.5A", threshold: ">20A", project: "P002", time: "2024-06-10 12:10:18", status: "closed" },
  { id: "ALM-0004", sn: "BMS-000003", type: "低SOC告警", level: "info", value: "18%", threshold: "<20%", project: "P003", time: "2024-06-10 11:30:44", status: "confirmed" },
  { id: "ALM-0005", sn: "BMS-000008", type: "通信超时", level: "critical", value: "超时120s", threshold: ">60s", project: "P001", time: "2024-06-10 10:05:33", status: "pending" },
  { id: "ALM-0006", sn: "BMS-000005", type: "欠压告警", level: "warning", value: "68.2V", threshold: "<70V", project: "P005", time: "2024-06-09 22:14:11", status: "closed" },
  { id: "ALM-0007", sn: "BMS-000002", type: "温差过大", level: "info", value: "△T=12°C", threshold: ">10°C", project: "P001", time: "2024-06-09 20:55:07", status: "closed" },
];

const chartData = [
  { type: "过温", count: 12, color: "#e53e3e" },
  { type: "过压", count: 8, color: "#faad14" },
  { type: "过流", count: 15, color: "#eb2f96" },
  { type: "欠压", count: 5, color: "#faad14" },
  { type: "低SOC", count: 20, color: "#1b5de8" },
  { type: "通信异常", count: 7, color: "#8b5cf6" },
];

const levelMap: Record<string, { label: string; color: string }> = {
  critical: { label: "严重", color: "var(--destructive)" },
  warning: { label: "警告", color: "var(--warning)" },
  info: { label: "提示", color: "var(--chart-1)" },
};

const AlarmPage = () => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = alarms.filter((a) => {
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    const matchLevel = levelFilter === "all" || a.level === levelFilter;
    const matchSearch = a.sn.includes(search) || a.type.includes(search);
    return matchStatus && matchLevel && matchSearch;
  });

  const pending = alarms.filter((a) => a.status === "pending").length;
  const confirmed = alarms.filter((a) => a.status === "confirmed").length;
  const closed = alarms.filter((a) => a.status === "closed").length;
  const critical = alarms.filter((a) => a.level === "critical").length;

  return (
    <div className="p-6 space-y-5">
      <div className="flex gap-4">
        <div className="flex-1"><StatCard title="未处理告警" value={String(pending)} iconName="alert" colorType="red" /></div>
        <div className="flex-1"><StatCard title="已确认告警" value={String(confirmed)} iconName="check" colorType="orange" /></div>
        <div className="flex-1"><StatCard title="已关闭告警" value={String(closed)} iconName="check" colorType="green" /></div>
        <div className="flex-1"><StatCard title="严重告警" value={String(critical)} iconName="alert" colorType="red" /></div>
      </div>

      <div className="flex gap-4">
        {/* Alarm Table */}
        <div className="flex-1 bms-card p-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  placeholder="搜索SN/告警类型..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bms-input pl-8 w-48 text-sm"
                />
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bms-input text-sm">
                <option value="all">全部状态</option>
                <option value="pending">未处理</option>
                <option value="confirmed">已确认</option>
                <option value="closed">已关闭</option>
              </select>
              <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="bms-input text-sm">
                <option value="all">全部等级</option>
                <option value="critical">严重</option>
                <option value="warning">警告</option>
                <option value="info">提示</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bms-table-header text-left">
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">告警ID</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">设备SN</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">告警类型</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">等级</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">当前值</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">阈值</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">告警时间</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">状态</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => {
                  const lv = levelMap[a.level];
                  return (
                    <tr key={a.id} className={`table-row-hover border-b border-border text-sm ${i % 2 === 0 ? "" : "bg-muted/30"}`}>
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{a.id}</td>
                      <td className="px-5 py-3 font-medium text-accent-foreground text-xs font-mono">{a.sn}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle size={13} style={{ color: lv.color }} />
                          <span className="text-foreground">{a.type}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ color: lv.color, background: lv.color + "18" }}>
                          {lv.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-medium" style={{ color: lv.color }}>{a.value}</td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">{a.threshold}</td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">{a.time}</td>
                      <td className="px-5 py-3">
                        <StatusBadge
                          status={a.status === "pending" ? "alarm" : a.status === "confirmed" ? "warning" : "closed"}
                          label={a.status === "pending" ? "未处理" : a.status === "confirmed" ? "已确认" : "已关闭"}
                        />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          {a.status === "pending" && (
                            <button className="text-xs px-2 py-1 rounded border border-border hover:bg-secondary transition-colors text-foreground">
                              确认
                            </button>
                          )}
                          {a.status !== "closed" && (
                            <button className="text-xs px-2 py-1 rounded border border-border hover:bg-muted transition-colors text-muted-foreground">
                              关闭
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chart */}
        <div className="w-64 flex-shrink-0 bms-card">
          <h3 className="font-semibold text-foreground text-sm mb-4">告警类型分布</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis dataKey="type" type="category" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={50} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 space-y-2">
            {[
              { label: "今日告警", value: "23 次", color: "destructive" },
              { label: "本周告警", value: "156 次", color: "warning" },
              { label: "处理率", value: "78.5%", color: "success" },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-semibold text-foreground">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlarmPage;
