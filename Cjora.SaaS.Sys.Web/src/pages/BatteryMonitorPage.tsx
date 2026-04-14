import { useState } from "react";
import { Search, RefreshCw, Wifi, WifiOff, Thermometer, Zap, Battery } from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import StatCard from "../components/StatCard";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const devices = [
  { sn: "BMS-000001", model: "LFP-100Ah", project: "P001", group: "A区", voltage: 51.2, current: 12.5, temp: 28.3, soc: 87, status: "online" },
  { sn: "BMS-000002", model: "LFP-100Ah", project: "P001", group: "A区", voltage: 50.8, current: 0, temp: 26.1, soc: 72, status: "online" },
  { sn: "BMS-000003", model: "NMC-200Ah", project: "P003", group: "C区", voltage: 97.5, current: -8.2, temp: 35.6, soc: 45, status: "alarm" },
  { sn: "BMS-000004", model: "LFP-100Ah", project: "P001", group: "B区", voltage: 0, current: 0, temp: 0, soc: 0, status: "offline" },
  { sn: "BMS-000005", model: "NCM-150Ah", project: "P005", group: "B区", voltage: 73.4, current: 5.8, temp: 31.2, soc: 91, status: "online" },
  { sn: "BMS-000006", model: "LFP-100Ah", project: "P002", group: "A区", voltage: 49.6, current: 18.3, temp: 29.8, soc: 63, status: "online" },
  { sn: "BMS-000007", model: "NMC-200Ah", project: "P003", group: "D区", voltage: 0, current: 0, temp: 0, soc: 0, status: "offline" },
  { sn: "BMS-000008", model: "LFP-100Ah", project: "P001", group: "C区", voltage: 52.1, current: 9.4, temp: 27.5, soc: 78, status: "online" },
];

const voltageData = [
  { time: "08:00", v1: 51.0, v2: 50.5, v3: 97.2 },
  { time: "09:00", v1: 51.2, v2: 50.6, v3: 97.5 },
  { time: "10:00", v1: 51.5, v2: 50.9, v3: 97.8 },
  { time: "11:00", v1: 50.8, v2: 51.2, v3: 98.1 },
  { time: "12:00", v1: 50.2, v2: 51.5, v3: 96.8 },
  { time: "13:00", v1: 51.1, v2: 50.8, v3: 97.3 },
  { time: "14:00", v1: 51.4, v2: 51.0, v3: 97.6 },
  { time: "15:00", v1: 51.2, v2: 50.8, v3: 97.5 },
];

const BatteryMonitorPage = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState("BMS-000001");

  const filtered = devices.filter((d) => {
    const matchSearch = d.sn.includes(search) || d.model.includes(search);
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const selectedDevice = devices.find((d) => d.sn === selected);
  const online = devices.filter((d) => d.status === "online").length;
  const offline = devices.filter((d) => d.status === "offline").length;
  const alarm = devices.filter((d) => d.status === "alarm").length;

  const getSocColor = (soc: number) => {
    if (soc >= 70) return "var(--success)";
    if (soc >= 30) return "var(--warning)";
    return "var(--destructive)";
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex gap-4">
        <div className="flex-1"><StatCard title="在线设备" value={String(online)} unit="台" iconName="activity" colorType="green" /></div>
        <div className="flex-1"><StatCard title="离线设备" value={String(offline)} unit="台" iconName="cpu" colorType="teal" /></div>
        <div className="flex-1"><StatCard title="告警设备" value={String(alarm)} unit="台" iconName="alert" colorType="red" /></div>
        <div className="flex-1"><StatCard title="平均SOC" value="72.4" unit="%" iconName="battery" colorType="blue" /></div>
      </div>

      <div className="flex gap-4">
        {/* Device List */}
        <div className="w-96 flex-shrink-0 bms-card p-0">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground text-sm">设备列表</h3>
            <button className="p-1.5 rounded hover:bg-muted transition-colors">
              <RefreshCw size={13} className="text-muted-foreground" />
            </button>
          </div>
          <div className="px-3 py-2 border-b border-border flex gap-2">
            <div className="relative flex-1">
              <input
                placeholder="搜索设备..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bms-input pl-7 w-full text-xs"
              />
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bms-input text-xs w-24">
              <option value="all">全部</option>
              <option value="online">在线</option>
              <option value="offline">离线</option>
              <option value="alarm">告警</option>
            </select>
          </div>
          <div className="divide-y divide-border max-h-96 overflow-y-auto">
            {filtered.map((d) => (
              <div
                key={d.sn}
                className={`px-4 py-3 cursor-pointer transition-colors ${selected === d.sn ? "bg-secondary/60" : "hover:bg-muted/50"}`}
                onClick={() => setSelected(d.sn)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {d.status === "online" ? <Wifi size={12} style={{ color: "var(--success)" }} /> :
                      d.status === "alarm" ? <Wifi size={12} style={{ color: "var(--destructive)" }} /> :
                        <WifiOff size={12} className="text-muted-foreground" />}
                    <span className="text-xs font-medium text-foreground">{d.sn}</span>
                  </div>
                  <StatusBadge
                    status={d.status === "online" ? "online" : d.status === "alarm" ? "alarm" : "offline"}
                    label={d.status === "online" ? "在线" : d.status === "alarm" ? "告警" : "离线"}
                  />
                </div>
                {d.status !== "offline" && (
                  <div className="flex gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">{d.voltage}V</span>
                    <span className="text-xs text-muted-foreground">{d.current}A</span>
                    <span className="text-xs text-muted-foreground">{d.temp}°C</span>
                    <span className="text-xs font-medium" style={{ color: getSocColor(d.soc) }}>SOC {d.soc}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="flex-1 space-y-4">
          {selectedDevice && (
            <>
              {/* Metrics */}
              <div className="bms-card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-foreground">{selectedDevice.sn}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">型号: {selectedDevice.model} | 项目: {selectedDevice.project} | 分组: {selectedDevice.group}</p>
                  </div>
                  <StatusBadge
                    status={selectedDevice.status === "online" ? "online" : selectedDevice.status === "alarm" ? "alarm" : "offline"}
                    label={selectedDevice.status === "online" ? "在线" : selectedDevice.status === "alarm" ? "告警" : "离线"}
                  />
                </div>
                <div className="flex gap-4">
                  {[
                    { label: "电压", value: `${selectedDevice.voltage}`, unit: "V", icon: "zap", color: "blue" },
                    { label: "电流", value: `${selectedDevice.current}`, unit: "A", icon: "activity", color: "green" },
                    { label: "温度", value: `${selectedDevice.temp}`, unit: "°C", icon: "thermo", color: "orange" },
                    { label: "SOC", value: `${selectedDevice.soc}`, unit: "%", icon: "battery", color: selectedDevice.soc >= 70 ? "green" : "orange" },
                  ].map((m) => (
                    <div key={m.label} className="flex-1 p-4 rounded-lg text-center" style={{ background: "var(--muted)" }}>
                      <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
                      <p className="text-2xl font-bold text-foreground">{m.value}</p>
                      <p className="text-xs text-muted-foreground">{m.unit}</p>
                    </div>
                  ))}
                </div>

                {/* SOC Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>SOC 电量</span>
                    <span>{selectedDevice.soc}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${selectedDevice.soc}%`, background: getSocColor(selectedDevice.soc) }}
                    />
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="bms-card">
                <h3 className="font-semibold text-foreground mb-4">今日电压趋势</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={voltageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="time" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="v1" stroke="#1b5de8" strokeWidth={2} dot={false} name="BMS-000001" />
                    <Line type="monotone" dataKey="v2" stroke="#52c41a" strokeWidth={2} dot={false} name="BMS-000002" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatteryMonitorPage;
