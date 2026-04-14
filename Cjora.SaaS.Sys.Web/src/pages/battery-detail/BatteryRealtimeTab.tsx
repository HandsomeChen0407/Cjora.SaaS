import { useState } from "react";
import {
  Zap, Thermometer, Activity, Clock, Wifi, MapPin,
  ChevronDown, ChevronUp, Battery, Signal, Navigation
} from "lucide-react";

interface BatteryRealtimeTabProps {
  sn?: string;
}

// ---- Mock realtime data ----
const MOCK_REALTIME = {
  totalVoltage: "52.48",
  current: "-12.5",
  soc: 78,
  soh: 96,
  workStatus: "放电中",
  systemTime: "2024-07-15 14:32:10",
  runDuration: "3h 25min",
  // 单体电压 (16节)
  cellVoltages: [
    3.285, 3.282, 3.288, 3.286, 3.290, 3.284, 3.287, 3.283,
    3.289, 3.281, 3.286, 3.285, 3.288, 3.284, 3.286, 3.287,
  ],
  // 温度列表（NTC探头）
  temperatures: [28.5, 29.1, 28.8, 30.2, 29.5, 28.6],
  // MOS状态
  chargeMos: true,
  dischargeMos: true,
  preChargeMos: false,
  heatMos: false,
  // 设备状态
  pPlusVoltage: "52.50",
  pMinusVoltage: "0.02",
  onSwitch: true,
  buzzer: false,
  sleepReason: "-",
  workMode: "正常模式",
  // 通信与定位
  imei: "867654321012345",
  iccid: "89860317900012345678",
  signalStrength: "-78 dBm",
  gpsCount: 8,
  longitude: "114.057868",
  latitude: "22.543099",
  city: "深圳市南山区",
  speed: "0 km/h",
  lac: "2344",
  cid: "18920",
};

const StatusIndicator = ({ active = false, label = "" }: { active?: boolean; label?: string }) => (
  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${
    active
      ? "bg-success/10 border-success/30 text-success"
      : "bg-muted border-border text-muted-foreground"
  }`}>
    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? "bg-success" : "bg-muted-foreground/40"}`}></div>
    {label}
  </div>
);

const BatteryRealtimeTab = ({ sn = "BMS-000001" }: BatteryRealtimeTabProps) => {
  const [showAllCellV, setShowAllCellV] = useState(false);
  const [showAllTemp, setShowAllTemp] = useState(false);
  const data = MOCK_REALTIME;

  const maxCellV = Math.max(...data.cellVoltages);
  const minCellV = Math.min(...data.cellVoltages);
  const avgCellV = data.cellVoltages.reduce((a, b) => a + b, 0) / data.cellVoltages.length;
  const diffCellV = (maxCellV - minCellV).toFixed(3);

  const displayVoltages = showAllCellV ? data.cellVoltages : data.cellVoltages.slice(0, 8);
  const displayTemps = showAllTemp ? data.temperatures : data.temperatures.slice(0, 4);

  console.log("[BatteryRealtimeTab] sn:", sn);

  return (
    <div className="h-full overflow-y-auto p-6 space-y-4">

      {/* ===== 核心运行数据 ===== */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "总电压", value: `${data.totalVoltage} V`, icon: Zap, status: "normal" },
          { label: "电流", value: `${data.current} A`, icon: Activity, status: "normal" },
          { label: "SOC", value: `${data.soc}%`, icon: Battery, status: data.soc < 20 ? "warn" : "normal" },
          { label: "SOH", value: `${data.soh}%`, icon: Activity, status: data.soh < 80 ? "warn" : "normal" },
          { label: "工作状态", value: data.workStatus, icon: Activity, status: "active" },
          { label: "系统时间", value: data.systemTime, icon: Clock, status: "normal" },
          { label: "运行时长", value: data.runDuration, icon: Clock, status: "normal" },
        ].map((item) => {
          const IconComp = item.icon;
          const bgClass = item.status === "active"
            ? "bg-success/10 border-success/30"
            : item.status === "warn"
            ? "bg-warning/10 border-warning/30"
            : "bg-card border-border";
          const valueClass = item.status === "active"
            ? "text-success"
            : item.status === "warn"
            ? "text-warning"
            : "text-foreground";
          return (
            <div
              key={item.label}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-custom ${bgClass}`}
              style={{ minWidth: "160px", flex: "1 1 160px" }}
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <IconComp size={15} className="text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className={`text-sm font-bold ${valueClass}`}>{item.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-4">
        {/* ===== 单体电压列表 ===== */}
        <div className="flex-1 bg-card rounded-xl border border-border shadow-custom p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Zap size={14} className="text-primary" />
              单体电压
              <span className="text-xs font-normal text-muted-foreground">（{data.cellVoltages.length} 节）</span>
            </h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-success font-medium">最高: {maxCellV.toFixed(3)}V</span>
              <span className="text-warning font-medium">最低: {minCellV.toFixed(3)}V</span>
              <span className="text-muted-foreground">均值: {avgCellV.toFixed(3)}V</span>
              <span className="text-muted-foreground">压差: {diffCellV}V</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {displayVoltages.map((v, i) => {
              const isMax = v === maxCellV;
              const isMin = v === minCellV;
              return (
                <div
                  key={i}
                  className={`flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-lg border text-xs min-w-[68px] ${
                    isMax
                      ? "bg-success/10 border-success/30 text-success"
                      : isMin
                      ? "bg-warning/10 border-warning/30 text-warning"
                      : "bg-muted/30 border-border text-foreground"
                  }`}
                >
                  <span className="text-muted-foreground">#{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-mono font-bold">{v.toFixed(3)}</span>
                  <span className="text-muted-foreground/70">V</span>
                </div>
              );
            })}
          </div>
          {data.cellVoltages.length > 8 && (
            <button
              onClick={() => setShowAllCellV(!showAllCellV)}
              className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors py-1 border-t border-border"
            >
              {showAllCellV ? <><ChevronUp size={13} /> 收起</> : <><ChevronDown size={13} /> 展开全部 {data.cellVoltages.length} 节</>}
            </button>
          )}
        </div>

        {/* ===== 温度列表 ===== */}
        <div className="w-72 bg-card rounded-xl border border-border shadow-custom p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Thermometer size={14} className="text-primary" />
              温度
              <span className="text-xs font-normal text-muted-foreground">（{data.temperatures.length} 路）</span>
            </h3>
            <span className="text-xs text-muted-foreground">
              最高: {Math.max(...data.temperatures).toFixed(1)}°C
            </span>
          </div>
          <div className="space-y-2">
            {displayTemps.map((t, i) => {
              const ratio = (t - 20) / (45 - 20);
              const barW = Math.min(100, Math.max(0, ratio * 100));
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-10 flex-shrink-0">NTC{i + 1}</span>
                  <div className="flex-1 h-5 bg-muted rounded-md overflow-hidden relative">
                    <div
                      className="h-full rounded-md bg-primary/60 transition-all"
                      style={{ width: `${barW}%` }}
                    ></div>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-foreground">
                      {t.toFixed(1)}°C
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {data.temperatures.length > 4 && (
            <button
              onClick={() => setShowAllTemp(!showAllTemp)}
              className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors py-1 border-t border-border"
            >
              {showAllTemp ? <><ChevronUp size={13} /> 收起</> : <><ChevronDown size={13} /> 展开全部</>}
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        {/* ===== MOS 状态 ===== */}
        <div className="bg-card rounded-xl border border-border shadow-custom p-4" style={{ minWidth: "280px" }}>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
            <Activity size={14} className="text-primary" />
            MOS 状态
          </h3>
          <div className="flex flex-wrap gap-2">
            <StatusIndicator active={data.chargeMos} label="充电MOS" />
            <StatusIndicator active={data.dischargeMos} label="放电MOS" />
            <StatusIndicator active={data.preChargeMos} label="预充MOS" />
            <StatusIndicator active={data.heatMos} label="加热MOS" />
          </div>
        </div>

        {/* ===== 设备状态 ===== */}
        <div className="bg-card rounded-xl border border-border shadow-custom p-4" style={{ minWidth: "320px" }}>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
            <Zap size={14} className="text-primary" />
            设备状态
          </h3>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <div>
              <p className="text-xs text-muted-foreground">P+ 电压</p>
              <p className="text-sm font-medium text-foreground font-mono">{data.pPlusVoltage} V</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">P- 电压</p>
              <p className="text-sm font-medium text-foreground font-mono">{data.pMinusVoltage} V</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ON 档</p>
              <p className={`text-sm font-medium ${data.onSwitch ? "text-success" : "text-muted-foreground"}`}>
                {data.onSwitch ? "开启" : "关闭"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">蜂鸣</p>
              <p className={`text-sm font-medium ${data.buzzer ? "text-warning" : "text-muted-foreground"}`}>
                {data.buzzer ? "报警中" : "静音"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">休眠原因</p>
              <p className="text-sm font-medium text-foreground">{data.sleepReason}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">工作模式</p>
              <p className="text-sm font-medium text-primary">{data.workMode}</p>
            </div>
          </div>
        </div>

        {/* ===== 通信与定位 ===== */}
        <div className="flex-1 bg-card rounded-xl border border-border shadow-custom p-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
            <Wifi size={14} className="text-primary" />
            通信与定位
          </h3>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Signal size={9} />信号强度</p>
              <p className="text-sm font-medium text-foreground font-mono">{data.signalStrength}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Navigation size={9} />GPS 星数</p>
              <p className="text-sm font-medium text-foreground">{data.gpsCount} 颗</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={9} />经度</p>
              <p className="text-sm font-medium text-foreground font-mono">{data.longitude}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={9} />纬度</p>
              <p className="text-sm font-medium text-foreground font-mono">{data.latitude}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">城市</p>
              <p className="text-sm font-medium text-foreground">{data.city}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">速度</p>
              <p className="text-sm font-medium text-foreground">{data.speed}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">LAC</p>
              <p className="text-sm font-medium text-foreground font-mono">{data.lac}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">CID</p>
              <p className="text-sm font-medium text-foreground font-mono">{data.cid}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">IMEI</p>
              <p className="text-sm font-medium text-foreground font-mono text-xs">{data.imei}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ICCID</p>
              <p className="text-sm font-medium text-foreground font-mono text-xs">{data.iccid}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatteryRealtimeTab;
