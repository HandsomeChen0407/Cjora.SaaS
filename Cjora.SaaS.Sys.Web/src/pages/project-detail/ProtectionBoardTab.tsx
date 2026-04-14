import { ShieldCheck, Cpu, Zap, Thermometer, AlertTriangle, CheckCircle } from "lucide-react";

interface ProtectionBoardTabProps {
  projectId?: string;
}

const protectionParams = [
  {
    category: "过充保护",
    icon: "zap",
    color: "destructive",
    items: [
      { label: "单体过充检测电压", value: "3.65 V", tolerance: "± 30 mV" },
      { label: "单体过充保护恢复电压", value: "3.50 V", tolerance: "± 50 mV" },
      { label: "过充检测延时", value: "1 s", tolerance: "± 0.2 s" },
    ],
  },
  {
    category: "过放保护",
    icon: "zap",
    color: "warning",
    items: [
      { label: "单体过放检测电压", value: "2.50 V", tolerance: "± 50 mV" },
      { label: "单体过放保护恢复电压", value: "2.80 V", tolerance: "± 50 mV" },
      { label: "过放检测延时", value: "200 ms", tolerance: "± 50 ms" },
    ],
  },
  {
    category: "过流保护",
    icon: "shield",
    color: "primary",
    items: [
      { label: "充电过流检测值 (OCC)", value: "55 A", tolerance: "± 3 A" },
      { label: "放电过流检测值 I (OCD1)", value: "120 A", tolerance: "± 5 A" },
      { label: "放电过流检测值 II (OCD2)", value: "200 A", tolerance: "± 10 A" },
      { label: "短路保护关断时间", value: "< 200 µs", tolerance: "-" },
      { label: "过流检测延时 (OCC/OCD1)", value: "100 ms", tolerance: "± 20 ms" },
    ],
  },
  {
    category: "温度保护",
    icon: "thermometer",
    color: "destructive",
    items: [
      { label: "充电过温保护 (CHG OTP)", value: "50 °C", tolerance: "± 2 °C" },
      { label: "充电过温恢复", value: "45 °C", tolerance: "± 2 °C" },
      { label: "放电过温保护 (DSG OTP)", value: "65 °C", tolerance: "± 2 °C" },
      { label: "放电过温恢复", value: "60 °C", tolerance: "± 2 °C" },
      { label: "充电低温保护 (CHG UTP)", value: "-5 °C", tolerance: "± 3 °C" },
      { label: "充电低温恢复", value: "0 °C", tolerance: "± 3 °C" },
    ],
  },
];

const bmsParams = [
  { label: "主控芯片", value: "TI BQ76952" },
  { label: "均衡方式", value: "被动均衡（电阻耗散型）" },
  { label: "均衡开启电压差", value: "≥ 20 mV" },
  { label: "均衡电流", value: "100 mA @ 3.2V" },
  { label: "SOC 估算算法", value: "库伦积分法 + EKF 修正" },
  { label: "SOC 估算精度", value: "≤ ± 5%" },
  { label: "SOH 估算精度", value: "≤ ± 8%" },
  { label: "通信接口", value: "CAN 2.0B / RS485 (MODBUS RTU)" },
  { label: "通信波特率", value: "CAN: 250kbps / RS485: 9600~115200" },
  { label: "采样精度（电压）", value: "± 5 mV" },
  { label: "采样精度（温度）", value: "± 1 °C" },
  { label: "采样精度（电流）", value: "± 0.5 A" },
  { label: "工作电压范围", value: "6 ~ 60 V" },
  { label: "静态功耗", value: "≤ 30 mW" },
  { label: "工作温度范围", value: "-40 ~ 85 °C" },
];

const COLOR_MAP: Record<string, string> = {
  destructive: "bg-destructive/10 text-destructive",
  warning: "bg-warning/10 text-warning",
  primary: "bg-primary/10 text-primary",
};
const BORDER_MAP: Record<string, string> = {
  destructive: "border-destructive/30",
  warning: "border-warning/30",
  primary: "border-primary/30",
};
const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  zap: Zap,
  shield: ShieldCheck,
  thermometer: Thermometer,
};

const ProtectionBoardTab = ({ projectId = "P001" }: ProtectionBoardTabProps) => {
  console.log("[ProtectionBoardTab] projectId:", projectId);

  return (
    <div data-cmp="ProtectionBoardTab" className="p-6 space-y-5">
      {/* BMS芯片参数卡 */}
      <div className="bg-card rounded-xl border border-border shadow-custom overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/20">
          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Cpu size={14} className="text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">BMS 保护板综合规格</h3>
          <span className="ml-auto flex items-center gap-1 text-xs text-success font-medium">
            <CheckCircle size={12} /> 通过认证
          </span>
        </div>
        <div className="flex flex-wrap">
          {bmsParams.map((p, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between px-5 py-2.5 hover:bg-muted/20 transition-colors border-b border-border"
              style={{ flexBasis: "50%", minWidth: 260 }}
            >
              <span className="text-xs text-muted-foreground">{p.label}</span>
              <span className="text-xs font-medium text-foreground font-mono">{p.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 保护阈值卡 */}
      <div className="flex flex-wrap gap-5">
        {protectionParams.map((group) => {
          const IconComp = ICON_MAP[group.icon] || ShieldCheck;
          return (
            <div
              key={group.category}
              className={`flex-1 min-w-56 bg-card rounded-xl border shadow-custom overflow-hidden ${BORDER_MAP[group.color] || "border-border"}`}
            >
              <div className={`flex items-center gap-2 px-5 py-3 border-b ${BORDER_MAP[group.color] || "border-border"}`}>
                <span className={`w-6 h-6 rounded flex items-center justify-center ${COLOR_MAP[group.color] || ""}`}>
                  <IconComp size={13} />
                </span>
                <h4 className="text-sm font-semibold text-foreground">{group.category}</h4>
                <AlertTriangle size={12} className={group.color === "destructive" ? "text-destructive ml-auto" : "text-warning ml-auto"} />
              </div>
              <div className="divide-y divide-border">
                {group.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-2.5 hover:bg-muted/20 transition-colors">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-foreground">{item.value}</span>
                      {item.tolerance !== "-" && (
                        <span className="text-xs text-muted-foreground font-mono">{item.tolerance}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProtectionBoardTab;
