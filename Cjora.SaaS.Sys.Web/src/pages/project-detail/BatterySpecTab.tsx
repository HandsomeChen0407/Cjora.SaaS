import { Zap, Thermometer, Weight, Box, ChevronRight } from "lucide-react";

interface BatterySpecTabProps {
  projectId?: string;
}

const specGroups = [
  {
    title: "基本电气参数",
    icon: "zap",
    items: [
      { label: "标称电压", value: "48 V" },
      { label: "标称容量", value: "100 Ah" },
      { label: "标称能量", value: "4.8 kWh" },
      { label: "充电截止电压", value: "54.75 V" },
      { label: "放电截止电压", value: "40.0 V" },
      { label: "最大持续充电电流", value: "50 A (0.5C)" },
      { label: "最大持续放电电流", value: "100 A (1C)" },
      { label: "峰值放电电流", value: "200 A (30s)" },
      { label: "自放电率", value: "≤ 3% / 月" },
    ],
  },
  {
    title: "温度特性",
    icon: "thermometer",
    items: [
      { label: "工作温度（充电）", value: "0 ~ 45 °C" },
      { label: "工作温度（放电）", value: "-20 ~ 60 °C" },
      { label: "存储温度", value: "-30 ~ 35 °C" },
      { label: "最优工作温度", value: "25 ± 5 °C" },
      { label: "热失控触发温度", value: "≥ 130 °C" },
    ],
  },
  {
    title: "物理规格",
    icon: "box",
    items: [
      { label: "外形尺寸（L×W×H）", value: "440 × 150 × 220 mm" },
      { label: "单体电池规格", value: "磷酸铁锂 (LFP) 3.2V / 100Ah" },
      { label: "串并联结构", value: "15S1P" },
      { label: "重量", value: "约 28 kg" },
      { label: "外壳材质", value: "阳极氧化铝合金" },
      { label: "防护等级", value: "IP55" },
    ],
  },
  {
    title: "循环寿命与认证",
    icon: "weight",
    items: [
      { label: "循环寿命", value: "≥ 2000 次 (80% DoD)" },
      { label: "日历寿命", value: "≥ 10 年" },
      { label: "容量保持率", value: "≥ 80% @ 2000 次" },
      { label: "相关认证", value: "GB/T 36276-2018, UN38.3, IEC 62619" },
      { label: "安全标准", value: "UL 1973, CE, RoHS" },
    ],
  },
];

const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  zap: Zap,
  thermometer: Thermometer,
  box: Box,
  weight: Weight,
};

const BatterySpecTab = ({ projectId = "P001" }: BatterySpecTabProps) => {
  console.log("[BatterySpecTab] projectId:", projectId);

  return (
    <div data-cmp="BatterySpecTab" className="p-6 space-y-5">
      {/* 说明条 */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border rounded-lg px-4 py-2.5">
        <ChevronRight size={13} className="text-primary flex-shrink-0" />
        以下规格参数为本项目电池产品（磷酸铁锂 LFP-100Ah-48V）的技术规格，如需更新请联系技术支持。
      </div>

      <div className="flex flex-wrap gap-5">
        {specGroups.map((group) => {
          const IconComp = ICON_MAP[group.icon] || Zap;
          return (
            <div
              key={group.title}
              className="flex-1 min-w-72 bg-card rounded-xl border border-border shadow-custom overflow-hidden"
            >
              {/* 卡片头 */}
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/20">
                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <IconComp size={14} className="text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
              </div>
              {/* 参数行 */}
              <div className="divide-y divide-border">
                {group.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between px-5 py-2.5 hover:bg-muted/20 transition-colors">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className="text-xs font-medium text-foreground">{item.value}</span>
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

export default BatterySpecTab;
