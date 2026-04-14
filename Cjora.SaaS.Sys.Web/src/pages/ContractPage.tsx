import { useState, useEffect } from "react";
import {
  Search, Plus, FileText, CheckCircle, Clock, CheckSquare, XCircle,
  Send, X, AlertTriangle, Building, CreditCard, User, Target,
  Package, Wrench, MoreHorizontal, Trash2, ChevronRight,
  FolderOpen, ArrowRight, DollarSign, RefreshCw, Edit2,
  Eye, Layers, GitBranch, FilePlus
} from "lucide-react";
import StatCard from "../components/StatCard";
import Pagination from "../components/Pagination";

// ===================== Types =====================

export type ContractStatus = 'draft' | 'pending' | 'signed' | 'executing' | 'completed' | 'terminated';
export type ContractType = 'new' | 'renew' | 'expand' | 'change';
export type ContractItemType = 'product' | 'service' | 'other';

export interface ContractItem {
  id: string;
  itemType: ContractItemType;
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface LinkedProject {
  id: string;
  name: string;
  status: string;
}

export interface ContractAmendmentItem {
  itemName: string;
  field: string;      // e.g. '数量' | '单价' | '产品名称'
  before: string;
  after: string;
}

export interface ContractAmendment {
  id: string;
  no: string;                        // 补充协议编号，如 CA-C001-001
  sourceChangeId?: string;           // 来源项目变更单ID（如 CHG001）
  changeType: string;                // 变更类型描述，如 '数量变更' | '价格调整' | '产品替换'
  items: ContractAmendmentItem[];    // 各条目的变更明细
  deltaAmount: number;               // 金额变化（正/负/0）
  note?: string;                     // 协议说明
  status: 'pending' | 'signed';
  createdAt: string;
}

export interface Contract {
  id: string;
  no: string;
  // 关联商机
  opportunityId?: string;
  opportunityName?: string;
  // 客户信息（继承自商机）
  customerName: string;
  contactName?: string;
  // 基础信息
  type: ContractType;
  status: ContractStatus;
  effectiveDate: string;
  expireDate: string;
  salesOwner?: string;
  note?: string;
  // 合同条目（多条）
  items: ContractItem[];
  // 金额汇总（由条目自动计算，也可手动覆盖）
  totalAmount: number;
  // 回款信息
  receivableAmount: number;  // 应收金额
  receivedAmount: number;    // 已收金额
  // 关联项目
  linkedProjects: LinkedProject[];
  // 补充协议历史（影响合同的项目变更所产生）
  amendments?: ContractAmendment[];
  // 时间戳
  createdAt: string;
}

// ===================== Constants =====================

export const TYPE_MAP: Record<ContractType, { label: string; color: string }> = {
  new:    { label: '首签', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  renew:  { label: '续签', color: 'bg-green-50 text-green-700 border-green-200' },
  expand: { label: '增购', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  change: { label: '变更', color: 'bg-orange-50 text-orange-700 border-orange-200' },
};

export const STATUS_MAP: Record<ContractStatus, { label: string; color: string; step: number }> = {
  draft:      { label: '草稿',   color: 'bg-slate-100 text-slate-600 border-slate-200',   step: 1 },
  pending:    { label: '审批中', color: 'bg-amber-50 text-amber-700 border-amber-200',     step: 2 },
  signed:     { label: '已签约', color: 'bg-blue-50 text-blue-700 border-blue-200',        step: 3 },
  executing:  { label: '履约中', color: 'bg-green-50 text-green-700 border-green-200',     step: 4 },
  completed:  { label: '已完成', color: 'bg-teal-50 text-teal-700 border-teal-200',        step: 5 },
  terminated: { label: '已终止', color: 'bg-red-50 text-red-500 border-red-200',           step: 5 },
};

const ITEM_TYPE_MAP: Record<ContractItemType, { label: string; icon: string; color: string }> = {
  product: { label: '产品',  icon: 'package',  color: 'bg-blue-50 text-blue-600' },
  service: { label: '服务',  icon: 'wrench',   color: 'bg-orange-50 text-orange-600' },
  other:   { label: '其他',  icon: 'layers',   color: 'bg-slate-50 text-slate-600' },
};

// ===================== Mock Data =====================

const MOCK_OPPORTUNITIES = [
  { id: 'OP001', name: '深圳储能科技BMS系统采购', customerName: '深圳储能科技有限公司', contactName: '张伟', amount: 1500000 },
  { id: 'OP002', name: '苏州智能电网BMS集成项目', customerName: '苏州市智能电网科技',   contactName: '陈工',  amount: 2000000 },
  { id: 'OP003', name: '武汉绿色动力储能解决方案',customerName: '武汉绿色动力有限责任公司', contactName: '刘经理', amount: 850000 },
];

const initialContracts: Contract[] = [
  {
    id: 'C001', no: 'CT-2024-001',
    opportunityId: 'OP001', opportunityName: '深圳储能科技BMS系统采购',
    customerName: '深圳储能科技有限公司', contactName: '张伟',
    type: 'new', status: 'executing',
    effectiveDate: '2024-01-10', expireDate: '2025-01-10',
    salesOwner: '李明',
    items: [
      { id: 'I001a', itemType: 'product', name: 'Pack（200Ah-280V）', quantity: 10, unitPrice: 85000, amount: 850000 },
      { id: 'I001b', itemType: 'product', name: 'BMS主控模块（V3）',   quantity: 10, unitPrice: 65000, amount: 650000 },
    ],
    totalAmount: 1500000, receivableAmount: 1500000, receivedAmount: 900000,
    linkedProjects: [{ id: 'P001', name: '深圳储能基站项目A', status: 'active' }],
    createdAt: '2024-01-05', note: '首期BMS整包交付，含Pack+主控模块',
    amendments: [
      {
        id: 'CA001',
        no: 'CA-C001-001',
        sourceChangeId: 'CHG001',
        changeType: '数量变更',
        items: [
          { itemName: 'Pack（200Ah-280V）', field: '数量', before: '10', after: '12' },
          { itemName: 'Pack（200Ah-280V）', field: '金额', before: '¥850,000', after: '¥1,020,000' },
        ],
        deltaAmount: 170000,
        note: '客户因站点扩容需增加2组Pack，对应合同数量及金额同步调整',
        status: 'signed',
        createdAt: '2024-03-18',
      },
      {
        id: 'CA002',
        no: 'CA-C001-002',
        sourceChangeId: 'CHG003',
        changeType: '产品替换',
        items: [
          { itemName: 'BMS主控模块', field: '产品型号', before: 'V3', after: 'V3-Pro' },
          { itemName: 'BMS主控模块', field: '单价', before: '¥65,000', after: '¥72,000' },
        ],
        deltaAmount: 70000,
        note: '因V3主控模块停产，升级为V3-Pro，单价相应调整',
        status: 'pending',
        createdAt: '2024-05-07',
      },
    ],
  },
  {
    id: 'C002', no: 'CT-2024-002',
    opportunityId: 'OP002', opportunityName: '苏州智能电网BMS集成项目',
    customerName: '苏州市智能电网科技', contactName: '陈工',
    type: 'new', status: 'signed',
    effectiveDate: '2024-07-01', expireDate: '2026-07-01',
    salesOwner: '陈芳',
    items: [
      { id: 'I002a', itemType: 'product', name: 'Pack（300Ah-320V）', quantity: 8,  unitPrice: 120000, amount: 960000 },
      { id: 'I002b', itemType: 'product', name: 'BMS从控模块（V2）',  quantity: 16, unitPrice: 32500,  amount: 520000 },
      { id: 'I002c', itemType: 'service', name: '集成调试服务',        quantity: 1,  unitPrice: 520000, amount: 520000 },
    ],
    totalAmount: 2000000, receivableAmount: 2000000, receivedAmount: 400000,
    linkedProjects: [],
    createdAt: '2024-06-20', note: '含从控模块+集成调试服务',
  },
  {
    id: 'C003', no: 'CT-2024-003',
    opportunityId: 'OP003', opportunityName: '武汉绿色动力储能解决方案',
    customerName: '武汉绿色动力有限责任公司', contactName: '刘经理',
    type: 'new', status: 'draft',
    effectiveDate: '-', expireDate: '-',
    salesOwner: '李明',
    items: [
      { id: 'I003a', itemType: 'product', name: 'Pack（100Ah-192V）', quantity: 5, unitPrice: 72000, amount: 360000 },
      { id: 'I003b', itemType: 'product', name: 'BMS主控模块（V3）',  quantity: 5, unitPrice: 58000, amount: 290000 },
      { id: 'I003c', itemType: 'service', name: '现场安装服务',        quantity: 1, unitPrice: 200000, amount: 200000 },
    ],
    totalAmount: 850000, receivableAmount: 850000, receivedAmount: 0,
    linkedProjects: [],
    createdAt: '2024-08-01', note: '待客户确认最终数量后提交',
  },
  {
    id: 'C004', no: 'CT-2023-004',
    customerName: '北京绿能电池有限公司', contactName: '王总',
    type: 'new', status: 'completed',
    effectiveDate: '2023-03-01', expireDate: '2024-03-01',
    salesOwner: '刘洋',
    items: [
      { id: 'I004a', itemType: 'product', name: 'BMS主控模块（V2）', quantity: 6, unitPrice: 60000, amount: 360000 },
      { id: 'I004b', itemType: 'service', name: '运维保障服务（1年）', quantity: 1, unitPrice: 240000, amount: 240000 },
    ],
    totalAmount: 600000, receivableAmount: 600000, receivedAmount: 600000,
    linkedProjects: [{ id: 'P004', name: '北京调峰储能项目', status: 'ended' }],
    createdAt: '2023-02-15',
  },
];

// ===================== Helper Components =====================

const ItemTypeIcon = ({ type }: { type: ContractItemType }) => {
  if (type === 'product') return <Package size={12} className="flex-shrink-0" />;
  if (type === 'service') return <Wrench size={12} className="flex-shrink-0" />;
  return <Layers size={12} className="flex-shrink-0" />;
};

const StatusFlow = ({ status }: { status: ContractStatus }) => {
  const steps: { key: ContractStatus; label: string }[] = [
    { key: 'draft',      label: '草稿' },
    { key: 'pending',    label: '审批中' },
    { key: 'signed',     label: '已签约' },
    { key: 'executing',  label: '履约中' },
    { key: 'completed',  label: '已完成' },
  ];
  const currentStep = STATUS_MAP[status].step;
  const isTerminated = status === 'terminated';

  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => {
        const stepNum = STATUS_MAP[s.key].step;
        const isActive = !isTerminated && stepNum === currentStep;
        const isDone   = !isTerminated && stepNum < currentStep;
        return (
          <div key={s.key} className="flex items-center gap-1">
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-all ${
              isActive ? 'bg-primary text-primary-foreground' :
              isDone   ? 'bg-green-50 text-green-700 border border-green-200' :
                         'bg-muted text-muted-foreground'
            }`}>
              {isDone && <CheckCircle size={10} />}
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <ChevronRight size={10} className="text-muted-foreground flex-shrink-0" />
            )}
          </div>
        );
      })}
      {isTerminated && (
        <span className="ml-1 text-xs px-2 py-0.5 rounded bg-red-50 text-red-500 border border-red-200 font-medium">已终止</span>
      )}
    </div>
  );
};

// ===================== Contract Form Item Row =====================

interface ItemRowProps {
  item: ContractItem;
  index: number;
  onUpdate: (id: string, field: keyof ContractItem, value: string | number) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

const ItemRow = ({ item, index, onUpdate, onRemove, canRemove }: ItemRowProps) => {
  return (
    <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border border-border">
      <span className="text-xs text-muted-foreground w-5 text-center flex-shrink-0">{index + 1}</span>
      <select
        value={item.itemType}
        onChange={e => onUpdate(item.id, 'itemType', e.target.value)}
        className="bms-input text-xs w-20 flex-shrink-0 py-1.5"
      >
        <option value="product">产品</option>
        <option value="service">服务</option>
        <option value="other">其他</option>
      </select>
      <input
        value={item.name}
        onChange={e => onUpdate(item.id, 'name', e.target.value)}
        placeholder="条目名称（如 Pack型号 / BMS型号）"
        className="bms-input text-xs flex-1 py-1.5 min-w-0"
      />
      <input
        type="number"
        value={item.quantity}
        min={1}
        onChange={e => onUpdate(item.id, 'quantity', Number(e.target.value))}
        placeholder="数量"
        className="bms-input text-xs w-16 flex-shrink-0 py-1.5"
      />
      <input
        type="number"
        value={item.unitPrice}
        min={0}
        onChange={e => onUpdate(item.id, 'unitPrice', Number(e.target.value))}
        placeholder="单价"
        className="bms-input text-xs w-24 flex-shrink-0 py-1.5"
      />
      <div className="w-24 flex-shrink-0 text-xs font-mono text-foreground text-right px-2">
        ¥{(item.quantity * item.unitPrice).toLocaleString()}
      </div>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        disabled={!canRemove}
        className="p-1 rounded hover:bg-red-50 hover:text-destructive transition-colors text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
};

// ===================== Detail Panel =====================

interface DetailPanelProps {
  contract: Contract;
  onClose: () => void;
  onNavigateProject: (projectId: string) => void;
}

const DetailPanel = ({ contract, onClose, onNavigateProject }: DetailPanelProps) => {
  const unreceived = contract.receivableAmount - contract.receivedAmount;
  const progress = contract.receivableAmount > 0
    ? Math.round((contract.receivedAmount / contract.receivableAmount) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/30 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div
        className="w-full max-w-xl h-full bg-card shadow-custom overflow-y-auto animate-in slide-in-from-right duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              <span className="font-bold text-foreground text-base">{contract.no}</span>
              <span className={`inline-flex text-xs px-2 py-0.5 rounded border font-medium ${STATUS_MAP[contract.status].color}`}>
                {STATUS_MAP[contract.status].label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 ml-6">
              {TYPE_MAP[contract.type].label} · {contract.customerName}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1.5 hover:bg-muted rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* 状态流 */}
          <div className="bms-card py-3 px-4">
            <StatusFlow status={contract.status} />
          </div>

          {/* 关联商机 */}
          {contract.opportunityId && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">关联商机</h4>
              <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg border border-border">
                <Target size={14} className="text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{contract.opportunityName}</p>
                  <p className="text-xs text-muted-foreground">ID: {contract.opportunityId}</p>
                </div>
              </div>
            </div>
          )}

          {/* 基础信息 */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">基础信息</h4>
            <div className="flex flex-wrap gap-3">
              {[
                { label: '客户', value: contract.customerName },
                { label: '联系人', value: contract.contactName || '-' },
                { label: '销售负责人', value: contract.salesOwner || '-' },
                { label: '生效日期', value: contract.effectiveDate },
                { label: '到期日期', value: contract.expireDate },
              ].map(f => (
                <div key={f.label} className="flex-1 min-w-[140px] bg-muted/40 rounded-lg px-3 py-2">
                  <p className="text-xs text-muted-foreground">{f.label}</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{f.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 合同条目 */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">合同条目</h4>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bms-table-header">
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium">类型</th>
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium">名称</th>
                    <th className="px-3 py-2 text-right text-muted-foreground font-medium">数量</th>
                    <th className="px-3 py-2 text-right text-muted-foreground font-medium">单价</th>
                    <th className="px-3 py-2 text-right text-muted-foreground font-medium">金额</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {contract.items.map(item => (
                    <tr key={item.id}>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${ITEM_TYPE_MAP[item.itemType].color}`}>
                          <ItemTypeIcon type={item.itemType} />
                          {ITEM_TYPE_MAP[item.itemType].label}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium text-foreground">{item.name}</td>
                      <td className="px-3 py-2 text-right text-foreground">{item.quantity}</td>
                      <td className="px-3 py-2 text-right font-mono text-foreground">¥{item.unitPrice.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-foreground">¥{item.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/30">
                    <td colSpan={4} className="px-3 py-2 text-right font-semibold text-foreground">合计</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-primary">
                      ¥{contract.totalAmount.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 回款信息 */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">回款信息</h4>
            <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">
              <div className="flex items-center gap-3">
                {[
                  { label: '应收金额', value: contract.receivableAmount, color: 'text-foreground' },
                  { label: '已收金额', value: contract.receivedAmount,   color: 'text-green-700' },
                  { label: '未收金额', value: unreceived,                 color: unreceived > 0 ? 'text-amber-700' : 'text-muted-foreground' },
                ].map(f => (
                  <div key={f.label} className="flex-1 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{f.label}</p>
                    <p className={`text-sm font-bold font-mono ${f.color}`}>¥{f.value.toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>回款进度</span><span>{progress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-green-500' : progress > 50 ? 'bg-primary' : 'bg-amber-400'}`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 关联项目 */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">关联项目</h4>
            {contract.linkedProjects.length > 0 ? (
              <div className="space-y-2">
                {contract.linkedProjects.map(proj => (
                  <button
                    key={proj.id}
                    onClick={() => onNavigateProject(proj.id)}
                    className="w-full flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border hover:bg-secondary/50 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <FolderOpen size={14} className="text-primary flex-shrink-0" />
                      <span className="text-sm font-medium text-foreground">{proj.name}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">{proj.status === 'active' ? '进行中' : proj.status === 'ended' ? '已结束' : proj.status}</span>
                    </div>
                    <ArrowRight size={13} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                {contract.status === 'signed' || contract.status === 'executing'
                  ? '合同已签约，可在项目管理中创建关联项目'
                  : '合同签约后将自动关联执行项目'}
              </div>
            )}
          </div>

          {/* 备注 */}
          {contract.note && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">备注</h4>
              <p className="text-sm text-foreground bg-muted/30 rounded-lg px-3 py-2 border border-border">{contract.note}</p>
            </div>
          )}

          {/* 补充协议历史 */}
          {contract.amendments && contract.amendments.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <GitBranch size={12} className="text-primary" />
                补充协议历史
                <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  {contract.amendments.length}
                </span>
              </h4>
              <div className="space-y-3">
                {contract.amendments.map((amend, idx) => (
                  <div
                    key={amend.id}
                    className="border border-border rounded-lg overflow-hidden"
                  >
                    {/* 协议头部 */}
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b border-border">
                      <div className="flex items-center gap-2">
                        <FilePlus size={13} className="text-primary flex-shrink-0" />
                        <span className="text-xs font-mono font-semibold text-foreground">{amend.no}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-secondary border border-border text-foreground font-medium">
                          {amend.changeType}
                        </span>
                        {amend.sourceChangeId && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <GitBranch size={9} />来自 {amend.sourceChangeId}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {amend.deltaAmount !== 0 && (
                          <span className={`text-xs font-mono font-semibold ${amend.deltaAmount > 0 ? 'text-green-700' : 'text-destructive'}`}>
                            {amend.deltaAmount > 0 ? `+¥${amend.deltaAmount.toLocaleString()}` : `-¥${Math.abs(amend.deltaAmount).toLocaleString()}`}
                          </span>
                        )}
                        <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${
                          amend.status === 'signed'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {amend.status === 'signed' ? '已签署' : '待签署'}
                        </span>
                      </div>
                    </div>

                    {/* 变更明细 */}
                    <div className="px-3 py-2 space-y-1.5">
                      {amend.items.map((item, iIdx) => (
                        <div key={iIdx} className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground flex-shrink-0 w-32 truncate" title={item.itemName}>{item.itemName}</span>
                          <span className="text-muted-foreground flex-shrink-0">{item.field}:</span>
                          <span className="line-through text-muted-foreground">{item.before}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-semibold text-foreground">{item.after}</span>
                        </div>
                      ))}
                    </div>

                    {/* 协议说明 & 时间 */}
                    {(amend.note || amend.createdAt) && (
                      <div className="px-3 py-2 border-t border-border bg-muted/20 flex items-start justify-between gap-2">
                        {amend.note && (
                          <p className="text-xs text-muted-foreground flex-1">{amend.note}</p>
                        )}
                        <span className="text-xs text-muted-foreground flex-shrink-0">{amend.createdAt}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ===================== Contract Form Modal =====================

interface ContractFormModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  initialData: Partial<Contract>;
  onClose: () => void;
  onSave: (contract: Contract) => void;
}

const emptyItem = (): ContractItem => ({
  id: `item-${Date.now()}-${Math.random()}`,
  itemType: 'product',
  name: '',
  quantity: 1,
  unitPrice: 0,
  amount: 0,
});

const ContractFormModal = ({ isOpen, mode, initialData, onClose, onSave }: ContractFormModalProps) => {
  const [customerName, setCustomerName]     = useState(initialData.customerName || '');
  const [contactName, setContactName]       = useState(initialData.contactName  || '');
  const [opportunityId, setOpportunityId]   = useState(initialData.opportunityId || '');
  const [opportunityName, setOpportunityName] = useState(initialData.opportunityName || '');
  const [contractType, setContractType]     = useState<ContractType>(initialData.type || 'new');
  const [salesOwner, setSalesOwner]         = useState(initialData.salesOwner || '');
  const [note, setNote]                     = useState(initialData.note || '');
  const [items, setItems]                   = useState<ContractItem[]>(
    initialData.items && initialData.items.length > 0 ? initialData.items : [emptyItem()]
  );
  const [receivableAmount, setReceivableAmount] = useState(initialData.receivableAmount ?? 0);

  // 选择商机时自动填充客户
  const handleSelectOpportunity = (oppId: string) => {
    setOpportunityId(oppId);
    if (!oppId) { setOpportunityName(''); return; }
    const opp = MOCK_OPPORTUNITIES.find(o => o.id === oppId);
    if (opp) {
      setOpportunityName(opp.name);
      setCustomerName(opp.customerName);
      setContactName(opp.contactName);
      // 自动计算应收金额 = 商机金额
      setReceivableAmount(opp.amount);
    }
  };

  const updateItem = (id: string, field: keyof ContractItem, val: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: val };
      updated.amount = updated.quantity * updated.unitPrice;
      return updated;
    }));
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;

    const contract: Contract = {
      id: (initialData.id as string) || `C${Date.now()}`,
      no: (initialData.no as string) || `CT-2024-${String(Math.floor(Math.random() * 900) + 100)}`,
      opportunityId:   opportunityId || undefined,
      opportunityName: opportunityName || undefined,
      customerName,
      contactName:     contactName || undefined,
      type:            contractType,
      status:          (initialData.status as ContractStatus) || 'draft',
      effectiveDate:   (initialData.effectiveDate as string) || '-',
      expireDate:      (initialData.expireDate as string)    || '-',
      salesOwner:      salesOwner || undefined,
      note:            note || undefined,
      items:           items.map(i => ({ ...i, amount: i.quantity * i.unitPrice })),
      totalAmount,
      receivableAmount: receivableAmount || totalAmount,
      receivedAmount:  (initialData.receivedAmount as number) || 0,
      linkedProjects:  (initialData.linkedProjects as LinkedProject[]) || [],
      createdAt:       (initialData.createdAt as string) || new Date().toISOString().slice(0, 10),
    };
    onSave(contract);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-card w-full max-w-2xl rounded-xl shadow-custom overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            <h3 className="font-bold text-foreground text-base">
              {mode === 'add' ? '起草新合同' : '编辑合同'}
            </h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-6 space-y-5">

            {/* Section: 关联商机 */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Target size={12} className="text-primary" /> 关联商机
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    选择商机 <span className="text-muted-foreground text-xs font-normal">（选择后自动填充客户信息）</span>
                  </label>
                  <select
                    value={opportunityId}
                    onChange={e => handleSelectOpportunity(e.target.value)}
                    className="bms-input w-full"
                  >
                    <option value="">-- 手动填写（不关联商机）--</option>
                    {MOCK_OPPORTUNITIES.map(o => (
                      <option key={o.id} value={o.id}>{o.id} · {o.name} — {o.customerName}</option>
                    ))}
                  </select>
                </div>
                {opportunityId && (
                  <div className="flex items-center gap-2 p-2.5 bg-secondary/50 rounded-lg border border-border text-xs text-primary">
                    <CheckCircle size={13} className="flex-shrink-0" />
                    <span>已关联商机：<strong>{opportunityName}</strong>，客户与金额信息已自动继承</span>
                  </div>
                )}
              </div>
            </div>

            {/* Section: 基础信息 */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Building size={12} className="text-primary" /> 基础信息
              </h4>
              <div className="space-y-3">
                <div className="flex gap-4">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-sm font-medium text-foreground">客户名称 <span className="text-destructive">*</span></label>
                    <input
                      required value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="请输入企业名称"
                      className="bms-input w-full"
                      readOnly={!!opportunityId}
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <label className="text-sm font-medium text-foreground">联系人</label>
                    <input
                      value={contactName}
                      onChange={e => setContactName(e.target.value)}
                      placeholder="客户联系人"
                      className="bms-input w-full"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-sm font-medium text-foreground">合同类型 <span className="text-destructive">*</span></label>
                    <select value={contractType} onChange={e => setContractType(e.target.value as ContractType)} className="bms-input w-full">
                      <option value="new">首签</option>
                      <option value="renew">续签</option>
                      <option value="expand">增购</option>
                      <option value="change">变更</option>
                    </select>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <label className="text-sm font-medium text-foreground">销售负责人</label>
                    <input value={salesOwner} onChange={e => setSalesOwner(e.target.value)} placeholder="内部销售负责人" className="bms-input w-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Section: 合同条目 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Package size={12} className="text-primary" /> 合同条目
                  <span className="text-muted-foreground font-normal normal-case">(支持多条产品/服务)</span>
                </h4>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  <Plus size={13} /> 添加条目
                </button>
              </div>

              {/* 列头 */}
              <div className="flex items-center gap-2 px-3 mb-1 text-xs text-muted-foreground">
                <span className="w-5 flex-shrink-0" />
                <span className="w-20 flex-shrink-0">类型</span>
                <span className="flex-1">名称</span>
                <span className="w-16 flex-shrink-0 text-right">数量</span>
                <span className="w-24 flex-shrink-0 text-right">单价(元)</span>
                <span className="w-24 flex-shrink-0 text-right">金额(元)</span>
                <span className="w-7 flex-shrink-0" />
              </div>

              <div className="space-y-2">
                {items.map((item, idx) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    index={idx}
                    onUpdate={updateItem}
                    onRemove={removeItem}
                    canRemove={items.length > 1}
                  />
                ))}
              </div>

              {/* 合计行 */}
              <div className="mt-3 flex items-center justify-between px-3 py-2 bg-secondary/40 rounded-lg border border-border">
                <span className="text-sm font-semibold text-foreground">合同总金额</span>
                <span className="font-mono font-bold text-primary text-base">¥{totalAmount.toLocaleString()}</span>
              </div>

              {/* 提示 */}
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <AlertTriangle size={11} />
                当前支持产品类（Pack/BMS）和服务类条目，后续可扩展更多条目类型
              </p>
            </div>

            {/* Section: 回款信息 */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <CreditCard size={12} className="text-primary" /> 回款信息
              </h4>
              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium text-foreground">应收金额 (元)</label>
                  <input
                    type="number" min={0}
                    value={receivableAmount}
                    onChange={e => setReceivableAmount(Number(e.target.value))}
                    placeholder={String(totalAmount)}
                    className="bms-input w-full"
                  />
                  <p className="text-xs text-muted-foreground">默认同合同总金额，可手动调整</p>
                </div>
              </div>
            </div>

            {/* Section: 备注 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <FileText size={13} className="text-muted-foreground" /> 备注
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="合同说明、特殊约定等..."
                className="bms-input w-full text-sm resize-none"
                rows={2}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex justify-end gap-3 flex-shrink-0 bg-card sticky bottom-0">
            <button type="button" onClick={onClose} className="bms-btn-secondary">取消</button>
            <button type="submit" className="bms-btn-primary">{mode === 'add' ? '保存为草稿' : '保存修改'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ===================== Main Page =====================

interface ContractPageProps {
  initialAction?: 'new' | 'renew' | '';
  initialCustomer?: string;
  initialLeadId?: string;
  initialOpportunityId?: string;
  initialOpportunityName?: string;
  onNavigateToProject?: (projectId: string) => void;
  onContractSigned?: (contract: Contract) => void;
}

const ContractPage = ({
  initialAction = '',
  initialCustomer = '',
  initialLeadId = '',
  initialOpportunityId = '',
  initialOpportunityName = '',
  onNavigateToProject,
  onContractSigned,
}: ContractPageProps) => {
  const [contracts, setContracts]         = useState<Contract[]>(initialContracts);
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState<ContractStatus | 'all'>('all');
  const [page, setPage]                   = useState(1);
  const pageSize = 10;
  const [toast, setToast]                 = useState<{ msg: string; type: 'success' | 'info' | 'warn' } | null>(null);
  const [detailContract, setDetailContract] = useState<Contract | null>(null);
  const [formModal, setFormModal]         = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit';
    data: Partial<Contract>;
  }>({ isOpen: false, mode: 'add', data: {} });

  // 监听外部参数：商机赢单跳转
  useEffect(() => {
    if (initialAction === 'new' || initialAction === 'renew') {
      const preData: Partial<Contract> = {
        type:            initialAction === 'renew' ? 'renew' : 'new',
        customerName:    initialCustomer,
        opportunityId:   initialOpportunityId || undefined,
        opportunityName: initialOpportunityName || undefined,
      };
      setFormModal({ isOpen: true, mode: 'add', data: preData });
    }
  }, [initialAction, initialCustomer, initialLeadId, initialOpportunityId, initialOpportunityName]);

  const showToast = (msg: string, type: 'success' | 'info' | 'warn' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ---- Status transitions ----
  const handleAction = (contract: Contract, action: string) => {
    if (action === 'submit') {
      setContracts(prev => prev.map(c => c.id === contract.id ? { ...c, status: 'pending' } : c));
      showToast(`合同「${contract.no}」已提交审批`, 'info');
    } else if (action === 'approve') {
      const updated: Contract = {
        ...contract,
        status: 'signed',
        effectiveDate: new Date().toISOString().slice(0, 10),
        expireDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      };
      setContracts(prev => prev.map(c => c.id === contract.id ? updated : c));
      showToast(`合同「${contract.no}」审批通过，已签约！可创建关联项目`, 'success');
      if (onContractSigned) onContractSigned(updated);
      console.log(`[Contract] 合同已签约，可生成项目: ${contract.no}`, updated);
    } else if (action === 'execute') {
      setContracts(prev => prev.map(c => c.id === contract.id ? { ...c, status: 'executing' } : c));
      showToast(`合同「${contract.no}」已进入履约中`, 'info');
    } else if (action === 'complete') {
      setContracts(prev => prev.map(c => c.id === contract.id ? { ...c, status: 'completed' } : c));
      showToast(`合同「${contract.no}」已完成！`, 'success');
    } else if (action === 'terminate') {
      setContracts(prev => prev.map(c => c.id === contract.id ? { ...c, status: 'terminated' } : c));
      showToast(`合同「${contract.no}」已终止`, 'warn');
    }
  };

  const handleSaveContract = (contract: Contract) => {
    if (formModal.mode === 'add') {
      setContracts(prev => [contract, ...prev]);
      showToast(`合同草稿「${contract.no}」已创建`);
    } else {
      setContracts(prev => prev.map(c => c.id === contract.id ? contract : c));
      showToast(`合同「${contract.no}」已更新`);
    }
    setFormModal({ isOpen: false, mode: 'add', data: {} });
    console.log(`[Contract] 合同保存: ${contract.no}`, contract);
  };

  const filtered = contracts.filter(c => {
    const matchSearch = c.no.includes(search) || c.customerName.includes(search) || (c.opportunityName || '').includes(search);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Stats
  const totalContracts     = contracts.length;
  const signingCount       = contracts.filter(c => ['signed', 'executing'].includes(c.status)).length;
  const pendingCount       = contracts.filter(c => c.status === 'pending').length;
  const totalAmount        = contracts.reduce((s, c) => s + c.totalAmount, 0);
  const totalReceived      = contracts.reduce((s, c) => s + c.receivedAmount, 0);
  const totalReceivable    = contracts.reduce((s, c) => s + c.receivableAmount, 0);
  const unreceived         = totalReceivable - totalReceived;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 animate-in fade-in duration-300 relative">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 px-4 py-3 rounded-lg shadow-custom text-sm font-medium animate-in fade-in slide-in-from-top-5 ${
          toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
          toast.type === 'warn'    ? 'bg-red-50 text-red-700 border border-red-200' :
                                     'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          <CheckCircle size={15} />
          {toast.msg}
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-4">
        <div className="flex-1">
          <StatCard title="合同总数" value={String(totalContracts)} iconName="file-text" colorType="blue" />
        </div>
        <div className="flex-1">
          <StatCard title="签约/履约中" value={String(signingCount)} iconName="check" colorType="green" />
        </div>
        <div className="flex-1">
          <StatCard title="待审批" value={String(pendingCount)} iconName="clock" colorType="orange" />
        </div>
        <div className="flex-1">
          <StatCard title="合同总额" value={`${(totalAmount / 10000).toFixed(0)}`} unit="万" iconName="activity" colorType="teal" />
        </div>
      </div>

      {/* 回款概览 */}
      <div className="bms-card py-4 px-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <DollarSign size={15} className="text-primary" /> 回款概览
          </h4>
          <span className="text-xs text-muted-foreground">仅统计活跃合同</span>
        </div>
        <div className="flex items-center gap-6">
          {[
            { label: '应收总额', val: totalReceivable, color: 'text-foreground' },
            { label: '已收金额', val: totalReceived,   color: 'text-green-700' },
            { label: '待收金额', val: unreceived,       color: 'text-amber-700' },
          ].map(f => (
            <div key={f.label} className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{f.label}</span>
              <span className={`text-lg font-bold font-mono ${f.color}`}>¥{(f.val / 10000).toFixed(0)}万</span>
            </div>
          ))}
          <div className="flex-1">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>回款率</span>
              <span>{totalReceivable > 0 ? Math.round(totalReceived / totalReceivable * 100) : 0}%</span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${totalReceivable > 0 ? Math.min(100, Math.round(totalReceived / totalReceivable * 100)) : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 业务链路提示 */}
      <div className="flex items-center gap-2 px-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="px-2 py-1 rounded bg-muted border border-border font-medium text-foreground">线索</span>
          <ChevronRight size={12} />
          <span className="px-2 py-1 rounded bg-muted border border-border font-medium text-foreground">商机</span>
          <ChevronRight size={12} />
          <span className="px-2 py-1 rounded bg-primary text-primary-foreground font-medium">合同</span>
          <ChevronRight size={12} />
          <span className="px-2 py-1 rounded bg-muted border border-border font-medium text-foreground">项目</span>
        </div>
        <span className="text-xs text-muted-foreground ml-2">合同作为商机结果与项目起点，承载完整交易内容</span>
      </div>

      {/* Main Table */}
      <div className="bms-card p-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="搜索合同编号/客户/商机..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="bms-input pl-8 w-64 text-sm bg-background"
              />
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value as any); setPage(1); }}
              className="bms-input text-sm w-36 bg-background"
            >
              <option value="all">全部状态</option>
              <option value="draft">草稿</option>
              <option value="pending">审批中</option>
              <option value="signed">已签约</option>
              <option value="executing">履约中</option>
              <option value="completed">已完成</option>
              <option value="terminated">已终止</option>
            </select>
          </div>
          <button
            onClick={() => setFormModal({ isOpen: true, mode: 'add', data: {} })}
            className="bms-btn-primary flex items-center gap-2 text-xs"
          >
            <Plus size={13} /> 起草新合同
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bms-table-header text-left">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground">合同编号</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground">客户 / 关联商机</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground">条目摘要</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground">合同金额</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground">回款进度</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground">状态</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length > 0 ? paged.map((c, i) => {
                const progress = c.receivableAmount > 0 ? Math.round(c.receivedAmount / c.receivableAmount * 100) : 0;
                return (
                  <tr key={c.id} className={`table-row-hover text-sm transition-colors ${i % 2 === 0 ? '' : 'bg-muted/30'}`}>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-mono font-semibold text-primary text-sm">{c.no}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`inline-flex text-xs px-1.5 py-0.5 rounded border font-medium ${TYPE_MAP[c.type].color}`}>
                            {TYPE_MAP[c.type].label}
                          </span>
                          {c.linkedProjects.length > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-xs text-primary">
                              <FolderOpen size={10} /> {c.linkedProjects.length}个项目
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-foreground text-sm">{c.customerName}</div>
                        {c.opportunityName && (
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                            <Target size={10} className="flex-shrink-0" />
                            {c.opportunityName}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        {c.items.slice(0, 2).map(item => (
                          <div key={item.id} className="flex items-center gap-1 text-xs">
                            <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded ${ITEM_TYPE_MAP[item.itemType].color}`}>
                              <ItemTypeIcon type={item.itemType} />
                            </span>
                            <span className="text-foreground truncate max-w-[120px]">{item.name}</span>
                            <span className="text-muted-foreground">×{item.quantity}</span>
                          </div>
                        ))}
                        {c.items.length > 2 && (
                          <span className="text-xs text-muted-foreground">+{c.items.length - 2} 条</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-foreground">
                        ¥{(c.totalAmount / 10000).toFixed(0)}万
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${progress >= 100 ? 'bg-green-500' : progress > 50 ? 'bg-primary' : 'bg-amber-400'}`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs px-2 py-0.5 rounded border font-medium ${STATUS_MAP[c.status].color}`}>
                        {STATUS_MAP[c.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setDetailContract(c)}
                          className="px-2 py-1.5 flex items-center gap-1 rounded border border-border hover:bg-muted transition-colors text-xs font-medium text-foreground"
                        >
                          <Eye size={12} className="text-muted-foreground" /> 详情
                        </button>

                        {c.status === 'draft' && (
                          <>
                            <button
                              onClick={() => setFormModal({ isOpen: true, mode: 'edit', data: c })}
                              className="px-2 py-1.5 flex items-center gap-1 rounded border border-border hover:bg-muted transition-colors text-xs font-medium text-foreground"
                            >
                              <Edit2 size={12} /> 编辑
                            </button>
                            <button
                              onClick={() => handleAction(c, 'submit')}
                              className="px-2 py-1.5 flex items-center gap-1 rounded bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors text-xs font-medium"
                            >
                              <Send size={12} /> 提交审批
                            </button>
                          </>
                        )}

                        {c.status === 'pending' && (
                          <button
                            onClick={() => handleAction(c, 'approve')}
                            className="px-2 py-1.5 flex items-center gap-1 rounded bg-secondary text-primary hover:bg-primary hover:text-primary-foreground transition-colors text-xs font-medium"
                          >
                            <CheckSquare size={12} /> 模拟通过
                          </button>
                        )}

                        {c.status === 'signed' && (
                          <button
                            onClick={() => handleAction(c, 'execute')}
                            className="px-2 py-1.5 flex items-center gap-1 rounded bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors text-xs font-medium"
                          >
                            <RefreshCw size={12} /> 开始履约
                          </button>
                        )}

                        {c.status === 'executing' && (
                          <button
                            onClick={() => handleAction(c, 'complete')}
                            className="px-2 py-1.5 flex items-center gap-1 rounded bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-colors text-xs font-medium"
                          >
                            <CheckCircle size={12} /> 完成合同
                          </button>
                        )}

                        {(c.status === 'draft' || c.status === 'pending' || c.status === 'signed') && (
                          <button
                            onClick={() => handleAction(c, 'terminate')}
                            className="px-2 py-1.5 flex items-center gap-1 rounded border border-border hover:bg-red-50 hover:text-destructive transition-colors text-xs font-medium text-muted-foreground"
                            title="终止合同"
                          >
                            <XCircle size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                    未找到符合条件的合同
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          total={filtered.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={() => setPage(1)}
        />
      </div>

      {/* 详情面板 */}
      {detailContract && (
        <DetailPanel
          contract={detailContract}
          onClose={() => setDetailContract(null)}
          onNavigateProject={(pid) => {
            setDetailContract(null);
            if (onNavigateToProject) onNavigateToProject(pid);
          }}
        />
      )}

      {/* 新建/编辑合同弹窗 */}
      <ContractFormModal
        isOpen={formModal.isOpen}
        mode={formModal.mode}
        initialData={formModal.data}
        onClose={() => setFormModal({ isOpen: false, mode: 'add', data: {} })}
        onSave={handleSaveContract}
      />
    </div>
  );
};

export default ContractPage;
