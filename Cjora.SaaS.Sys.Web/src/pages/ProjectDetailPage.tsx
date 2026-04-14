import React, { useState } from "react";
import {
  ArrowLeft, ArrowUpRight, Download, MapPin, Target, Users, Server,
  FileSignature, Layers, ShieldAlert, BadgeInfo,
  Check, Battery, Zap, ShieldCheck, FileText, Package, AlertTriangle,
  ExternalLink, Info, Eye, X, GitBranch, Plus, ArrowRight,
  Clock, CheckCircle, XCircle, FilePlus, AlertCircle
} from "lucide-react";
import StatCard from "../components/StatCard";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectDetailPageProps {
  projectId?: string;
  onBack?: () => void;
  onNavigateToCustomer?: () => void;
  onNavigateToContract?: () => void;
  onNavigateToBatteryModel?: () => void;
  onNavigateToProtectionBoard?: () => void;
  onNavigateToDeviceGroup?: (projectId: string, projectName: string, customerId: string) => void;
}

type ProjectStatus = 'draft' | 'pending' | 'approved' | 'active' | 'paused' | 'ended' | 'closed';

const STATUS_LABEL: Record<ProjectStatus, string> = {
  draft: '草稿',
  pending: '待审批',
  approved: '已立项',
  active: '进行中',
  paused: '已暂停',
  ended: '已结束',
  closed: '已关闭',
};

const STATUS_COLOR: Record<ProjectStatus, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-blue-50 text-blue-700 border-blue-200',
  active: 'bg-green-50 text-green-700 border-green-200',
  paused: 'bg-orange-50 text-orange-600 border-orange-200',
  ended: 'bg-slate-100 text-slate-500 border-slate-200',
  closed: 'bg-red-50 text-red-500 border-red-200',
};

// ─── 变更管理 Types ─────────────────────────────────────────────────────────

type ChangeType = 'product' | 'quantity' | 'timeline' | 'other';
type ChangeStatus = 'pending-approval' | 'approved' | 'rejected' | 'effective';

const CHANGE_TYPE_LABEL: Record<ChangeType, string> = {
  product: '产品变更',
  quantity: '数量变更',
  timeline: '时间变更',
  other: '其他变更',
};

const CHANGE_TYPE_COLOR: Record<ChangeType, string> = {
  product: 'bg-purple-50 text-purple-700 border-purple-200',
  quantity: 'bg-blue-50 text-blue-700 border-blue-200',
  timeline: 'bg-orange-50 text-orange-600 border-orange-200',
  other: 'bg-slate-100 text-slate-600 border-slate-200',
};

const CHANGE_STATUS_LABEL: Record<ChangeStatus, string> = {
  'pending-approval': '待审批',
  approved: '审批通过',
  rejected: '已驳回',
  effective: '已生效',
};

const CHANGE_STATUS_COLOR: Record<ChangeStatus, string> = {
  'pending-approval': 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-blue-50 text-blue-700 border-blue-200',
  rejected: 'bg-red-50 text-red-500 border-red-200',
  effective: 'bg-green-50 text-green-700 border-green-200',
};

interface ProjectChange {
  id: string;
  changeNo: string;
  type: ChangeType;
  beforeValue: string;
  afterValue: string;
  reason: string;
  initiator: string;
  affectsContract: boolean;
  status: ChangeStatus;
  contractAmendmentId?: string;
  createdAt: string;
}

// ─── Mock 变更数据 ──────────────────────────────────────────────────────────

const MOCK_CHANGES: ProjectChange[] = [
  {
    id: 'CHG001',
    changeNo: 'CHG-2024-001',
    type: 'quantity',
    beforeValue: '电池组数量：100 台',
    afterValue: '电池组数量：120 台',
    reason: '客户现场评估后确认需新增20台以满足实际容量需求',
    initiator: '张伟',
    affectsContract: true,
    status: 'effective',
    contractAmendmentId: 'AMD-001',
    createdAt: '2024-02-15',
  },
  {
    id: 'CHG002',
    changeNo: 'CHG-2024-002',
    type: 'timeline',
    beforeValue: '项目结束时间：2025-12-31',
    afterValue: '项目结束时间：2026-01-15',
    reason: '受供应链影响，设备到货延迟约2周，交付时间顺延',
    initiator: '李明',
    affectsContract: false,
    status: 'effective',
    createdAt: '2024-03-10',
  },
  {
    id: 'CHG003',
    changeNo: 'CHG-2024-003',
    type: 'product',
    beforeValue: '电池型号：LFP-100Ah-48V（10台）',
    afterValue: '电池型号：LFP-200Ah-48V（5台）',
    reason: '部分点位空间有限，改用200Ah型号降低总台数同时保持容量',
    initiator: '王工',
    affectsContract: true,
    status: 'pending-approval',
    createdAt: '2024-05-20',
  },
];

// ─── Tab Types ───────────────────────────────────────────────────────────────

type TabId =
  | 'overview'
  | 'devices'
  | 'alarms'
  | 'approval'
  | 'changes'
  | 'battery-spec'
  | 'protection';

interface TabDef {
  id: TabId;
  label: string;
  iconName: string;
  group: 'project' | 'battery';
}

const TABS: TabDef[] = [
  { id: 'overview',     label: '项目概览',     iconName: 'badge-info',   group: 'project' },
  { id: 'devices',      label: '下属设备 (120)', iconName: 'server',      group: 'project' },
  { id: 'alarms',       label: '项目告警 (5)',   iconName: 'shield-alert', group: 'project' },
  { id: 'approval',     label: '立项流程',      iconName: 'check',        group: 'project' },
  { id: 'changes',      label: '变更管理',      iconName: 'git-branch',   group: 'project' },
  { id: 'battery-spec', label: '电池型号引用',  iconName: 'battery',      group: 'battery' },
  { id: 'protection',   label: '保护板引用',    iconName: 'shield-check', group: 'battery' },
];

const TAB_ICONS: Record<TabId, ({ size, className }: { size?: number; className?: string }) => React.ReactElement> = {
  overview:       ({ size, className }) => <BadgeInfo size={size} className={className} />,
  devices:        ({ size, className }) => <Server size={size} className={className} />,
  alarms:         ({ size, className }) => <ShieldAlert size={size} className={className} />,
  approval:       ({ size, className }) => <Check size={size} className={className} />,
  changes:        ({ size, className }) => <GitBranch size={size} className={className} />,
  'battery-spec': ({ size, className }) => <Battery size={size} className={className} />,
  protection:     ({ size, className }) => <ShieldCheck size={size} className={className} />,
};

// ─── 只读引用：电池型号 ──────────────────────────────────────────────────────
const BatterySpecRef = () => {
  const specData = {
    modelName: "LFP-100Ah-48V",
    modelId: "BM-001",
    chemistry: "磷酸铁锂 (LFP)",
    voltage: "48 V",
    capacity: "100 Ah",
    energy: "4.8 kWh",
    maxChargeCurrent: "50 A (0.5C)",
    maxDischargeCurrent: "100 A (1C)",
    cycleLife: "≥ 2000 次 (80% DoD)",
    calendarLife: "≥ 10 年",
    operatingTemp: "-20 ~ 60 °C",
    dimensions: "440 × 150 × 220 mm",
    weight: "约 28 kg",
    protection: "IP55",
    certifications: "GB/T 36276-2018, UN38.3, IEC 62619",
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-lg">
        <Info size={15} className="text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-primary font-medium">技术数据引用模式</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            此处为只读引用，数据来源于「电池管理 → 电池型号」模块。如需修改，请前往电池型号管理页面。
          </p>
        </div>
        <button className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium flex-shrink-0">
          <ExternalLink size={12} /> 前往编辑
        </button>
      </div>

      <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Battery size={22} className="text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground">{specData.modelName}</h3>
            <span className="text-xs bg-secondary text-primary px-2 py-0.5 rounded font-mono">{specData.modelId}</span>
            <span className="text-xs bg-success/10 text-success border border-success/30 px-2 py-0.5 rounded font-medium">使用中</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{specData.chemistry}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-center px-3">
            <p className="text-lg font-bold text-primary">48<span className="text-xs font-normal text-muted-foreground ml-0.5">V</span></p>
            <p className="text-xs text-muted-foreground">标称电压</p>
          </div>
          <div className="text-center px-3 border-l border-border">
            <p className="text-lg font-bold text-foreground">100<span className="text-xs font-normal text-muted-foreground ml-0.5">Ah</span></p>
            <p className="text-xs text-muted-foreground">标称容量</p>
          </div>
          <div className="text-center px-3 border-l border-border">
            <p className="text-lg font-bold text-foreground">4.8<span className="text-xs font-normal text-muted-foreground ml-0.5">kWh</span></p>
            <p className="text-xs text-muted-foreground">标称能量</p>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/20">
            <Zap size={13} className="text-primary" />
            <h4 className="text-sm font-semibold text-foreground">电气参数</h4>
            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              <Eye size={11} /> 只读
            </span>
          </div>
          <div className="divide-y divide-border">
            {[
              { label: "最大持续充电电流", value: specData.maxChargeCurrent },
              { label: "最大持续放电电流", value: specData.maxDischargeCurrent },
              { label: "循环寿命", value: specData.cycleLife },
              { label: "日历寿命", value: specData.calendarLife },
              { label: "相关认证", value: specData.certifications },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between px-5 py-2.5">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="text-xs font-medium text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/20">
            <Package size={13} className="text-primary" />
            <h4 className="text-sm font-semibold text-foreground">物理与环境规格</h4>
            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              <Eye size={11} /> 只读
            </span>
          </div>
          <div className="divide-y divide-border">
            {[
              { label: "外形尺寸（L×W×H）", value: specData.dimensions },
              { label: "重量", value: specData.weight },
              { label: "防护等级", value: specData.protection },
              { label: "工作温度（放电）", value: specData.operatingTemp },
              { label: "化学体系", value: specData.chemistry },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between px-5 py-2.5">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="text-xs font-medium text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── 只读引用：保护板 ───────────────────────────────────────────────────────
const ProtectionBoardRef = () => {
  const boardData = {
    name: "BMS-V3 保护板",
    id: "PB-001",
    chipset: "TI BQ76952",
    series: "15S",
    balanceType: "被动均衡（电阻耗散型）",
    socAlgo: "库伦积分法 + EKF 修正",
    socAccuracy: "≤ ± 5%",
    sohAccuracy: "≤ ± 8%",
    comProtocols: "CAN 2.0B / RS485 (MODBUS RTU)",
    canBaudRate: "250 kbps",
    rs485BaudRate: "9600 ~ 115200 bps",
    voltageAccuracy: "± 5 mV",
    currentAccuracy: "± 0.5 A",
    tempAccuracy: "± 1 °C",
    staticPower: "≤ 30 mW",
    operatingTemp: "-40 ~ 85 °C",
    firmwareVersion: "v2.1.3",
    firmwareStatus: "stable",
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-lg">
        <Info size={15} className="text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-primary font-medium">技术数据引用模式</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            此处为只读引用，数据来源于「电池管理 → 保护板」模块。如需修改，请前往保护板管理页面。
          </p>
        </div>
        <button className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium flex-shrink-0">
          <ExternalLink size={12} /> 前往编辑
        </button>
      </div>

      <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <ShieldCheck size={22} className="text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground">{boardData.name}</h3>
            <span className="text-xs bg-secondary text-primary px-2 py-0.5 rounded font-mono">{boardData.id}</span>
            <span className="text-xs bg-success/10 text-success border border-success/30 px-2 py-0.5 rounded font-medium">使用中</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{boardData.chipset} · {boardData.series}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-center px-3">
            <p className="text-base font-bold text-foreground font-mono">{boardData.firmwareVersion}</p>
            <p className="text-xs text-muted-foreground">当前固件</p>
          </div>
          <div className="text-center px-3 border-l border-border">
            <p className="text-base font-bold text-foreground">{boardData.series}</p>
            <p className="text-xs text-muted-foreground">串联节数</p>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/20">
            <Zap size={13} className="text-primary" />
            <h4 className="text-sm font-semibold text-foreground">BMS 核心规格</h4>
            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              <Eye size={11} /> 只读
            </span>
          </div>
          <div className="divide-y divide-border">
            {[
              { label: "主控芯片", value: boardData.chipset },
              { label: "串联节数", value: boardData.series },
              { label: "均衡方式", value: boardData.balanceType },
              { label: "SOC 估算算法", value: boardData.socAlgo },
              { label: "SOC 估算精度", value: boardData.socAccuracy },
              { label: "SOH 估算精度", value: boardData.sohAccuracy },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between px-5 py-2.5">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="text-xs font-medium text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/20">
            <AlertTriangle size={13} className="text-primary" />
            <h4 className="text-sm font-semibold text-foreground">通信与采样规格</h4>
            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              <Eye size={11} /> 只读
            </span>
          </div>
          <div className="divide-y divide-border">
            {[
              { label: "通信接口", value: boardData.comProtocols },
              { label: "CAN 波特率", value: boardData.canBaudRate },
              { label: "RS485 波特率", value: boardData.rs485BaudRate },
              { label: "电压采样精度", value: boardData.voltageAccuracy },
              { label: "电流采样精度", value: boardData.currentAccuracy },
              { label: "温度采样精度", value: boardData.tempAccuracy },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between px-5 py-2.5">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="text-xs font-medium text-foreground font-mono">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── 发起变更 Modal ──────────────────────────────────────────────────────────

interface ChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (change: ProjectChange) => void;
}

const ChangeModal = ({ isOpen, onClose, onSubmit }: ChangeModalProps) => {
  const [changeType, setChangeType] = useState<ChangeType>('other');
  const [beforeValue, setBeforeValue] = useState('');
  const [afterValue, setAfterValue] = useState('');
  const [reason, setReason] = useState('');
  const [initiator, setInitiator] = useState('张伟');
  const [affectsContract, setAffectsContract] = useState(false);

  const handleReset = () => {
    setChangeType('other');
    setBeforeValue('');
    setAfterValue('');
    setReason('');
    setInitiator('张伟');
    setAffectsContract(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!beforeValue.trim() || !afterValue.trim() || !reason.trim()) return;
    const newChange: ProjectChange = {
      id: `CHG${Date.now()}`,
      changeNo: `CHG-2024-${String(Math.floor(Math.random() * 900) + 100)}`,
      type: changeType,
      beforeValue: beforeValue.trim(),
      afterValue: afterValue.trim(),
      reason: reason.trim(),
      initiator: initiator.trim() || '张伟',
      affectsContract,
      status: 'pending-approval',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    console.log('[ProjectDetailPage] 新建变更单:', newChange);
    onSubmit(newChange);
    handleReset();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-card w-full max-w-xl rounded-xl shadow-custom overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <GitBranch size={18} className="text-primary" />
            <h3 className="font-bold text-foreground text-base">发起变更单</h3>
          </div>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground p-1.5 hover:bg-muted rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* 说明横幅 */}
        <div className="mx-6 mt-4 flex items-start gap-2.5 px-3.5 py-3 bg-amber-50 border border-amber-200 rounded-lg flex-shrink-0">
          <AlertCircle size={14} className="text-amber-700 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700 leading-relaxed">
            项目核心数据不允许直接编辑。所有修改必须通过变更单发起，经审批后方可生效并更新项目记录。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-6 space-y-4">

            {/* 变更类型 + 发起人 */}
            <div className="flex gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="text-sm font-medium text-foreground">变更类型 <span className="text-destructive">*</span></label>
                <select
                  value={changeType}
                  onChange={e => setChangeType(e.target.value as ChangeType)}
                  className="bms-input w-full"
                >
                  <option value="product">产品变更</option>
                  <option value="quantity">数量变更</option>
                  <option value="timeline">时间变更</option>
                  <option value="other">其他变更</option>
                </select>
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-sm font-medium text-foreground">发起人 <span className="text-destructive">*</span></label>
                <input
                  value={initiator}
                  onChange={e => setInitiator(e.target.value)}
                  placeholder="发起变更的人员"
                  className="bms-input w-full"
                />
              </div>
            </div>

            {/* 变更前内容 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">变更前内容 <span className="text-destructive">*</span></label>
              <textarea
                value={beforeValue}
                onChange={e => setBeforeValue(e.target.value)}
                placeholder="描述当前状态，例如：电池组数量 100 台"
                className="bms-input w-full resize-none text-sm"
                rows={2}
                required
              />
            </div>

            {/* 变更后内容 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">变更后内容 <span className="text-destructive">*</span></label>
              <textarea
                value={afterValue}
                onChange={e => setAfterValue(e.target.value)}
                placeholder="描述变更目标，例如：电池组数量 120 台"
                className="bms-input w-full resize-none text-sm"
                rows={2}
                required
              />
            </div>

            {/* 变更原因 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">变更原因 <span className="text-destructive">*</span></label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="说明变更原因及业务依据..."
                className="bms-input w-full resize-none text-sm"
                rows={3}
                required
              />
            </div>

            {/* 是否影响合同 */}
            <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">是否影响合同</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    涉及产品、数量、金额等变更需标记为影响合同，审批通过后将自动生成补充协议
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAffectsContract(v => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${affectsContract ? 'bg-primary' : 'bg-muted border border-border'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-card shadow transition-all ${affectsContract ? 'left-5.5 translate-x-0.5' : 'left-0.5'}`} />
                </button>
              </div>
              {affectsContract && (
                <div className="flex items-center gap-2 pt-1 text-xs text-primary">
                  <FilePlus size={12} className="flex-shrink-0" />
                  <span>审批通过后将自动触发合同补充协议生成流程</span>
                </div>
              )}
            </div>

          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex justify-between items-center flex-shrink-0 bg-card sticky bottom-0">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock size={11} />
              {affectsContract ? `流程：发起 → 审批 → 生成补充协议 → 生效` : `流程：发起 → 审批 → 生效`}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleClose} className="bms-btn-secondary text-sm">取消</button>
              <button type="submit" className="bms-btn-primary text-sm flex items-center gap-1.5">
                <GitBranch size={13} /> 提交变更单
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ProjectDetailPage = ({
  projectId = "P001",
  onBack = () => {},
  onNavigateToCustomer = () => {},
  onNavigateToContract = () => {},
  onNavigateToBatteryModel = () => {},
  onNavigateToProtectionBoard = () => {},
  onNavigateToDeviceGroup = () => {},
}: ProjectDetailPageProps) => {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [changes, setChanges] = useState<ProjectChange[]>(MOCK_CHANGES);
  const [showChangeModal, setShowChangeModal] = useState(false);

  const projectInfo = {
    id: projectId,
    name: "深圳储能基站项目A",
    status: "active" as ProjectStatus,
    customer: "深圳储能科技有限公司",
    contract: "CT-2024-001",
    location: "深圳市南山区科技园",
    manager: "张伟",
    startDate: "2024-01-15",
    endDate: "2026-01-15",
    desc: "该项目主要针对深圳南山区5G基站进行备用电源的替换与BMS纳管，总计将接入超过120台48V磷酸铁锂电池，实现完全云端监控与告警预测。",
    batteryModel: "LFP-100Ah-48V",
    protectionBoard: "BMS-V3 保护板",
  };

  console.log("[ProjectDetailPage] projectId:", projectId, "activeTab:", activeTab);

  const projectTabs = TABS.filter((t) => t.group === 'project');
  const batteryTabs = TABS.filter((t) => t.group === 'battery');

  const handleAddChange = (change: ProjectChange) => {
    setChanges(prev => [change, ...prev]);
    setShowChangeModal(false);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="p-6 space-y-6">
            <div className="flex gap-4">
              <div className="flex-1"><StatCard title="设备总数" value="120" unit="台" iconName="battery" colorType="blue" /></div>
              <div className="flex-1"><StatCard title="在线数量" value="118" unit="台" iconName="activity" colorType="green" /></div>
              <div className="flex-1"><StatCard title="未处理告警" value="5" unit="条" iconName="alert" colorType="red" /></div>
              <div className="flex-1"><StatCard title="总装机容量" value="600" unit="kWh" iconName="cpu" colorType="teal" /></div>
            </div>

            <div className="flex gap-6">
              <div className="flex-1 bg-card rounded-xl border border-border shadow-custom p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                    <BadgeInfo size={16} className="text-primary" />
                    基础信息
                  </h3>
                  <button
                    onClick={() => setShowChangeModal(true)}
                    className="bms-btn-primary text-xs py-1 px-2.5 flex items-center gap-1"
                  >
                    <GitBranch size={12} /> 发起变更
                  </button>
                </div>

                {/* 只读提示 */}
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border border-border rounded-lg mb-5 text-xs text-muted-foreground">
                  <Info size={12} className="flex-shrink-0" />
                  <span>项目核心数据已锁定，如需修改请点击"发起变更"提交变更申请</span>
                </div>

                <div className="flex flex-wrap gap-x-8 gap-y-5">
                  {/* 客户名称 */}
                  <div style={{ flexBasis: "45%" }}>
                    <p className="text-xs text-muted-foreground mb-1">客户名称</p>
                    <p
                      className="text-sm font-medium text-primary flex items-center gap-2 cursor-pointer hover:underline"
                      onClick={onNavigateToCustomer}
                    >
                      <Users size={14} className="text-primary" /> {projectInfo.customer}
                    </p>
                  </div>
                  {/* 关联合同 */}
                  <div style={{ flexBasis: "45%" }}>
                    <p className="text-xs text-muted-foreground mb-1">关联合同</p>
                    <p
                      className="text-sm font-medium text-primary flex items-center gap-2 cursor-pointer hover:underline"
                      onClick={onNavigateToContract}
                    >
                      <FileSignature size={14} /> {projectInfo.contract}
                    </p>
                  </div>
                  <div style={{ flexBasis: "45%" }}>
                    <p className="text-xs text-muted-foreground mb-1">负责人</p>
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Users size={14} className="text-muted-foreground" /> {projectInfo.manager}
                    </p>
                  </div>
                  <div style={{ flexBasis: "45%" }}>
                    <p className="text-xs text-muted-foreground mb-1">交付地点</p>
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      <MapPin size={14} className="text-muted-foreground" /> {projectInfo.location}
                    </p>
                  </div>
                  <div style={{ flexBasis: "45%" }}>
                    <p className="text-xs text-muted-foreground mb-1">起止时间</p>
                    <p className="text-sm font-medium text-foreground">{projectInfo.startDate} 至 {projectInfo.endDate}</p>
                  </div>
                  <div style={{ flexBasis: "45%" }}>
                    <p className="text-xs text-muted-foreground mb-1">运行状态</p>
                    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded border font-medium ${STATUS_COLOR[projectInfo.status]}`}>
                      {STATUS_LABEL[projectInfo.status]}
                    </span>
                  </div>

                  {/* 电池型号（引用） */}
                  <div style={{ flexBasis: "45%" }}>
                    <p className="text-xs text-muted-foreground mb-1">电池型号（引用）</p>
                    <div className="flex items-center gap-2">
                      <Battery size={13} className="text-primary shrink-0" />
                      <span className="text-sm font-medium text-primary">{projectInfo.batteryModel}</span>
                      <button
                        onClick={onNavigateToBatteryModel}
                        className="bms-btn-secondary text-xs py-0.5 px-2 flex items-center gap-1 shrink-0"
                        title="跳转到电池型号详情"
                      >
                        <ArrowUpRight size={12} /> 跳转
                      </button>
                    </div>
                  </div>

                  {/* 保护板（引用） */}
                  <div style={{ flexBasis: "45%" }}>
                    <p className="text-xs text-muted-foreground mb-1">保护板（引用）</p>
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={13} className="text-primary shrink-0" />
                      <span className="text-sm font-medium text-primary">{projectInfo.protectionBoard}</span>
                      <button
                        onClick={onNavigateToProtectionBoard}
                        className="bms-btn-secondary text-xs py-0.5 px-2 flex items-center gap-1 shrink-0"
                        title="跳转到保护板详情"
                      >
                        <ArrowUpRight size={12} /> 跳转
                      </button>
                    </div>
                  </div>

                  <div style={{ flexBasis: "100%" }}>
                    <p className="text-xs text-muted-foreground mb-1">项目描述</p>
                    <p className="text-sm text-foreground bg-muted/40 p-3 rounded-lg border border-border leading-relaxed">
                      {projectInfo.desc}
                    </p>
                  </div>
                </div>
              </div>

              {/* Map Placeholder */}
              <div className="w-80 bg-card rounded-xl border border-border shadow-custom overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-border bg-muted/20 flex items-center gap-2">
                  <Target size={15} className="text-primary" />
                  <h3 className="font-bold text-foreground text-sm">部署位置</h3>
                </div>
                <div className="flex-1 bg-muted relative flex items-center justify-center" style={{ minHeight: 180 }}>
                  <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>
                  <div className="z-10 flex flex-col items-center">
                    <MapPin size={32} className="text-primary drop-shadow-md mb-2" />
                    <div className="bg-card px-3 py-1.5 rounded-full shadow-custom border border-border text-xs font-medium">
                      深圳南山区科技园
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "devices":
        return (
          <div className="p-6">
            <div className="bg-card rounded-xl border border-border shadow-custom overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/10">
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <Server size={15} className="text-primary" /> 下属设备列表
                </h3>
                <button
                  className="bms-btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  onClick={() => onNavigateToDeviceGroup(projectId, projectInfo.name, projectInfo.id)}
                >
                  <Layers size={13} /> 管理设备分组
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted text-muted-foreground text-xs text-left">
                    <tr>
                      <th className="px-5 py-3 font-medium">设备SN</th>
                      <th className="px-5 py-3 font-medium">设备型号</th>
                      <th className="px-5 py-3 font-medium">保护板</th>
                      <th className="px-5 py-3 font-medium">当前分组</th>
                      <th className="px-5 py-3 font-medium">在线状态</th>
                      <th className="px-5 py-3 font-medium">最近上报</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    <tr className="hover:bg-muted/30">
                      <td className="px-5 py-3 font-mono font-medium text-primary">BMS-000001</td>
                      <td className="px-5 py-3">LFP-100Ah-48V</td>
                      <td className="px-5 py-3 text-muted-foreground">BMS-V3 保护板</td>
                      <td className="px-5 py-3 text-muted-foreground">A区-01组</td>
                      <td className="px-5 py-3"><span className="text-success font-medium">在线</span></td>
                      <td className="px-5 py-3 text-muted-foreground">2024-06-12 10:20:05</td>
                    </tr>
                    <tr className="hover:bg-muted/30">
                      <td className="px-5 py-3 font-mono font-medium text-primary">BMS-000002</td>
                      <td className="px-5 py-3">LFP-100Ah-48V</td>
                      <td className="px-5 py-3 text-muted-foreground">BMS-V3 保护板</td>
                      <td className="px-5 py-3 text-muted-foreground">A区-02组</td>
                      <td className="px-5 py-3"><span className="text-success font-medium">在线</span></td>
                      <td className="px-5 py-3 text-muted-foreground">2024-06-12 10:18:11</td>
                    </tr>
                    <tr className="hover:bg-muted/30">
                      <td className="px-5 py-3 font-mono font-medium text-primary">BMS-000003</td>
                      <td className="px-5 py-3">LFP-100Ah-48V</td>
                      <td className="px-5 py-3 text-muted-foreground">BMS-V2 保护板</td>
                      <td className="px-5 py-3 text-muted-foreground">B区-01组</td>
                      <td className="px-5 py-3"><span className="text-muted-foreground font-medium">离线</span></td>
                      <td className="px-5 py-3 text-muted-foreground">2024-06-11 22:10:00</td>
                    </tr>
                    <tr>
                      <td colSpan={6} className="px-5 py-6 text-center text-muted-foreground text-xs bg-muted/10">
                        仅展示部分示例数据，共 120 台设备
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case "alarms":
        return (
          <div className="p-6">
            <div className="bg-card rounded-xl border border-border shadow-custom overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/10">
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <ShieldAlert size={15} className="text-destructive" /> 项目告警记录
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted text-muted-foreground text-xs text-left">
                    <tr>
                      <th className="px-5 py-3 font-medium">告警级别</th>
                      <th className="px-5 py-3 font-medium">设备SN</th>
                      <th className="px-5 py-3 font-medium">告警内容</th>
                      <th className="px-5 py-3 font-medium">发生时间</th>
                      <th className="px-5 py-3 font-medium">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    <tr className="hover:bg-muted/30">
                      <td className="px-5 py-3"><span className="bg-destructive/10 text-destructive px-2 py-0.5 rounded text-xs font-medium border border-destructive/20">严重</span></td>
                      <td className="px-5 py-3 font-mono text-foreground">BMS-000045</td>
                      <td className="px-5 py-3">单体温度过高 (65°C)</td>
                      <td className="px-5 py-3 text-muted-foreground">2024-06-12 09:15:00</td>
                      <td className="px-5 py-3 text-warning font-medium text-xs">未处理</td>
                    </tr>
                    <tr className="hover:bg-muted/30">
                      <td className="px-5 py-3"><span className="bg-warning/10 text-warning px-2 py-0.5 rounded text-xs font-medium border border-warning/30">警告</span></td>
                      <td className="px-5 py-3 font-mono text-foreground">BMS-000012</td>
                      <td className="px-5 py-3">SOC极低 (5%)</td>
                      <td className="px-5 py-3 text-muted-foreground">2024-06-11 18:20:33</td>
                      <td className="px-5 py-3 text-muted-foreground font-medium text-xs">已恢复</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case "approval":
        return (
          <div className="p-6">
            <div className="bg-card rounded-xl border border-border shadow-custom p-8 max-w-3xl mx-auto">
              <h3 className="font-bold text-foreground text-lg mb-8 text-center">立项审批时间线</h3>
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                {[
                  { title: "项目立项完成", date: "2024-01-15 10:30", badge: "已生效", active: true, msg: "" },
                  { title: "管理层终审", date: "2024-01-14 16:45 · 审批人：李总", badge: "", active: false, msg: "同意立项，请尽快安排设备发货。" },
                  { title: "技术方案初审", date: "2024-01-13 14:20 · 审批人：王工", badge: "", active: false, msg: "BMS选型与接入协议核对无误。" },
                  { title: "发起立项申请", date: "2024-01-12 09:00 · 发起人：张伟", badge: "", active: false, msg: "合同已签订，申请立项开始执行。" },
                ].map((step, idx) => (
                  <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-card shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ${step.active ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"}`}>
                      <Check size={16} strokeWidth={3} />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card p-4 rounded border border-border shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-foreground">{step.title}</div>
                        {step.badge && <div className="text-xs text-primary font-medium">{step.badge}</div>}
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">{step.date}</div>
                      {step.msg && <div className="text-xs text-foreground bg-muted p-2 rounded">{step.msg}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "changes":
        return (
          <div className="p-6 space-y-5">
            {/* 顶部统计 + 操作栏 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">变更记录</span>
                  <span className="text-xs font-mono bg-secondary text-primary px-2 py-0.5 rounded">共 {changes.length} 条</span>
                </div>
                <div className="flex items-center gap-2">
                  {[
                    { label: '已生效', count: changes.filter(c => c.status === 'effective').length, color: 'text-green-700' },
                    { label: '待审批', count: changes.filter(c => c.status === 'pending-approval').length, color: 'text-amber-700' },
                    { label: '涉合同', count: changes.filter(c => c.affectsContract).length, color: 'text-primary' },
                  ].map(s => (
                    <span key={s.label} className={`text-xs ${s.color} bg-muted px-2 py-0.5 rounded`}>
                      {s.label} {s.count}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setShowChangeModal(true)}
                className="bms-btn-primary text-xs flex items-center gap-1.5"
              >
                <Plus size={13} /> 发起变更单
              </button>
            </div>

            {/* 流程说明 */}
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 rounded-lg border border-border text-xs text-muted-foreground">
              <Info size={13} className="flex-shrink-0 text-primary" />
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-foreground font-medium">不影响合同：</span>
                <span>发起变更</span>
                <ArrowRight size={10} />
                <span>审批</span>
                <ArrowRight size={10} />
                <span>更新项目</span>
                <span className="mx-3 border-l border-border h-3" />
                <span className="text-foreground font-medium">影响合同：</span>
                <span>发起变更</span>
                <ArrowRight size={10} />
                <span>审批</span>
                <ArrowRight size={10} />
                <span className="text-primary font-medium">生成补充协议</span>
                <ArrowRight size={10} />
                <span>更新项目</span>
              </div>
            </div>

            {/* 变更记录列表 */}
            {changes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-card rounded-xl border border-dashed border-border">
                <GitBranch size={32} className="mb-3 opacity-30" />
                <p className="text-sm">暂无变更记录</p>
                <p className="text-xs mt-1">项目核心数据的所有修改均需通过变更单进行</p>
              </div>
            ) : (
              <div className="space-y-3">
                {changes.map(change => (
                  <div key={change.id} className="bg-card rounded-xl border border-border overflow-hidden">
                    {/* 变更单头部 */}
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/10">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-semibold text-primary">{change.changeNo}</span>
                        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${CHANGE_TYPE_COLOR[change.type]}`}>
                          {CHANGE_TYPE_LABEL[change.type]}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${CHANGE_STATUS_COLOR[change.status]}`}>
                          {change.status === 'pending-approval' && <Clock size={9} className="inline mr-1" />}
                          {change.status === 'effective' && <CheckCircle size={9} className="inline mr-1" />}
                          {change.status === 'approved' && <Check size={9} className="inline mr-1" />}
                          {change.status === 'rejected' && <XCircle size={9} className="inline mr-1" />}
                          {CHANGE_STATUS_LABEL[change.status]}
                        </span>
                        {change.affectsContract && (
                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded border font-medium bg-primary/5 text-primary border-primary/20">
                            <FileText size={9} />
                            影响合同
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>发起人：{change.initiator}</span>
                        <span>{change.createdAt}</span>
                      </div>
                    </div>

                    {/* 变更前后对比 */}
                    <div className="px-5 py-4 space-y-3">
                      <div className="flex items-stretch gap-3">
                        <div className="flex-1 bg-muted/30 rounded-lg px-4 py-3 border border-border">
                          <p className="text-xs text-muted-foreground mb-1.5 font-medium">变更前</p>
                          <p className="text-sm text-foreground">{change.beforeValue}</p>
                        </div>
                        <div className="flex items-center flex-shrink-0">
                          <ArrowRight size={16} className="text-primary" />
                        </div>
                        <div className="flex-1 bg-primary/5 rounded-lg px-4 py-3 border border-primary/20">
                          <p className="text-xs text-primary mb-1.5 font-medium">变更后</p>
                          <p className="text-sm text-foreground font-medium">{change.afterValue}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 pt-1">
                        <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">变更原因：</span>
                        <span className="text-xs text-foreground">{change.reason}</span>
                      </div>

                      {change.contractAmendmentId && (
                        <div className="flex items-center gap-2 pt-1 border-t border-border">
                          <FilePlus size={12} className="text-primary flex-shrink-0" />
                          <span className="text-xs text-muted-foreground">已生成合同补充协议：</span>
                          <span className="text-xs font-mono text-primary font-medium">{change.contractAmendmentId}</span>
                          <button className="ml-auto text-xs text-primary hover:underline flex items-center gap-0.5">
                            查看补充协议 <ArrowUpRight size={10} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 锁定说明 */}
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/20 rounded-lg border border-dashed border-border text-xs text-muted-foreground">
              <Info size={12} className="flex-shrink-0" />
              <span>变更记录为只读归档数据，所有历史记录不允许修改或删除，完整保留变更前后内容</span>
            </div>
          </div>
        );

      case "battery-spec":
        return <BatterySpecRef />;

      case "protection":
        return <ProtectionBoardRef />;

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background" data-cmp="ProjectDetailPage">
      {/* 顶部栏 */}
      <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between shadow-sm z-10 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-1.5 -ml-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
            title="返回项目列表"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-foreground">项目详情</h2>
              <span className="text-xs font-mono px-2 py-0.5 bg-secondary text-primary rounded">{projectInfo.id}</span>
              <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded border font-medium ${STATUS_COLOR[projectInfo.status]}`}>
                {STATUS_LABEL[projectInfo.status]}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {projectInfo.name} · {projectInfo.customer}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowChangeModal(true)}
            className="bms-btn-primary flex items-center gap-1.5 text-xs"
          >
            <GitBranch size={14} /> 发起变更
          </button>
          <button className="bms-btn-secondary flex items-center gap-1.5 text-xs">
            <Download size={14} /> 导出项目报告
          </button>
        </div>
      </div>

      {/* Tabs —— 分组双行 */}
      <div className="bg-card border-b border-border flex-shrink-0">
        {/* 第一行：项目管理 */}
        <div className="px-6 flex items-center gap-0 border-b border-border/50">
          <span className="text-xs text-muted-foreground mr-4 py-3 flex-shrink-0 font-medium">项目管理</span>
          <div className="flex items-center overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {projectTabs.map((t) => {
              const IconComp = TAB_ICONS[t.id];
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 py-3 px-4 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <IconComp size={13} />
                  {t.label}
                  {t.id === 'changes' && changes.filter(c => c.status === 'pending-approval').length > 0 && (
                    <span className="ml-0.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0 rounded-full font-mono leading-5">
                      {changes.filter(c => c.status === 'pending-approval').length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {/* 第二行：电池技术引用 */}
        <div className="px-6 flex items-center gap-0">
          <div className="flex items-center gap-1.5 mr-4 py-3 flex-shrink-0">
            <span className="text-xs text-muted-foreground font-medium">电池技术</span>
            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">只读引用</span>
          </div>
          <div className="flex items-center overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {batteryTabs.map((t) => {
              const IconComp = TAB_ICONS[t.id];
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 py-3 px-4 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <IconComp size={13} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {renderTabContent()}
        </div>
      </div>

      {/* 发起变更 Modal */}
      <ChangeModal
        isOpen={showChangeModal}
        onClose={() => setShowChangeModal(false)}
        onSubmit={handleAddChange}
      />
    </div>
  );
};

export default ProjectDetailPage;
