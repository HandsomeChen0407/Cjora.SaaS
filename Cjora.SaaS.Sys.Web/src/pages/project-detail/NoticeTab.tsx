import { AlertTriangle, ShieldAlert, Info, Flame, Zap, ThumbsUp } from "lucide-react";

interface NoticeTabProps {
  projectId?: string;
}

type NoticeLevel = "danger" | "warning" | "info" | "tip";

interface NoticeItem {
  level: NoticeLevel;
  title: string;
  points: string[];
}

const notices: NoticeItem[] = [
  {
    level: "danger",
    title: "严禁事项（违规将导致电池损毁或安全事故）",
    points: [
      `严禁过充：充电电压超过54.75V将永久损害电池并存在热失控风险，请确认充电设备截止电压设置正确。`,
      `严禁短路：正负极短路将导致瞬间大电流及严重发热，请在断电状态下操作接线。`,
      `严禁反接：正负极接反将损坏BMS保护板及外接设备，安装前请用万用表确认极性。`,
      `严禁拆解：非授权人员禁止拆卸电池壳体或BMS模块，否则将失去质保并存在人身安全风险。`,
      `严禁明火：禁止在电池附近吸烟或进行焊接作业，周围1米范围内不得有明火。`,
      `严禁水浸：电池防护等级为IP55，不得在浸水环境中使用或存储，雨水渗入将导致绝缘失效。`,
    ],
  },
  {
    level: "warning",
    title: "安全警告（可能影响电池寿命与系统稳定性）",
    points: [
      `避免深度放电：长期将SOC放至5%以下将加速电池容量衰减，建议设置放电截止SOC ≥ 10%。`,
      `避免高温存储：长期存储温度不应超过35°C，超过45°C将加剧电解液老化。`,
      `避免大电流急充：在低温（<5°C）环境下禁止以大于0.2C的电流充电，否则将导致锂枝晶析出。`,
      `避免长期亏电存储：若电池需停用超过1个月，请将SOC维持在40~60%区间，并每3个月补充一次电。`,
      `注意安装环境通风：电池机柜内部需保证良好通风，进出风口不得堵塞，环境温度须≤40°C。`,
      `注意绝缘检测：首次上电前及每次维护后，需用绝缘电阻表（1000V）检测绝缘电阻，≥10MΩ为合格。`,
    ],
  },
  {
    level: "info",
    title: "操作规范（现场安装与运维人员必读）",
    points: [
      `上电顺序：先连接通信线与保护接地，再连接正负极动力线，最后闭合外部开关。`,
      `断电顺序：先断开外部开关，再拆除动力线，最后拆卸通信线。`,
      `力矩要求：动力端子螺栓紧固力矩为 6 N·m，通信端子为 0.5 N·m，请使用扭力扳手操作。`,
      `接地要求：电池柜机壳须可靠接大地，接地电阻 ≤ 4Ω，不得以中性线代替地线。`,
      `并联注意：多台电池并联时，各台SOC差异需控制在 ±5% 以内，否则将产生均流问题。`,
      `日志记录：每次现场维护后须在系统内记录操作记录，包括操作内容、操作人、操作时间。`,
    ],
  },
  {
    level: "tip",
    title: "使用建议（延长电池寿命的最佳实践）",
    points: [
      `建议日常使用SOC范围控制在20%~90%，减少满充满放次数，可有效延长循环寿命30%以上。`,
      `建议每月执行一次满充放校准（100%充至截止，再放至截止），以校正SOC估算误差。`,
      `建议电池室温保持在15~25°C，这是磷酸铁锂电池性能最优的工作温度区间。`,
      `建议定期检查电池端子螺栓紧固情况，每3个月巡检一次，防止因振动导致接触不良。`,
      `建议通过BMS云平台定期关注电池健康度（SOH）趋势，当SOH低于85%时考虑预防性维护。`,
    ],
  },
];

const LEVEL_CONFIG: Record<NoticeLevel, {
  bgClass: string;
  borderClass: string;
  titleClass: string;
  iconComp: React.FC<{ size?: number; className?: string }>;
  iconClass: string;
  dotClass: string;
}> = {
  danger: {
    bgClass: "bg-destructive/5",
    borderClass: "border-destructive/30",
    titleClass: "text-destructive",
    iconComp: Flame,
    iconClass: "text-destructive",
    dotClass: "bg-destructive",
  },
  warning: {
    bgClass: "bg-warning/5",
    borderClass: "border-warning/30",
    titleClass: "text-warning",
    iconComp: AlertTriangle,
    iconClass: "text-warning",
    dotClass: "bg-warning",
  },
  info: {
    bgClass: "bg-primary/5",
    borderClass: "border-primary/20",
    titleClass: "text-primary",
    iconComp: ShieldAlert,
    iconClass: "text-primary",
    dotClass: "bg-primary",
  },
  tip: {
    bgClass: "bg-success/5",
    borderClass: "border-success/30",
    titleClass: "text-success",
    iconComp: ThumbsUp,
    iconClass: "text-success",
    dotClass: "bg-success",
  },
};

const NoticeTab = ({ projectId = "P001" }: NoticeTabProps) => {
  console.log("[NoticeTab] projectId:", projectId);

  return (
    <div data-cmp="NoticeTab" className="p-6 space-y-5">
      {/* 顶部提示横幅 */}
      <div className="flex items-start gap-3 bg-destructive/8 border border-destructive/25 rounded-xl px-5 py-4">
        <Zap size={16} className="text-destructive flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-destructive mb-1">安全警示 — 请在操作前仔细阅读全部注意事项</p>
          <p className="text-xs text-foreground opacity-80">
            本页内容适用于项目所有现场工程师及运维人员。违反严禁事项可能导致人员伤亡或重大财产损失，对本项目使用的 LFP-100Ah-48V 磷酸铁锂电池组及 BMS 系统具有法律约束力。
          </p>
        </div>
      </div>

      {/* 注意事项卡片 */}
      <div className="space-y-4">
        {notices.map((notice) => {
          const cfg = LEVEL_CONFIG[notice.level];
          const IconComp = cfg.iconComp;
          return (
            <div
              key={notice.level}
              className={`rounded-xl border shadow-custom overflow-hidden ${cfg.bgClass} ${cfg.borderClass}`}
            >
              {/* 卡片头 */}
              <div className={`flex items-center gap-2.5 px-5 py-3 border-b ${cfg.borderClass}`}>
                <IconComp size={15} className={cfg.iconClass} />
                <h3 className={`text-sm font-bold ${cfg.titleClass}`}>{notice.title}</h3>
              </div>
              {/* 条目 */}
              <div className="px-5 py-4 space-y-2.5">
                {notice.points.map((point, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass} flex-shrink-0 mt-1.5`}></span>
                    <p className="text-xs text-foreground leading-relaxed">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部声明 */}
      <div className="flex items-start gap-3 bg-muted/50 border border-border rounded-xl px-5 py-4">
        <Info size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          本注意事项由技术支持部门依据 GB/T 36276-2018、IEC 62619 及制造商操作手册整理，最后更新于 2024-01-15。
          如有疑问请联系技术支持：support@bms-iot.com | 400-XXX-XXXX
        </p>
      </div>
    </div>
  );
};

export default NoticeTab;
