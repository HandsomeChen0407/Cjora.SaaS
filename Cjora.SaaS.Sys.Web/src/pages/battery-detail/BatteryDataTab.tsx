import { useState } from "react";
import {
  BarChart2, Calendar, Search, ChevronDown, ChevronUp, X
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from "recharts";

interface BatteryDataTabProps {
  sn?: string;
}

// ---- Mock time series data ----
const generateMockData = () => {
  const data = [];
  const baseDate = new Date("2024-07-15T00:00:00");
  for (let i = 0; i < 24; i++) {
    const d = new Date(baseDate.getTime() + i * 3600000);
    const hour = d.getHours();
    const soc = Math.max(15, Math.min(98, 60 + Math.sin(i * 0.4) * 25 + Math.random() * 5));
    const soh = 96 + Math.sin(i * 0.1) * 0.5;
    const voltage = 48 + (soc / 100) * 5 + Math.random() * 0.3;
    const current = hour >= 8 && hour <= 20 ? -(5 + Math.random() * 15) : (3 + Math.random() * 8);
    const maxCellV = 3.28 + Math.random() * 0.02;
    const minCellV = 3.24 + Math.random() * 0.02;
    const temperature = 25 + Math.sin(i * 0.3) * 5 + Math.random() * 2;
    const signal = -(65 + Math.random() * 20);
    const ber = Math.random() * 0.02;
    const chargeCapacity = current > 0 ? current * 0.5 : 0;
    const dischargeCapacity = current < 0 ? Math.abs(current) * 0.5 : 0;
    const mileage = i * 0.8 + Math.random() * 0.5;
    data.push({
      time: `${String(hour).padStart(2, "0")}:00`,
      soc: parseFloat(soc.toFixed(1)),
      soh: parseFloat(soh.toFixed(2)),
      voltage: parseFloat(voltage.toFixed(2)),
      current: parseFloat(current.toFixed(1)),
      maxCellV: parseFloat(maxCellV.toFixed(3)),
      minCellV: parseFloat(minCellV.toFixed(3)),
      cellDiff: parseFloat((maxCellV - minCellV).toFixed(3)),
      temperature: parseFloat(temperature.toFixed(1)),
      signal: parseFloat(signal.toFixed(0)),
      ber: parseFloat(ber.toFixed(4)),
      chargeCapacity: parseFloat(chargeCapacity.toFixed(2)),
      dischargeCapacity: parseFloat(dischargeCapacity.toFixed(2)),
      chargeEnergy: parseFloat((chargeCapacity * voltage / 1000).toFixed(3)),
      dischargeEnergy: parseFloat((dischargeCapacity * voltage / 1000).toFixed(3)),
      mileage: parseFloat(mileage.toFixed(2)),
      cycleCount: Math.floor(i / 8),
      chargeMos: current > 0 ? 1 : 0,
      dischargeMos: current < 0 ? 1 : 0,
      workMode: current < 0 ? "放电" : "充电",
      balanceState: i % 4 === 0 ? "均衡中" : "待机",
      protection: Math.random() > 0.95 ? "过温保护" : "正常",
      alarm: Math.random() > 0.97 ? "一级告警" : "无告警",
    });
  }
  return data;
};

const ALL_DATA = generateMockData();

// 字段分组定义
interface FieldGroup {
  key: string;
  label: string;
  fields: Array<{
    key: string;
    label: string;
    unit: string;
    chartColor: string;
    showInChart?: boolean;
  }>;
}

const FIELD_GROUPS: FieldGroup[] = [
  {
    key: "basic",
    label: "基础电量",
    fields: [
      { key: "soc", label: "SOC", unit: "%", chartColor: "#1b5de8", showInChart: true },
      { key: "soh", label: "SOH", unit: "%", chartColor: "#22c55e", showInChart: true },
      { key: "voltage", label: "总电压", unit: "V", chartColor: "#f59e0b", showInChart: true },
      { key: "current", label: "电流", unit: "A", chartColor: "#8b5cf6", showInChart: true },
    ],
  },
  {
    key: "cell",
    label: "单体电压与温度",
    fields: [
      { key: "maxCellV", label: "单体最高电压", unit: "V", chartColor: "#ef4444", showInChart: true },
      { key: "minCellV", label: "单体最低电压", unit: "V", chartColor: "#3b82f6", showInChart: true },
      { key: "cellDiff", label: "单体压差", unit: "V", chartColor: "#f97316", showInChart: true },
      { key: "temperature", label: "温度", unit: "°C", chartColor: "#ec4899", showInChart: true },
    ],
  },
  {
    key: "comm",
    label: "通信状态",
    fields: [
      { key: "signal", label: "信号强度", unit: "dBm", chartColor: "#06b6d4", showInChart: true },
      { key: "ber", label: "误码率", unit: "", chartColor: "#84cc16", showInChart: true },
    ],
  },
  {
    key: "energy",
    label: "充放电能量",
    fields: [
      { key: "chargeCapacity", label: "充电容量", unit: "Ah", chartColor: "#1b5de8", showInChart: true },
      { key: "dischargeCapacity", label: "放电容量", unit: "Ah", chartColor: "#22c55e", showInChart: true },
      { key: "chargeEnergy", label: "充电能量", unit: "kWh", chartColor: "#f59e0b", showInChart: true },
      { key: "dischargeEnergy", label: "放电能量", unit: "kWh", chartColor: "#8b5cf6", showInChart: true },
    ],
  },
  {
    key: "stats",
    label: "统计与状态",
    fields: [
      { key: "mileage", label: "里程", unit: "km", chartColor: "#06b6d4", showInChart: true },
      { key: "cycleCount", label: "循环次数", unit: "次", chartColor: "#84cc16", showInChart: false },
      { key: "chargeMos", label: "充电MOS", unit: "", chartColor: "#1b5de8", showInChart: false },
      { key: "dischargeMos", label: "放电MOS", unit: "", chartColor: "#22c55e", showInChart: false },
    ],
  },
  {
    key: "alerts",
    label: "保护与告警",
    fields: [
      { key: "workMode", label: "工作模式", unit: "", chartColor: "#f59e0b", showInChart: false },
      { key: "balanceState", label: "均衡状态", unit: "", chartColor: "#8b5cf6", showInChart: false },
      { key: "protection", label: "保护状态", unit: "", chartColor: "#ef4444", showInChart: false },
      { key: "alarm", label: "告警", unit: "", chartColor: "#f97316", showInChart: false },
    ],
  },
];

// Default chart fields: SOC, SOH, voltage, current
const DEFAULT_CHART_FIELDS = ["soc", "voltage"];

const BatteryDataTab = ({ sn = "BMS-000001" }: BatteryDataTabProps) => {
  const [startDate, setStartDate] = useState("2024-07-15");
  const [endDate, setEndDate] = useState("2024-07-15");
  const [chartFields, setChartFields] = useState<string[]>(DEFAULT_CHART_FIELDS);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["basic", "cell"]);
  const [currentPage, setCurrentPage] = useState(1);
  const TABLE_PAGE_SIZE = 8;

  // Chart field toggle
  const toggleChartField = (fieldKey: string) => {
    setChartFields((prev) =>
      prev.includes(fieldKey)
        ? prev.filter((k) => k !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  // All chartable fields
  const allChartableFields = FIELD_GROUPS.flatMap((g) => g.fields.filter((f) => f.showInChart));

  // Visible chart fields
  const visibleChartFields = allChartableFields.filter((f) => chartFields.includes(f.key));

  // Table columns: all fields from expanded groups + always show time
  const tableColumns = FIELD_GROUPS.flatMap((g) =>
    expandedGroups.includes(g.key) ? g.fields : []
  );

  const totalPages = Math.max(1, Math.ceil(ALL_DATA.length / TABLE_PAGE_SIZE));
  const pagedData = ALL_DATA.slice((currentPage - 1) * TABLE_PAGE_SIZE, currentPage * TABLE_PAGE_SIZE);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  console.log("[BatteryDataTab] sn:", sn, "chartFields:", chartFields.length, "tableColumns:", tableColumns.length);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 筛选栏 */}
      <div className="bg-card border-b border-border px-6 py-3 flex-shrink-0">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">开始日期：</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bms-input text-sm h-8 px-2"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">结束日期：</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bms-input text-sm h-8 px-2"
            />
          </div>
          <button className="bms-btn-primary flex items-center gap-1.5 h-8 px-4 text-sm">
            <Search size={13} /> 查询
          </button>
          <span className="ml-auto text-xs text-muted-foreground">
            共 <span className="text-foreground font-medium">{ALL_DATA.length}</span> 条数据
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* ===== 图表区域 ===== */}
        <div className="bg-card border-b border-border p-4 flex-shrink-0">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <BarChart2 size={14} className="text-primary" />
              数据趋势图
            </h3>
            <span className="text-xs text-muted-foreground">点击字段标签切换显示：</span>
            <div className="flex flex-wrap gap-1.5">
              {allChartableFields.map((f) => {
                const active = chartFields.includes(f.key);
                return (
                  <button
                    key={f.key}
                    onClick={() => toggleChartField(f.key)}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
                      active
                        ? "border-transparent text-primary-foreground font-medium"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                    style={active ? { backgroundColor: f.chartColor } : {}}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: active ? "rgba(255,255,255,0.8)" : f.chartColor }}
                    ></span>
                    {f.label}
                    {active && (
                      <X size={10} className="opacity-70" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {visibleChartFields.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={ALL_DATA} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={40} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {visibleChartFields.map((f) => (
                  <Line
                    key={f.key}
                    type="monotone"
                    dataKey={f.key}
                    name={`${f.label}${f.unit ? `(${f.unit})` : ""}`}
                    stroke={f.chartColor}
                    dot={false}
                    strokeWidth={1.5}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
              请选择至少一个字段以显示趋势图
            </div>
          )}
        </div>

        {/* ===== 字段分组控制 + 表格 ===== */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* 字段分组折叠控制栏 */}
          <div className="bg-muted/20 border-b border-border px-6 py-2 flex-shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium">表格字段分组：</span>
              {FIELD_GROUPS.map((g) => {
                const isExp = expandedGroups.includes(g.key);
                return (
                  <button
                    key={g.key}
                    onClick={() => toggleGroup(g.key)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-all font-medium ${
                      isExp
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {g.label}
                    {isExp ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  </button>
                );
              })}
              <span className="ml-auto text-xs text-muted-foreground">
                显示 <span className="text-foreground font-medium">{tableColumns.length}</span> 列
              </span>
            </div>
          </div>

          {/* 横向可滚动表格 */}
          <div className="flex-1 overflow-auto">
            <table className="min-w-max w-full">
              <thead className="sticky top-0 bg-card z-10 shadow-sm">
                {/* 分组表头 */}
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground text-left whitespace-nowrap bg-card border-r border-border sticky left-0 z-20">
                    时间
                  </th>
                  {FIELD_GROUPS.filter((g) => expandedGroups.includes(g.key)).map((g) => (
                    <th
                      key={g.key}
                      colSpan={g.fields.length}
                      className="px-4 py-2 text-xs font-semibold text-primary text-center whitespace-nowrap border-r border-border bg-primary/5"
                    >
                      {g.label}
                    </th>
                  ))}
                </tr>
                {/* 字段表头 */}
                <tr className="bms-table-header text-left">
                  <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap sticky left-0 bg-card z-20 border-r border-border">
                    时间
                  </th>
                  {tableColumns.map((col) => (
                    <th key={col.key} className="px-4 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
                      {col.label}
                      {col.unit && <span className="text-muted-foreground/60 ml-0.5">({col.unit})</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pagedData.map((row, i) => (
                  <tr key={i} className="hover:bg-muted/30 transition-colors text-sm">
                    <td className="px-4 py-2.5 font-mono text-xs text-foreground whitespace-nowrap sticky left-0 bg-card border-r border-border z-10">
                      {row.time}
                    </td>
                    {tableColumns.map((col) => {
                      const val = (row as Record<string, unknown>)[col.key];
                      const isNum = typeof val === "number";
                      // Highlight high/low values
                      let cellClass = "text-foreground";
                      if (col.key === "soc" && isNum) {
                        if ((val as number) < 20) cellClass = "text-destructive font-medium";
                        else if ((val as number) > 90) cellClass = "text-success font-medium";
                      }
                      if (col.key === "alarm" && val !== "无告警") cellClass = "text-warning font-medium";
                      if (col.key === "protection" && val !== "正常") cellClass = "text-destructive font-medium";
                      if (col.key === "balanceState" && val === "均衡中") cellClass = "text-primary font-medium";
                      return (
                        <td key={col.key} className={`px-4 py-2.5 text-xs whitespace-nowrap ${cellClass}`}>
                          {typeof val === "number"
                            ? isNaN(val) ? "-" : col.key === "chargeMos" || col.key === "dischargeMos"
                              ? (val === 1 ? (
                                <span className="px-1.5 py-0.5 rounded text-xs bg-success/10 text-success">ON</span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-xs bg-muted text-muted-foreground">OFF</span>
                              ))
                              : String(val)
                            : String(val ?? "-")}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-border flex items-center justify-between flex-shrink-0 bg-muted/10">
              <span className="text-xs text-muted-foreground">
                共 {ALL_DATA.length} 条，第 {currentPage}/{totalPages} 页
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-xs rounded border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  上一页
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                      currentPage === p
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-xs rounded border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatteryDataTab;
