import {
  User, FolderOpen, Cpu, Zap, Info, Server, QrCode,
  FileText, RefreshCw, MapPin, Calendar, Clock, BarChart2,
  Battery, Thermometer, Hash
} from "lucide-react";

interface BatteryBasicInfoTabProps {
  sn?: string;
  model?: string;
  projectId?: string;
}

// ---- Mock data ----
const MOCK_BASIC = {
  // 客户与项目
  customerName: "深圳储能科技有限公司",
  customerId: "C001",
  projectName: "深圳储能基站项目A",
  projectId: "P001",
  projectLocation: "深圳市南山区科技园",
  installDate: "2023-05-12",
  // 电池规格
  cellType: "磷酸铁锂（LFP）",
  seriesCount: 16,
  parallelCount: 1,
  ratedCapacity: "100 Ah",
  ratedVoltage: "51.2 V",
  ratedEnergy: "5.12 kWh",
  minCellVoltage: "2.5 V",
  maxCellVoltage: "3.65 V",
  nominalCellVoltage: "3.2 V",
  // BMS信息
  hwid: "HWID-BMS-A1-20230501",
  deviceModel: "BMS-S16-V3",
  imei: "867654321012345",
  iccid: "89860317900012345678",
  firmwareVersion: "V3.2.1",
  hardwareVersion: "HW2.0",
  factoryDate: "2023-04-20",
  factorySn: "FAC-2023-04-00123",
  // 累计统计
  cycleCount: 312,
  totalMileage: "18,540 km",
  totalChargeTime: "1,240 h",
  totalDischargeTime: "1,180 h",
  totalChargeEnergy: "1,624 kWh",
  totalDischargeEnergy: "1,510 kWh",
  onlineRate: "98.3%",
  totalOnlineDays: 287,
};

interface InfoItemProps {
  label: string;
  value: string;
  mono?: boolean;
}

const InfoItem = ({ label = "", value = "-", mono = false }: InfoItemProps) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={`text-sm font-medium text-foreground ${mono ? "font-mono" : ""}`}>{value || "-"}</span>
  </div>
);

interface SectionProps {
  title: string;
  iconName: string;
}

const sectionIcons: Record<string, React.FC<{ size?: number; className?: string }>> = {
  user: User,
  cpu: Cpu,
  server: Server,
  "bar-chart-2": BarChart2,
};

const Section = ({ title = "", iconName = "info" }: SectionProps) => {
  const IconComp = sectionIcons[iconName] || Info;
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
        <IconComp size={14} className="text-primary" />
      </div>
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      <div className="flex-1 h-px bg-border"></div>
    </div>
  );
};

const BatteryBasicInfoTab = ({
  sn = "BMS-000001",
  model = "LFP-100Ah-48V",
  projectId = "P001",
}: BatteryBasicInfoTabProps) => {
  const data = { ...MOCK_BASIC, projectId };

  console.log("[BatteryBasicInfoTab] sn:", sn, "model:", model);

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">

      {/* ===== 客户与项目基础信息 ===== */}
      <div className="bg-card rounded-xl border border-border shadow-custom p-5">
        <Section title="客户与项目信息" iconName="user" />
        <div className="flex flex-wrap gap-6">
          <div className="flex-1" style={{ minWidth: "180px" }}>
            <InfoItem label="客户名称" value={data.customerName} />
          </div>
          <div className="flex-1" style={{ minWidth: "120px" }}>
            <InfoItem label="客户编号" value={data.customerId} mono />
          </div>
          <div className="flex-1" style={{ minWidth: "180px" }}>
            <InfoItem label="所属项目" value={data.projectName} />
          </div>
          <div className="flex-1" style={{ minWidth: "120px" }}>
            <InfoItem label="项目编号" value={data.projectId} mono />
          </div>
          <div className="flex-1" style={{ minWidth: "200px" }}>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={10} /> 安装地址</span>
              <span className="text-sm font-medium text-foreground">{data.projectLocation}</span>
            </div>
          </div>
          <div className="flex-1" style={{ minWidth: "140px" }}>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar size={10} /> 安装日期</span>
              <span className="text-sm font-medium text-foreground">{data.installDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 电池规格参数 ===== */}
      <div className="bg-card rounded-xl border border-border shadow-custom p-5">
        <Section title="电池规格参数" iconName="cpu" />
        <div className="flex flex-wrap gap-x-8 gap-y-5">
          <div style={{ minWidth: "140px" }}>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Battery size={10} /> 电芯类型</span>
              <span className="text-sm font-medium text-foreground">{data.cellType}</span>
            </div>
          </div>
          <div style={{ minWidth: "100px" }}>
            <InfoItem label="串联数" value={`${data.seriesCount} S`} />
          </div>
          <div style={{ minWidth: "100px" }}>
            <InfoItem label="并联数" value={`${data.parallelCount} P`} />
          </div>
          <div style={{ minWidth: "120px" }}>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Zap size={10} /> 额定容量</span>
              <span className="text-sm font-medium text-foreground">{data.ratedCapacity}</span>
            </div>
          </div>
          <div style={{ minWidth: "120px" }}>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Zap size={10} /> 额定电压</span>
              <span className="text-sm font-medium text-foreground">{data.ratedVoltage}</span>
            </div>
          </div>
          <div style={{ minWidth: "120px" }}>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Zap size={10} /> 额定能量</span>
              <span className="text-sm font-medium text-foreground">{data.ratedEnergy}</span>
            </div>
          </div>
          <div style={{ minWidth: "140px" }}>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Thermometer size={10} /> 单体最低电压</span>
              <span className="text-sm font-medium text-foreground">{data.minCellVoltage}</span>
            </div>
          </div>
          <div style={{ minWidth: "140px" }}>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Thermometer size={10} /> 单体最高电压</span>
              <span className="text-sm font-medium text-foreground">{data.maxCellVoltage}</span>
            </div>
          </div>
          <div style={{ minWidth: "140px" }}>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Thermometer size={10} /> 单体标称电压</span>
              <span className="text-sm font-medium text-foreground">{data.nominalCellVoltage}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== BMS信息 ===== */}
      <div className="bg-card rounded-xl border border-border shadow-custom p-5">
        <Section title="BMS 信息" iconName="server" />
        <div className="flex flex-wrap gap-x-8 gap-y-5">
          <div style={{ minWidth: "220px" }}>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Hash size={10} /> HWID</span>
              <span className="text-sm font-medium text-foreground font-mono">{data.hwid}</span>
            </div>
          </div>
          <div style={{ minWidth: "160px" }}>
            <InfoItem label="设备型号" value={data.deviceModel} mono />
          </div>
          <div style={{ minWidth: "180px" }}>
            <InfoItem label="IMEI" value={data.imei} mono />
          </div>
          <div style={{ minWidth: "220px" }}>
            <InfoItem label="ICCID" value={data.iccid} mono />
          </div>
          <div style={{ minWidth: "130px" }}>
            <InfoItem label="软件版本" value={data.firmwareVersion} mono />
          </div>
          <div style={{ minWidth: "130px" }}>
            <InfoItem label="硬件版本" value={data.hardwareVersion} mono />
          </div>
          <div style={{ minWidth: "130px" }}>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar size={10} /> 出厂日期</span>
              <span className="text-sm font-medium text-foreground">{data.factoryDate}</span>
            </div>
          </div>
          <div style={{ minWidth: "200px" }}>
            <InfoItem label="出厂序列号" value={data.factorySn} mono />
          </div>
        </div>

        {/* 功能入口按钮 */}
        <div className="mt-5 pt-4 border-t border-border flex gap-3 flex-wrap">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-muted/30 hover:bg-muted text-sm text-foreground transition-colors">
            <FileText size={14} className="text-primary" />
            查看报告
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-muted/30 hover:bg-muted text-sm text-foreground transition-colors">
            <QrCode size={14} className="text-primary" />
            二维码
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-muted/30 hover:bg-muted text-sm text-foreground transition-colors">
            <RefreshCw size={14} className="text-primary" />
            刷新BMS数据
          </button>
        </div>
      </div>

      {/* ===== 累计统计信息 ===== */}
      <div className="bg-card rounded-xl border border-border shadow-custom p-5">
        <Section title="累计统计信息" iconName="bar-chart-2" />
        <div className="flex flex-wrap gap-4">
          {[
            { label: "循环次数", value: `${data.cycleCount} 次`, icon: RefreshCw, color: "text-primary bg-primary/10" },
            { label: "累计里程", value: data.totalMileage, icon: MapPin, color: "text-success bg-success/10" },
            { label: "累计充电时长", value: data.totalChargeTime, icon: Clock, color: "text-primary bg-primary/10" },
            { label: "累计放电时长", value: data.totalDischargeTime, icon: Clock, color: "text-warning bg-warning/10" },
            { label: "累计充电能量", value: data.totalChargeEnergy, icon: Zap, color: "text-primary bg-primary/10" },
            { label: "累计放电能量", value: data.totalDischargeEnergy, icon: Zap, color: "text-success bg-success/10" },
            { label: "在线率", value: data.onlineRate, icon: BarChart2, color: "text-success bg-success/10" },
            { label: "累计在线天数", value: `${data.totalOnlineDays} 天`, icon: Calendar, color: "text-primary bg-primary/10" },
          ].map((item) => {
            const IconComp = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
                style={{ minWidth: "160px", flex: "1 1 160px" }}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${item.color}`}>
                  <IconComp size={16} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-bold text-foreground">{item.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BatteryBasicInfoTab;
