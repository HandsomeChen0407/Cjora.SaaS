import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { AlertTriangle, Zap } from "lucide-react";

const areaData = [
  { time: "00:00", online: 820, alarm: 5 },
  { time: "03:00", online: 815, alarm: 3 },
  { time: "06:00", online: 835, alarm: 8 },
  { time: "09:00", online: 860, alarm: 12 },
  { time: "12:00", online: 845, alarm: 9 },
  { time: "15:00", online: 870, alarm: 7 },
  { time: "18:00", online: 855, alarm: 6 },
  { time: "21:00", online: 840, alarm: 4 },
];

const chargeData = [
  { day: "周一", charge: 1820, discharge: 1680 },
  { day: "周二", charge: 2100, discharge: 1950 },
  { day: "周三", charge: 1950, discharge: 1820 },
  { day: "周四", charge: 2200, discharge: 2050 },
  { day: "周五", charge: 2350, discharge: 2180 },
  { day: "周六", charge: 2150, discharge: 2000 },
  { day: "周日", charge: 1980, discharge: 1850 },
];

const recentAlarms = [
  { id: "ALM-0001", sn: "BMS-000003", type: "过温告警", level: "critical", time: "14:23:05" },
  { id: "ALM-0005", sn: "BMS-000008", type: "通信超时", level: "critical", time: "10:05:33" },
  { id: "ALM-0002", sn: "BMS-000001", type: "过压告警", level: "warning", time: "13:45:22" },
  { id: "ALM-0006", sn: "BMS-000005", type: "欠压告警", level: "warning", time: "昨日22:14" },
];

const recentUpgrades = [
  { sn: "BMS-000001", from: "v2.1.2", to: "v2.1.3", status: "success", time: "今日10:04" },
  { sn: "BMS-000002", from: "v2.1.2", to: "v2.1.3", status: "success", time: "今日10:05" },
  { sn: "BMS-000003", from: "v3.0.0", to: "v3.0.1", status: "failed", time: "今日09:34" },
];

const DashboardPage = () => {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* Stats Row */}
      <div className="flex gap-4">
        <div className="flex-1"><StatCard title="接入设备总数" value="4,820" unit="台" trend="较上月 +320" trendUp={true} iconName="battery" colorType="blue" /></div>
        <div className="flex-1"><StatCard title="当前在线设备" value="4,231" unit="台" trend="在线率 87.8%" trendUp={true} iconName="activity" colorType="green" /></div>
        <div className="flex-1"><StatCard title="今日告警次数" value="23" unit="次" trend="较昨日 +5" trendUp={false} iconName="alert" colorType="red" /></div>
        <div className="flex-1"><StatCard title="今日充电量" value="245" unit="kWh" trend="较昨日 +12%" trendUp={true} iconName="battery" colorType="teal" /></div>
        <div className="flex-1"><StatCard title="平均SOH" value="92.4" unit="%" trend="较上月 -0.3%" trendUp={false} iconName="check" colorType="orange" /></div>
      </div>

      {/* Row 2 */}
      <div className="flex gap-4">
        {/* Device Online Chart */}
        <div className="flex-1 bms-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">今日设备在线趋势</h3>
            <span className="text-xs text-muted-foreground">每3小时采样</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="onlineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1b5de8" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1b5de8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="alarmGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e53e3e" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#e53e3e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="online" stroke="#1b5de8" strokeWidth={2} fill="url(#onlineGrad)" name="在线数" />
              <Area type="monotone" dataKey="alarm" stroke="#e53e3e" strokeWidth={2} fill="url(#alarmGrad)" name="告警数" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Charge/Discharge */}
        <div className="flex-1 bms-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">本周充放电统计 (kWh)</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chargeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="charge" fill="#1b5de8" name="充电量" radius={[3, 3, 0, 0]} />
              <Bar dataKey="discharge" fill="#52c41a" name="放电量" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3 */}
      <div className="flex gap-4">
        {/* Recent Alarms */}
        <div className="flex-1 bms-card p-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle size={16} className="text-destructive" />
              最新告警
            </h3>
          </div>
          <div className="divide-y divide-border">
            {recentAlarms.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={14} className={a.level === "critical" ? "text-destructive" : "text-warning-foreground"} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.type}</p>
                    <p className="text-xs text-muted-foreground">{a.sn}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{a.time}</span>
                  <StatusBadge
                    status={a.level === "critical" ? "alarm" : "warning"}
                    label={a.level === "critical" ? "严重" : "警告"}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Upgrades */}
        <div className="w-72 flex-shrink-0 bms-card p-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Zap size={16} className="text-primary" />
              近期OTA升级
            </h3>
          </div>
          <div className="divide-y divide-border">
            {recentUpgrades.map((u) => (
              <div key={u.sn} className="px-5 py-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground font-mono">{u.sn}</span>
                  <StatusBadge
                    status={u.status === "success" ? "inuse" : "alarm"}
                    label={u.status === "success" ? "成功" : "失败"}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{u.from} → {u.to}</span>
                  <span className="text-xs text-muted-foreground">{u.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="w-56 flex-shrink-0 bms-card">
          <h3 className="font-semibold text-foreground mb-3 text-sm">系统概览</h3>
          <div className="space-y-3">
            {[
              { label: "客户数", value: "128 家" },
              { label: "活跃项目", value: "31 个" },
              { label: "电池档案", value: "4,820 条" },
              { label: "固件版本", value: "6 个" },
              { label: "今日指令", value: "18 条" },
              { label: "SOH<80%", value: "12 台" },
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

export default DashboardPage;
