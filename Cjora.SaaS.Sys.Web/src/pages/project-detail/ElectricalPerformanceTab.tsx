import { Activity, TrendingUp, TrendingDown, CheckCircle, AlertCircle, BarChart2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

interface ElectricalPerformanceTabProps {
  projectId?: string;
}

const chargeData = [
  { time: "0min", voltage: 40.0, current: 50, soc: 5 },
  { time: "20min", voltage: 44.5, current: 50, soc: 22 },
  { time: "40min", voltage: 47.8, current: 50, soc: 40 },
  { time: "60min", voltage: 50.2, current: 48, soc: 57 },
  { time: "80min", voltage: 52.1, current: 40, soc: 72 },
  { time: "100min", voltage: 53.8, current: 25, soc: 85 },
  { time: "120min", voltage: 54.5, current: 10, soc: 96 },
  { time: "130min", voltage: 54.75, current: 2, soc: 100 },
];

const dischargeData = [
  { time: "0min", voltage: 54.75, current: 100, soc: 100 },
  { time: "15min", voltage: 52.5, current: 100, soc: 83 },
  { time: "30min", voltage: 51.2, current: 100, soc: 67 },
  { time: "45min", voltage: 50.1, current: 100, soc: 50 },
  { time: "55min", voltage: 48.8, current: 100, soc: 33 },
  { time: "60min", voltage: 46.0, current: 100, soc: 17 },
  { time: "65min", voltage: 42.5, current: 80, soc: 8 },
  { time: "68min", voltage: 40.0, current: 20, soc: 2 },
];

const testResults = [
  { name: "额定容量验证", spec: "≥ 100 Ah", actual: "102.3 Ah", status: "pass" },
  { name: "额定能量验证", spec: "≥ 4.8 kWh", actual: "4.91 kWh", status: "pass" },
  { name: "内阻测试", spec: "≤ 30 mΩ", actual: "18.5 mΩ", status: "pass" },
  { name: "0.5C 充电效率", spec: "≥ 96%", actual: "97.2%", status: "pass" },
  { name: "1C 放电效率", spec: "≥ 94%", actual: "95.8%", status: "pass" },
  { name: "充放电循环（首次）", spec: "≥ 99%", actual: "99.4%", status: "pass" },
  { name: "高温放电 (45°C)", spec: "≥ 90% CN", actual: "91.5% CN", status: "pass" },
  { name: "低温放电 (-10°C)", spec: "≥ 75% CN", actual: "73.1% CN", status: "warn" },
];

const ElectricalPerformanceTab = ({ projectId = "P001" }: ElectricalPerformanceTabProps) => {
  console.log("[ElectricalPerformanceTab] projectId:", projectId);

  const passCount = testResults.filter((r) => r.status === "pass").length;
  const warnCount = testResults.filter((r) => r.status === "warn").length;

  return (
    <div data-cmp="ElectricalPerformanceTab" className="p-6 space-y-5">
      {/* 汇总卡片行 */}
      <div className="flex gap-4">
        <div className="flex-1 bg-card rounded-xl border border-border shadow-custom p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Activity size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">测试项目总数</p>
            <p className="text-xl font-bold text-foreground">{testResults.length} <span className="text-sm font-normal text-muted-foreground">项</span></p>
          </div>
        </div>
        <div className="flex-1 bg-card rounded-xl border border-border shadow-custom p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
            <CheckCircle size={18} className="text-success" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">测试通过</p>
            <p className="text-xl font-bold text-success">{passCount} <span className="text-sm font-normal text-muted-foreground">项</span></p>
          </div>
        </div>
        <div className="flex-1 bg-card rounded-xl border border-border shadow-custom p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
            <AlertCircle size={18} className="text-warning" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">需关注</p>
            <p className="text-xl font-bold text-warning">{warnCount} <span className="text-sm font-normal text-muted-foreground">项</span></p>
          </div>
        </div>
        <div className="flex-1 bg-card rounded-xl border border-border shadow-custom p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BarChart2 size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">综合通过率</p>
            <p className="text-xl font-bold text-foreground">{Math.round((passCount / testResults.length) * 100)}%</p>
          </div>
        </div>
      </div>

      {/* 曲线图区 */}
      <div className="flex gap-5">
        {/* 充电曲线 */}
        <div className="flex-1 bg-card rounded-xl border border-border shadow-custom overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-muted/20">
            <TrendingUp size={14} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">0.5C 充电特性曲线</h3>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chargeData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="voltageGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="socGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--success)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--success)" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "var(--foreground)" }}
                />
                <Area type="monotone" dataKey="voltage" stroke="var(--primary)" fill="url(#voltageGrad)" strokeWidth={2} name="电压(V)" />
                <Area type="monotone" dataKey="soc" stroke="var(--success)" fill="url(#socGrad)" strokeWidth={2} name="SOC(%)" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2 justify-center">
              <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-primary rounded-full inline-block"></span><span className="text-xs text-muted-foreground">电压 (V)</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-success rounded-full inline-block"></span><span className="text-xs text-muted-foreground">SOC (%)</span></div>
            </div>
          </div>
        </div>

        {/* 放电曲线 */}
        <div className="flex-1 bg-card rounded-xl border border-border shadow-custom overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-muted/20">
            <TrendingDown size={14} className="text-destructive" />
            <h3 className="text-sm font-semibold text-foreground">1C 放电特性曲线</h3>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dischargeData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="dVoltageGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--destructive)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--destructive)" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "var(--foreground)" }}
                />
                <Area type="monotone" dataKey="voltage" stroke="var(--destructive)" fill="url(#dVoltageGrad)" strokeWidth={2} name="电压(V)" />
                <Line type="monotone" dataKey="soc" stroke="var(--warning)" strokeWidth={2} dot={false} name="SOC(%)" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2 justify-center">
              <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-destructive rounded-full inline-block"></span><span className="text-xs text-muted-foreground">电压 (V)</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-warning rounded-full inline-block"></span><span className="text-xs text-muted-foreground">SOC (%)</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* 测试结果表 */}
      <div className="bg-card rounded-xl border border-border shadow-custom overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-muted/20">
          <BarChart2 size={14} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">出厂测试结果</h3>
          <span className="ml-auto text-xs text-muted-foreground">测试日期：2024-01-10</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted text-muted-foreground text-xs text-left">
              <tr>
                <th className="px-5 py-3 font-medium">测试项目</th>
                <th className="px-5 py-3 font-medium">技术规范</th>
                <th className="px-5 py-3 font-medium">实测值</th>
                <th className="px-5 py-3 font-medium">结论</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {testResults.map((row, idx) => (
                <tr key={idx} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3 text-foreground text-xs">{row.name}</td>
                  <td className="px-5 py-3 text-muted-foreground text-xs font-mono">{row.spec}</td>
                  <td className="px-5 py-3 font-mono font-medium text-xs text-foreground">{row.actual}</td>
                  <td className="px-5 py-3">
                    {row.status === "pass" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-success font-medium">
                        <CheckCircle size={12} /> 合格
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-warning font-medium">
                        <AlertCircle size={12} /> 关注
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ElectricalPerformanceTab;
