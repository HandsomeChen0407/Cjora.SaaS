import { useState } from "react";
import {
  ArrowLeft, Battery, Activity, MapPin, AlertTriangle,
  BarChart2, Info, Cpu, Wifi, GitBranch
} from "lucide-react";
import BatteryBasicInfoTab from "./battery-detail/BatteryBasicInfoTab";
import BatteryRealtimeTab from "./battery-detail/BatteryRealtimeTab";
import BatteryTrackTab from "./battery-detail/BatteryTrackTab";
import BatteryFaultTab from "./battery-detail/BatteryFaultTab";
import BatteryDataTab from "./battery-detail/BatteryDataTab";
import BatteryLifecycleTab from "./battery-detail/BatteryLifecycleTab";
import { STATUS_CONFIG, BatteryStatus } from "./BatteryArchivePage";

interface BatteryDetailPageProps {
  sn?: string;
  model?: string;
  projectId?: string;
  status?: string;
  assetStatus?: BatteryStatus;
  onBack?: () => void;
}

type TabKey = "basic" | "realtime" | "track" | "fault" | "data" | "lifecycle";

interface TabItem {
  key: TabKey;
  label: string;
  iconName: string;
}

const TABS: TabItem[] = [
  { key: "basic",      label: "基本信息",  iconName: "info" },
  { key: "realtime",   label: "实时状态",  iconName: "activity" },
  { key: "lifecycle",  label: "生命周期",  iconName: "git-branch" },
  { key: "track",      label: "运行轨迹",  iconName: "map-pin" },
  { key: "fault",      label: "故障历史",  iconName: "alert-triangle" },
  { key: "data",       label: "电池数据",  iconName: "bar-chart-2" },
];

const TAB_ICONS: Record<TabKey, React.FC<{ size?: number; className?: string }>> = {
  basic:     Info,
  realtime:  Activity,
  lifecycle: GitBranch,
  track:     MapPin,
  fault:     AlertTriangle,
  data:      BarChart2,
};

const BatteryDetailPage = ({
  sn = "BMS-000001",
  model = "LFP-100Ah-48V",
  projectId = "P001",
  status = "online",
  assetStatus,
  onBack,
}: BatteryDetailPageProps) => {
  const [activeTab, setActiveTab] = useState<TabKey>("basic");

  // 设备在线状态
  const onlineColorMap: Record<string, string> = {
    online:  "text-success bg-success/10 border-success/30",
    alarm:   "text-warning bg-warning/10 border-warning/30",
    offline: "text-muted-foreground bg-muted border-border",
  };
  const onlineLabelMap: Record<string, string> = {
    online:  "在线",
    alarm:   "告警",
    offline: "离线",
  };

  // 资产状态（从电池档案带过来）
  const assetCfg = assetStatus ? STATUS_CONFIG[assetStatus] : null;

  console.log("[BatteryDetailPage] sn:", sn, "model:", model, "tab:", activeTab, "assetStatus:", assetStatus);

  return (
    <div
      data-cmp="BatteryDetailPage"
      className="flex flex-col h-full bg-background"
    >
      {/* ===== 顶部头部 ===== */}
      <div className="bg-card border-b border-border px-6 py-3 flex-shrink-0 shadow-custom">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 -ml-2 rounded-full hover:bg-muted text-muted-foreground transition-colors flex-shrink-0"
              title="返回"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Battery size={18} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-foreground font-mono">{sn}</h2>
                {/* 设备在线状态 */}
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${onlineColorMap[status] || onlineColorMap.offline}`}>
                  {onlineLabelMap[status] || "未知"}
                </span>
                {/* 资产状态 */}
                {assetCfg && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 status-${assetCfg.badge}`}>
                    {assetCfg.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                <Cpu size={11} />
                <span>{model || "LFP-100Ah-48V"}</span>
                <span className="w-1 h-1 rounded-full bg-border inline-block"></span>
                <Wifi size={11} />
                <span>BMS设备详情</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Tab 导航 ===== */}
      <div className="bg-card border-b border-border px-6 flex-shrink-0">
        <div className="flex items-center gap-0">
          {TABS.map((tab) => {
            const IconComp = TAB_ICONS[tab.key];
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors relative ${
                  isActive
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground hover:border-border"
                }`}
              >
                <IconComp size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== Tab 内容 ===== */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "basic"     && <BatteryBasicInfoTab sn={sn} model={model} projectId={projectId} />}
        {activeTab === "realtime"  && <BatteryRealtimeTab sn={sn} />}
        {activeTab === "lifecycle" && <BatteryLifecycleTab sn={sn} />}
        {activeTab === "track"     && <BatteryTrackTab sn={sn} />}
        {activeTab === "fault"     && <BatteryFaultTab sn={sn} />}
        {activeTab === "data"      && <BatteryDataTab sn={sn} />}
      </div>
    </div>
  );
};

export default BatteryDetailPage;
