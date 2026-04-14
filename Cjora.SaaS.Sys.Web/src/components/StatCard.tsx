import {
  TrendingUp,
  TrendingDown,
  Battery,
  Users,
  AlertTriangle,
  Activity,
  Cpu,
  CheckCircle,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface StatCardProps {
  title?: string;
  value?: string;
  unit?: string;
  trend?: string;
  trendUp?: boolean;
  iconName?: string;
  colorType?: string;
  momValue?: string;
  momUp?: boolean;
  yoyValue?: string;
  yoyUp?: boolean;
}

const iconMap: Record<string, React.FC<{ size?: number; className?: string }>> = {
  battery: Battery,
  users: Users,
  alert: AlertTriangle,
  activity: Activity,
  cpu: Cpu,
  check: CheckCircle,
  trending: TrendingUp,
};

const colorMap: Record<string, string> = {
  blue: "var(--primary)",
  green: "var(--success)",
  orange: "var(--warning)",
  red: "var(--destructive)",
  teal: "var(--chart-5)",
  purple: "#7c3aed",
};

const bgMap: Record<string, string> = {
  blue: "#e8f0fe",
  green: "#e6f7e6",
  orange: "#fff7e6",
  red: "#fff1f0",
  teal: "#e6fffb",
  purple: "#f5f3ff",
};

const StatCard = ({
  title = "统计项",
  value = "0",
  unit = "",
  trend = "",
  trendUp = true,
  iconName = "battery",
  colorType = "blue",
  momValue = "",
  momUp = true,
  yoyValue = "",
  yoyUp = true,
}: StatCardProps) => {
  const Icon = iconMap[iconName] || Battery;
  const color = colorMap[colorType] || colorMap["blue"];
  const bg = bgMap[colorType] || bgMap["blue"];

  const hasTrends = momValue || yoyValue;

  return (
    <div data-cmp="StatCard" className="bms-card flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-11 h-11 rounded-xl flex-shrink-0" style={{ background: bg }}>
          <Icon size={20} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">{title}</p>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-2xl font-bold text-foreground">{value}</span>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          </div>
        </div>
      </div>
      {(hasTrends || trend) && (
        <div className="border-t border-border pt-2.5 flex items-center gap-3">
          {trend && !hasTrends && (
            <div className="flex items-center gap-1">
              {trendUp ? (
                <TrendingUp size={12} style={{ color: "var(--success)" }} />
              ) : (
                <TrendingDown size={12} style={{ color: "var(--destructive)" }} />
              )}
              <span className="text-xs" style={{ color: trendUp ? "var(--success)" : "var(--destructive)" }}>
                {trend}
              </span>
            </div>
          )}
          {yoyValue && (
            <div className="flex items-center gap-1 flex-1">
              <span className="text-xs text-muted-foreground whitespace-nowrap">月同比</span>
              <span
                className="text-xs font-semibold flex items-center gap-0.5"
                style={{ color: yoyUp ? "var(--success)" : "var(--destructive)" }}
              >
                {yoyUp ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                {yoyValue}
              </span>
            </div>
          )}
          {momValue && (
            <div className="flex items-center gap-1 flex-1">
              <span className="text-xs text-muted-foreground whitespace-nowrap">月环比</span>
              <span
                className="text-xs font-semibold flex items-center gap-0.5"
                style={{ color: momUp ? "var(--success)" : "var(--destructive)" }}
              >
                {momUp ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                {momValue}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;
