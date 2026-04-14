import { useState } from "react";
import StatCard from "../components/StatCard";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar
} from "recharts";

const chargeRecords = [
  { id: "CHG-0001", sn: "BMS-000001", startTime: "2024-06-10 08:00", endTime: "2024-06-10 10:30", duration: "2.5h", startSoc: 15, endSoc: 95, energy: "20.5kWh", efficiency: "94.2%" },
  { id: "CHG-0002", sn: "BMS-000005", startTime: "2024-06-10 07:30", endTime: "2024-06-10 09:45", duration: "2.25h", startSoc: 20, endSoc: 92, energy: "18.3kWh", efficiency: "93.8%" },
  { id: "CHG-0003", sn: "BMS-000006", startTime: "2024-06-09 22:00", endTime: "2024-06-10 00:30", duration: "2.5h", startSoc: 10, endSoc: 98, energy: "22.1kWh", efficiency: "95.1%" },
  { id: "CHG-0004", sn: "BMS-000002", startTime: "2024-06-09 21:00", endTime: "2024-06-09 23:00", duration: "2h", startSoc: 25, endSoc: 88, energy: "16.8kWh", efficiency: "92.5%" },
  { id: "CHG-0005", sn: "BMS-000008", startTime: "2024-06-09 19:30", endTime: "2024-06-09 21:45", duration: "2.25h", startSoc: 18, endSoc: 93, energy: "19.7kWh", efficiency: "94.6%" },
];

const curveData = [
  { t: 0, voltage: 48.0, current: 20, temp: 26, soc: 15 },
  { t: 15, voltage: 49.2, current: 20, temp: 27, soc: 25 },
  { t: 30, voltage: 50.1, current: 20, temp: 28, soc: 36 },
  { t: 45, voltage: 50.8, current: 19, temp: 29, soc: 48 },
  { t: 60, voltage: 51.3, current: 18, temp: 30, soc: 60 },
  { t: 75, voltage: 51.8, current: 16, temp: 30, soc: 71 },
  { t: 90, voltage: 52.4, current: 14, temp: 31, soc: 81 },
  { t: 105, voltage: 53.0, current: 11, temp: 31, soc: 88 },
  { t: 120, voltage: 53.6, current: 7, temp: 30, soc: 93 },
  { t: 135, voltage: 54.0, current: 3, temp: 29, soc: 96 },
  { t: 150, voltage: 54.2, current: 0.5, temp: 28, soc: 98 },
];

const dailyData = [
  { day: "06-04", charge: 180, discharge: 165 },
  { day: "06-05", charge: 210, discharge: 195 },
  { day: "06-06", charge: 195, discharge: 182 },
  { day: "06-07", charge: 220, discharge: 208 },
  { day: "06-08", charge: 235, discharge: 218 },
  { day: "06-09", charge: 215, discharge: 200 },
  { day: "06-10", charge: 245, discharge: 228 },
];

const ChargeAnalysisPage = () => {
  const [tab, setTab] = useState("charge");

  return (
    <div className="p-6 space-y-5">
      <div className="flex gap-4">
        <div className="flex-1"><StatCard title="今日充电次数" value="128" unit="次" trend="较昨日 +15" trendUp={true} iconName="battery" colorType="blue" /></div>
        <div className="flex-1"><StatCard title="今日充电量" value="245" unit="kWh" trend="较昨日 +12%" trendUp={true} iconName="activity" colorType="green" /></div>
        <div className="flex-1"><StatCard title="今日放电量" value="228" unit="kWh" iconName="battery" colorType="orange" /></div>
        <div className="flex-1"><StatCard title="平均充电效率" value="94.1" unit="%" trend="较上周 +0.3%" trendUp={true} iconName="check" colorType="teal" /></div>
      </div>

      <div className="flex gap-4">
        {/* Left: Charts */}
        <div className="flex-1 space-y-4">
          {/* Tabs */}
          <div className="bms-card p-0">
            <div className="flex border-b border-border">
              {[
                { key: "charge", label: "充电分析" },
                { key: "discharge", label: "放电分析" },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-5 py-3 text-sm font-medium transition-colors ${tab === t.key ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="p-5">
              <h4 className="text-sm font-medium text-foreground mb-3">充放电曲线 (BMS-000001)</h4>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={curveData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="t" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} label={{ value: "时间(min)", position: "insideBottom", offset: -5, style: { fontSize: 11, fill: "var(--muted-foreground)" } }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line yAxisId="left" type="monotone" dataKey="voltage" stroke="#1b5de8" strokeWidth={2} dot={false} name="电压(V)" />
                  <Line yAxisId="left" type="monotone" dataKey="current" stroke="#52c41a" strokeWidth={2} dot={false} name="电流(A)" />
                  <Line yAxisId="right" type="monotone" dataKey="soc" stroke="#faad14" strokeWidth={2} dot={false} name="SOC(%)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Chart */}
          <div className="bms-card">
            <h3 className="font-semibold text-foreground mb-4">近7日充放电统计 (kWh)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dailyData}>
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

        {/* Right: Records */}
        <div className="w-96 flex-shrink-0 bms-card p-0">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">充电记录</h3>
          </div>
          <div className="divide-y divide-border">
            {chargeRecords.map((r) => (
              <div key={r.id} className="px-5 py-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-accent-foreground font-mono">{r.sn}</span>
                  <span className="text-xs text-muted-foreground">{r.duration}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground">{r.startTime}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">SOC:</span>
                    <span className="text-xs font-medium text-foreground">{r.startSoc}% → {r.endSoc}%</span>
                  </div>
                  <span className="text-xs font-medium text-primary">{r.energy}</span>
                  <span className="text-xs" style={{ color: "var(--success)" }}>{r.efficiency}</span>
                </div>

                {/* Progress */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${r.endSoc}%`, background: "var(--primary)" }}></div>
                  </div>
                  <span className="text-xs text-muted-foreground">{r.endSoc}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChargeAnalysisPage;
