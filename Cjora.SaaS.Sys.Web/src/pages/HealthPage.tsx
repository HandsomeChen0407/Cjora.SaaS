import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, RadialBarChart, RadialBar, AreaChart, Area
} from "recharts";

const batteries = [
  { sn: "BMS-000001", model: "LFP-100Ah", project: "P001", age: "18个月", cycles: 412, soh: 94.2, predictLife: "42个月", status: "good" },
  { sn: "BMS-000002", model: "LFP-100Ah", project: "P001", age: "18个月", cycles: 398, soh: 95.1, predictLife: "44个月", status: "good" },
  { sn: "BMS-000003", model: "NMC-200Ah", project: "P003", age: "24个月", cycles: 687, soh: 78.3, predictLife: "16个月", status: "warning" },
  { sn: "BMS-000005", model: "NCM-150Ah", project: "P005", age: "12个月", cycles: 256, soh: 97.8, predictLife: "52个月", status: "good" },
  { sn: "BMS-000006", model: "LFP-100Ah", project: "P002", age: "30个月", cycles: 823, soh: 68.5, predictLife: "8个月", status: "danger" },
  { sn: "BMS-000008", model: "LFP-100Ah", project: "P001", age: "18个月", cycles: 445, soh: 92.0, predictLife: "38个月", status: "good" },
];

const trendData = [
  { month: "2024-01", soh: 99.5 },
  { month: "2024-02", soh: 99.1 },
  { month: "2024-03", soh: 98.4 },
  { month: "2024-04", soh: 97.8 },
  { month: "2024-05", soh: 96.9 },
  { month: "2024-06", soh: 96.0 },
];

const getSohColor = (soh: number) => {
  if (soh >= 90) return "var(--success)";
  if (soh >= 75) return "var(--warning)";
  return "var(--destructive)";
};

const getSohStatus = (status: string): { status: string; label: string } => {
  if (status === "good") return { status: "inuse", label: "健康" };
  if (status === "warning") return { status: "warning", label: "注意" };
  return { status: "alarm", label: "危险" };
};

const HealthPage = () => {
  const avgSoh = (batteries.reduce((s, b) => s + b.soh, 0) / batteries.length).toFixed(1);
  const goodCount = batteries.filter((b) => b.status === "good").length;
  const warnCount = batteries.filter((b) => b.status === "warning").length;
  const dangerCount = batteries.filter((b) => b.status === "danger").length;

  const radialData = [
    { name: "SOH", value: parseFloat(avgSoh), fill: "#1b5de8" },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="flex gap-4">
        <div className="flex-1"><StatCard title="平均SOH" value={avgSoh} unit="%" iconName="activity" colorType="blue" /></div>
        <div className="flex-1"><StatCard title="健康设备" value={String(goodCount)} unit="台" iconName="check" colorType="green" /></div>
        <div className="flex-1"><StatCard title="需关注设备" value={String(warnCount)} unit="台" iconName="alert" colorType="orange" /></div>
        <div className="flex-1"><StatCard title="高风险设备" value={String(dangerCount)} unit="台" iconName="alert" colorType="red" /></div>
      </div>

      <div className="flex gap-4">
        {/* SOH Overview */}
        <div className="w-64 flex-shrink-0 bms-card flex flex-col items-center">
          <h3 className="font-semibold text-foreground self-start mb-2">平均健康度</h3>
          <div className="relative">
            <ResponsiveContainer width={180} height={180}>
              <RadialBarChart
                cx="50%" cy="50%"
                innerRadius="60%" outerRadius="90%"
                data={radialData}
                startAngle={180} endAngle={0}
              >
                <RadialBar dataKey="value" cornerRadius={8} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ top: "30%" }}>
              <span className="text-3xl font-bold text-foreground">{avgSoh}</span>
              <span className="text-sm text-muted-foreground">SOH %</span>
            </div>
          </div>
          <div className="w-full space-y-2 mt-2">
            {[
              { label: "优良 (≥90%)", count: goodCount, color: "var(--success)" },
              { label: "注意 (75-90%)", count: warnCount, color: "var(--warning)" },
              { label: "危险 (<75%)", count: dangerCount, color: "var(--destructive)" },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }}></span>
                  <span className="text-muted-foreground">{s.label}</span>
                </div>
                <span className="font-semibold text-foreground">{s.count} 台</span>
              </div>
            ))}
          </div>
        </div>

        {/* SOH Trend */}
        <div className="flex-1 bms-card">
          <h3 className="font-semibold text-foreground mb-4">SOH 健康趋势（BMS-000001）</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="sohGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1b5de8" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1b5de8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis domain={[90, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Tooltip />
              <Area type="monotone" dataKey="soh" stroke="#1b5de8" strokeWidth={2} fill="url(#sohGrad)" name="SOH(%)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-3 p-3 rounded-lg" style={{ background: "var(--muted)" }}>
            <p className="text-xs text-muted-foreground">📊 基于历史数据分析，BMS-000001 的 SOH 每月平均衰减约 <strong className="text-foreground">0.7%</strong>，预计在 <strong className="text-foreground">2027年12月</strong> 达到 80% 阈值，建议届时进行维保检查。</p>
          </div>
        </div>
      </div>

      {/* Battery Health Table */}
      <div className="bms-card p-0">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">电池健康详情</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bms-table-header text-left">
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">设备SN</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">型号</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">使用时长</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">循环次数</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">当前SOH</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">SOH进度</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">预估剩余寿命</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">健康状态</th>
              </tr>
            </thead>
            <tbody>
              {batteries.map((b, i) => {
                const s = getSohStatus(b.status);
                const color = getSohColor(b.soh);
                return (
                  <tr key={b.sn} className={`table-row-hover border-b border-border text-sm ${i % 2 === 0 ? "" : "bg-muted/30"}`}>
                    <td className="px-5 py-3 font-mono text-xs text-accent-foreground font-medium">{b.sn}</td>
                    <td className="px-5 py-3 text-foreground">{b.model}</td>
                    <td className="px-5 py-3 text-muted-foreground">{b.age}</td>
                    <td className="px-5 py-3 text-foreground">{b.cycles} 次</td>
                    <td className="px-5 py-3 font-bold" style={{ color }}>{b.soh}%</td>
                    <td className="px-5 py-3 w-32">
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${b.soh}%`, background: color }}></div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-foreground">{b.predictLife}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={s.status} label={s.label} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HealthPage;
