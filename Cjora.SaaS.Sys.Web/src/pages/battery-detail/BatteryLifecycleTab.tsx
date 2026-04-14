import {
  Package, Users, CheckCircle2, RotateCcw, Wrench, Trash2,
  ArrowRight, Clock, User, FileText
} from "lucide-react";

// ---- 生命周期节点类型 ----
type LifecycleEventType =
  | "instock"
  | "assigned"
  | "inuse"
  | "returned"
  | "repairing"
  | "repaired"
  | "scrapped";

interface LifecycleEvent {
  id: string;
  type: LifecycleEventType;
  title: string;
  time: string;
  operator: string;
  remark: string;
  customer?: string;
  project?: string;
  group?: string;
}

// ---- Mock 数据 ----
const MOCK_LIFECYCLE: LifecycleEvent[] = [
  {
    id: "lc-001",
    type: "instock",
    title: "入库登记",
    time: "2024-01-10 09:30",
    operator: "仓管员 李明",
    remark: "首次入库，验收通过，SN贴标完成",
    customer: "",
    project: "",
  },
  {
    id: "lc-002",
    type: "assigned",
    title: "分配给客户",
    time: "2024-01-15 14:00",
    operator: "运营专员 王芳",
    remark: "分配至深圳储能科技有限公司，南山基站项目A",
    customer: "深圳储能科技有限公司",
    project: "深圳南山基站项目A",
  },
  {
    id: "lc-003",
    type: "inuse",
    title: "绑定投入使用",
    time: "2024-01-20 10:15",
    operator: "现场工程师 张伟",
    remark: "绑定至A区-01组，设备上线，BMS连接正常",
    customer: "深圳储能科技有限公司",
    project: "深圳南山基站项目A",
    group: "A区-01组",
  },
  {
    id: "lc-004",
    type: "returned",
    title: "设备归还",
    time: "2024-03-22 16:30",
    operator: "现场工程师 张伟",
    remark: "项目调整，设备解绑归还，SOH 91%，循环次数 89",
    customer: "深圳储能科技有限公司",
    project: "深圳南山基站项目A",
  },
  {
    id: "lc-005",
    type: "assigned",
    title: "再次分配",
    time: "2024-03-28 11:00",
    operator: "运营专员 王芳",
    remark: "转移至广州绿能新能源，广州天河换电站",
    customer: "广州绿能新能源",
    project: "广州天河换电站",
  },
  {
    id: "lc-006",
    type: "inuse",
    title: "绑定投入使用",
    time: "2024-04-01 09:00",
    operator: "现场工程师 陈磊",
    remark: "绑定至B区-03组，运行正常",
    customer: "广州绿能新能源",
    project: "广州天河换电站",
    group: "B区-03组",
  },
  {
    id: "lc-007",
    type: "returned",
    title: "设备归还",
    time: "2024-05-30 14:20",
    operator: "现场工程师 陈磊",
    remark: "BMS通信异常，提前归还维修。SOH 87%，循环次数 246",
  },
  {
    id: "lc-008",
    type: "repairing",
    title: "送修",
    time: "2024-06-02 10:00",
    operator: "运营专员 王芳",
    remark: "BMS通信模块故障，送至维修中心",
  },
  {
    id: "lc-009",
    type: "repaired",
    title: "维修完成·重新入库",
    time: "2024-06-08 15:30",
    operator: "维修工程师 刘洋",
    remark: "通信模块已更换，完成功能验证，重新入库待分配",
  },
];

// ---- 节点配置 ----
interface EventConfig {
  iconName: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  labelClass: string;
}

const EVENT_CONFIG: Record<LifecycleEventType, EventConfig> = {
  instock:   { iconName: "package",       colorClass: "text-primary",     bgClass: "bg-primary/10",     borderClass: "border-primary/30",     labelClass: "bg-primary/10 text-primary" },
  assigned:  { iconName: "users",         colorClass: "text-warning",     bgClass: "bg-warning/10",     borderClass: "border-warning/30",     labelClass: "bg-warning/10 text-warning-foreground" },
  inuse:     { iconName: "check-circle-2", colorClass: "text-success",    bgClass: "bg-success/10",     borderClass: "border-success/30",     labelClass: "bg-success/10 text-success" },
  returned:  { iconName: "rotate-ccw",    colorClass: "text-muted-foreground", bgClass: "bg-muted",   borderClass: "border-border",         labelClass: "bg-muted text-muted-foreground" },
  repairing: { iconName: "wrench",        colorClass: "text-destructive", bgClass: "bg-destructive/10", borderClass: "border-destructive/30", labelClass: "bg-destructive/10 text-destructive" },
  repaired:  { iconName: "package",       colorClass: "text-primary",     bgClass: "bg-primary/10",     borderClass: "border-primary/30",     labelClass: "bg-primary/10 text-primary" },
  scrapped:  { iconName: "trash-2",       colorClass: "text-muted-foreground", bgClass: "bg-muted",   borderClass: "border-border",         labelClass: "bg-muted text-muted-foreground" },
};

const EVENT_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  package: Package,
  users: Users,
  "check-circle-2": CheckCircle2,
  "rotate-ccw": RotateCcw,
  wrench: Wrench,
  "trash-2": Trash2,
};

const EVENT_TITLE_MAP: Record<LifecycleEventType, string> = {
  instock:   "已入库",
  assigned:  "已分配",
  inuse:     "使用中",
  returned:  "已归还",
  repairing: "维修中",
  repaired:  "已入库",
  scrapped:  "已报废",
};

interface BatteryLifecycleTabProps {
  sn?: string;
}

const BatteryLifecycleTab = ({ sn = "BMS-000001" }: BatteryLifecycleTabProps) => {
  const events = MOCK_LIFECYCLE;

  console.log("[BatteryLifecycleTab] sn:", sn);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">

        {/* 顶部状态流转图 */}
        <div className="bg-card rounded-xl border border-border shadow-custom p-5 mb-6">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
              <ArrowRight size={13} className="text-primary" />
            </div>
            生命周期状态流转
          </h3>
          <div className="flex items-center gap-0 flex-wrap">
            {[
              { label: "入库", status: "instock",   active: true },
              { label: "分配", status: "assigned",  active: true },
              { label: "使用中", status: "inuse",   active: true },
              { label: "已归还", status: "returned",active: true },
              { label: "维修中", status: "repairing",active: true },
              { label: "再入库", status: "repaired",active: true },
              { label: "报废", status: "scrapped",  active: false },
            ].map((step, i, arr) => {
              const cfg = EVENT_CONFIG[step.status as LifecycleEventType];
              return (
                <div key={step.status} className="flex items-center">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${step.active ? `${cfg.bgClass} ${cfg.borderClass} ${cfg.colorClass}` : "bg-muted border-border text-muted-foreground"}`}>
                    {(() => {
                      const Ic = EVENT_ICONS[cfg.iconName] || Package;
                      return <Ic size={11} />;
                    })()}
                    {step.label}
                  </div>
                  {i < arr.length - 1 && (
                    <ArrowRight size={13} className="mx-1 text-border flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">任意状态均可直接报废 · 已归还可重新分配或再入库</p>
        </div>

        {/* 时间轴 */}
        <div className="relative">
          {/* 竖线 */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border" style={{ marginLeft: "0px" }} />

          <div className="space-y-0">
            {events.map((event, index) => {
              const cfg = EVENT_CONFIG[event.type];
              const IconComp = EVENT_ICONS[cfg.iconName] || Package;
              const isLast = index === events.length - 1;

              return (
                <div key={event.id} className="relative flex gap-5">
                  {/* 时间轴节点 */}
                  <div className="flex-shrink-0 flex flex-col items-center" style={{ width: "48px" }}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border-2 z-10 ${cfg.bgClass} ${cfg.borderClass} shadow-custom`}>
                      <IconComp size={16} className={cfg.colorClass} />
                    </div>
                    {!isLast && <div className="flex-1 w-px bg-border mt-0" style={{ minHeight: "24px" }} />}
                  </div>

                  {/* 内容卡片 */}
                  <div className={`flex-1 bg-card rounded-xl border border-border shadow-custom p-4 ${isLast ? "mb-0" : "mb-4"}`}>
                    {/* 标题行 */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-foreground">{event.title}</h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bgClass} ${cfg.borderClass} ${cfg.colorClass}`}>
                          {EVENT_TITLE_MAP[event.type]}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
                        <Clock size={11} />
                        <span className="font-mono">{event.time}</span>
                      </div>
                    </div>

                    {/* 操作人 */}
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <User size={10} className="text-muted-foreground" />
                      </div>
                      <span className="text-xs text-muted-foreground">{event.operator}</span>
                    </div>

                    {/* 客户 / 项目 / 分组信息 */}
                    {(event.customer || event.project || event.group) && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3 p-2.5 bg-muted/30 rounded-lg border border-border">
                        {event.customer && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Users size={10} className="text-primary flex-shrink-0" />
                            <span className="text-muted-foreground">客户：</span>
                            <span className="text-foreground font-medium">{event.customer}</span>
                          </div>
                        )}
                        {event.project && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <FileText size={10} className="text-success flex-shrink-0" />
                            <span className="text-muted-foreground">项目：</span>
                            <span className="text-foreground font-medium">{event.project}</span>
                          </div>
                        )}
                        {event.group && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Package size={10} className="text-warning flex-shrink-0" />
                            <span className="text-muted-foreground">分组：</span>
                            <span className="text-foreground font-medium">{event.group}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 备注 */}
                    <div className="flex items-start gap-1.5">
                      <FileText size={11} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground leading-relaxed">{event.remark}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* 末尾提示 */}
            <div className="relative flex gap-5">
              <div className="flex-shrink-0" style={{ width: "48px" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center border-2 border-dashed border-border bg-muted">
                  <ArrowRight size={14} className="text-border" />
                </div>
              </div>
              <div className="flex-1 flex items-center pb-2">
                <p className="text-xs text-muted-foreground italic">当前最新状态 · 持续记录中...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatteryLifecycleTab;
