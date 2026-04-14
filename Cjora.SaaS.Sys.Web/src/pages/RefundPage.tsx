import { useState } from "react";
import React from "react";
import {
  Search, Plus, X, CheckCircle, Clock, XCircle, Eye,
  FileText, Building2, RotateCcw, ChevronDown,
  CalendarDays, DollarSign, AlertTriangle, MessageSquare
} from "lucide-react";
import Pagination from "../components/Pagination";

// ===================== Types =====================

export type RefundStatus = "pending" | "approved" | "rejected";
export type RefundReason = "quality" | "cancel" | "overpay" | "other";

export interface RefundRecord {
  id: string;
  no: string;              // 退款单号 REF-2024-001
  contractId: string;
  contractNo: string;
  customerName: string;
  linkedPaymentId?: string;  // 关联收款记录ID
  linkedPaymentNo?: string;  // 关联收款单号
  amount: number;
  reason: RefundReason;
  reasonDetail?: string;   // 详细说明
  note?: string;
  status: RefundStatus;
  submittedBy: string;
  submittedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectReason?: string;
  expectedAt?: string;     // 预计退款日期
}

// ===================== Constants =====================

const REASON_MAP: Record<RefundReason, { label: string; color: string }> = {
  quality:  { label: "质量问题", color: "bg-red-50 text-red-700 border-red-200" },
  cancel:   { label: "合同取消", color: "bg-orange-50 text-orange-700 border-orange-200" },
  overpay:  { label: "多收退还", color: "bg-blue-50 text-blue-700 border-blue-200" },
  other:    { label: "其他原因", color: "bg-slate-50 text-slate-600 border-slate-200" },
};

const STATUS_MAP: Record<RefundStatus, { label: string; color: string; icon: string }> = {
  pending:  { label: "待审批", color: "bg-amber-50 text-amber-700 border border-amber-200", icon: "clock" },
  approved: { label: "已执行", color: "bg-green-50 text-green-700 border border-green-200", icon: "check" },
  rejected: { label: "已驳回", color: "bg-red-50 text-red-600 border border-red-200",       icon: "x" },
};

// Mock 收款记录（用于关联）
const MOCK_PAYMENTS = [
  { id: "PAY001", no: "PAY-2024-001", contractId: "C001", contractNo: "CT-2024-001", customerName: "深圳储能科技有限公司", amount: 600000 },
  { id: "PAY002", no: "PAY-2024-002", contractId: "C001", contractNo: "CT-2024-001", customerName: "深圳储能科技有限公司", amount: 300000 },
  { id: "PAY003", no: "PAY-2024-003", contractId: "C002", contractNo: "CT-2024-002", customerName: "苏州市智能电网科技", amount: 400000 },
];

const MOCK_CONTRACTS = [
  { id: "C001", no: "CT-2024-001", customerName: "深圳储能科技有限公司" },
  { id: "C002", no: "CT-2024-002", customerName: "苏州市智能电网科技" },
  { id: "C003", no: "CT-2024-003", customerName: "武汉绿色动力有限责任公司" },
  { id: "C004", no: "CT-2023-004", customerName: "北京绿能电池有限公司" },
];

const initialRefunds: RefundRecord[] = [
  {
    id: "REF001", no: "REF-2024-001",
    contractId: "C001", contractNo: "CT-2024-001", customerName: "深圳储能科技有限公司",
    linkedPaymentId: "PAY001", linkedPaymentNo: "PAY-2024-001",
    amount: 50000, reason: "quality",
    reasonDetail: "第3批次Pack模组出厂检测不达标，协商退还50,000元",
    status: "approved", submittedBy: "李明", submittedAt: "2024-04-10",
    approvedBy: "王总监", approvedAt: "2024-04-12", expectedAt: "2024-04-15",
  },
  {
    id: "REF002", no: "REF-2024-002",
    contractId: "C002", contractNo: "CT-2024-002", customerName: "苏州市智能电网科技",
    linkedPaymentId: "PAY003", linkedPaymentNo: "PAY-2024-003",
    amount: 20000, reason: "overpay",
    reasonDetail: "预付款多转20,000元，需原路退回",
    status: "pending", submittedBy: "陈芳", submittedAt: "2024-09-05",
    expectedAt: "2024-09-10",
  },
  {
    id: "REF003", no: "REF-2024-003",
    contractId: "C003", contractNo: "CT-2024-003", customerName: "武汉绿色动力有限责任公司",
    amount: 100000, reason: "cancel",
    reasonDetail: "客户因内部资金问题取消合同，退还已付定金",
    note: "需财务核实原始凭证后执行",
    status: "rejected", submittedBy: "李明", submittedAt: "2024-08-20",
    approvedBy: "王总监", approvedAt: "2024-08-22",
    rejectReason: "合同仍在草稿状态，暂无有效收款记录，请先确认收款来源",
  },
];

// ===================== Helper =====================

const formatAmount = (n: number) =>
  `¥${n.toLocaleString("zh-CN", { minimumFractionDigits: 0 })}`;

const StatusBadge = ({ status }: { status: RefundStatus }) => {
  const cfg = STATUS_MAP[status];
  const icons: Record<string, React.ReactElement> = {
    clock: <Clock size={11} />,
    check: <CheckCircle size={11} />,
    x:     <XCircle size={11} />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {icons[cfg.icon]}
      {cfg.label}
    </span>
  );
};

const ReasonBadge = ({ reason }: { reason: RefundReason }) => {
  const cfg = REASON_MAP[reason];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
};

// ===================== Detail Panel =====================

const DetailPanel = ({
  record,
  onClose,
  onApprove,
  onReject,
}: {
  record: RefundRecord;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject:  (id: string, reason: string) => void;
}) => {
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    onReject(record.id, rejectReason);
    setShowRejectInput(false);
    setRejectReason("");
  };

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-end" onClick={onClose}>
      <div
        className="h-full w-full max-w-md bg-card shadow-custom overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <div className="font-semibold text-foreground text-base">{record.no}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{record.customerName}</div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={record.status} />
            <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
              <X size={16} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {/* Amount Hero */}
          <div className="rounded-xl p-5 text-center" style={{ background: "var(--accent)" }}>
            <div className="text-xs text-muted-foreground mb-1">退款金额</div>
            <div className="text-3xl font-bold text-destructive">{formatAmount(record.amount)}</div>
            <div className="mt-2">
              <ReasonBadge reason={record.reason} />
            </div>
          </div>

          {/* Basic Info */}
          <div className="space-y-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">基本信息</div>
            {([
              ["合同编号",   record.contractNo],
              ["关联收款",   record.linkedPaymentNo || "无直接关联"],
              ["退款原因",   REASON_MAP[record.reason].label],
              ["原因说明",   record.reasonDetail || "-"],
              ["预计退款日", record.expectedAt || "-"],
              ["备注",       record.note || "-"],
            ] as [string, string][]).map(([label, val]) => (
              <div key={label} className="flex items-start justify-between py-1.5 border-b border-border last:border-0">
                <span className="text-xs text-muted-foreground w-24 flex-shrink-0">{label}</span>
                <span className="text-xs text-foreground text-right flex-1">{val}</span>
              </div>
            ))}
          </div>

          {/* Audit Trail */}
          <div className="space-y-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">审批记录</div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={12} className="text-primary-foreground" />
                </div>
                <div>
                  <div className="text-xs font-medium text-foreground">提交申请</div>
                  <div className="text-xs text-muted-foreground">{record.submittedBy} · {record.submittedAt}</div>
                </div>
              </div>
              {record.status !== "pending" && (
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    record.status === "approved" ? "bg-green-500" : "bg-destructive"
                  }`}>
                    {record.status === "approved"
                      ? <CheckCircle size={12} className="text-primary-foreground" />
                      : <XCircle size={12} className="text-primary-foreground" />
                    }
                  </div>
                  <div>
                    <div className="text-xs font-medium text-foreground">
                      {record.status === "approved" ? "审批通过 · 退款执行" : "审批驳回"}
                    </div>
                    <div className="text-xs text-muted-foreground">{record.approvedBy} · {record.approvedAt}</div>
                    {record.rejectReason && (
                      <div className="text-xs text-destructive mt-0.5">{record.rejectReason}</div>
                    )}
                  </div>
                </div>
              )}
              {record.status === "pending" && (
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center flex-shrink-0">
                    <Clock size={10} className="text-muted-foreground" />
                  </div>
                  <div className="text-xs text-muted-foreground">等待审批中…</div>
                </div>
              )}
            </div>
          </div>

          {/* Reject reason input */}
          {showRejectInput && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">驳回原因</div>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                rows={3}
                placeholder="请填写驳回原因…"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  className="flex-1 py-1.5 text-xs font-medium rounded-lg text-primary-foreground bg-destructive hover:opacity-90 transition-opacity"
                >
                  确认驳回
                </button>
                <button
                  onClick={() => { setShowRejectInput(false); setRejectReason(""); }}
                  className="flex-1 py-1.5 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {record.status === "pending" && !showRejectInput && (
          <div className="p-5 border-t border-border flex gap-3">
            <button
              onClick={() => setShowRejectInput(true)}
              className="flex-1 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
            >
              驳回
            </button>
            <button
              onClick={() => onApprove(record.id)}
              className="flex-1 py-2 text-sm font-medium rounded-lg text-primary-foreground bg-primary hover:opacity-90 transition-opacity"
            >
              通过 · 执行退款
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ===================== Add Modal =====================

const AddModal = ({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: Omit<RefundRecord, "id" | "no" | "status" | "submittedAt">) => void;
}) => {
  const [contractId, setContractId] = useState("");
  const [linkedPaymentId, setLinkedPaymentId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState<RefundReason>("quality");
  const [reasonDetail, setReasonDetail] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedContract = MOCK_CONTRACTS.find((c) => c.id === contractId);
  const availablePayments = MOCK_PAYMENTS.filter((p) => p.contractId === contractId);
  const selectedPayment = MOCK_PAYMENTS.find((p) => p.id === linkedPaymentId);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!contractId) e.contractId = "请选择关联合同";
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) e.amount = "请输入有效退款金额";
    if (!reasonDetail.trim()) e.reasonDetail = "请填写退款原因说明";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    if (!selectedContract) return;
    onSubmit({
      contractId,
      contractNo:       selectedContract.no,
      customerName:     selectedContract.customerName,
      linkedPaymentId:  linkedPaymentId || undefined,
      linkedPaymentNo:  selectedPayment?.no,
      amount:           Number(amount),
      reason,
      reasonDetail:     reasonDetail || undefined,
      expectedAt:       expectedAt || undefined,
      note:             note || undefined,
      submittedBy:      "李明",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card rounded-2xl w-full max-w-lg shadow-custom p-6 space-y-5 max-h-screen overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold text-foreground">新增退款申请</div>
            <div className="text-xs text-muted-foreground mt-0.5">退款提交后进入审批流程，审批通过后执行转出</div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Contract */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">关联合同 <span className="text-destructive">*</span></label>
            <div className="relative">
              <select
                value={contractId}
                onChange={(e) => { setContractId(e.target.value); setLinkedPaymentId(""); }}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm appearance-none bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">请选择合同</option>
                {MOCK_CONTRACTS.map((c) => (
                  <option key={c.id} value={c.id}>{c.no} · {c.customerName}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            {errors.contractId && <div className="text-xs text-destructive mt-1">{errors.contractId}</div>}
          </div>

          {/* Linked Payment */}
          {contractId && (
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">关联收款单（可选）</label>
              <div className="relative">
                <select
                  value={linkedPaymentId}
                  onChange={(e) => setLinkedPaymentId(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm appearance-none bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">不关联具体收款</option>
                  {availablePayments.map((p) => (
                    <option key={p.id} value={p.id}>{p.no} · {formatAmount(p.amount)}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
              {availablePayments.length === 0 && (
                <div className="text-xs text-muted-foreground mt-1">该合同暂无已审批收款记录</div>
              )}
            </div>
          )}

          {/* Amount + ExpectedAt */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-foreground mb-1.5 block">退款金额（元） <span className="text-destructive">*</span></label>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-border rounded-lg pl-8 pr-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {errors.amount && <div className="text-xs text-destructive mt-1">{errors.amount}</div>}
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-foreground mb-1.5 block">预计退款日</label>
              <div className="relative">
                <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="date"
                  value={expectedAt}
                  onChange={(e) => setExpectedAt(e.target.value)}
                  className="w-full border border-border rounded-lg pl-8 pr-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">退款原因分类</label>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(REASON_MAP) as RefundReason[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    reason === r
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {REASON_MAP[r].label}
                </button>
              ))}
            </div>
          </div>

          {/* Reason Detail */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">原因说明 <span className="text-destructive">*</span></label>
            <textarea
              value={reasonDetail}
              onChange={(e) => setReasonDetail(e.target.value)}
              placeholder="请详细描述退款原因，便于审批人核实…"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm resize-none bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
            />
            {errors.reasonDetail && <div className="text-xs text-destructive mt-1">{errors.reasonDetail}</div>}
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">补充备注</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="如：需财务核实原始凭证…"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2 text-sm font-medium rounded-lg text-primary-foreground bg-primary hover:opacity-90 transition-opacity"
          >
            提交退款申请
          </button>
        </div>
      </div>
    </div>
  );
};

// ===================== Main Page =====================

const RefundPage = () => {
  const [refunds, setRefunds] = useState<RefundRecord[]>(initialRefunds);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<RefundStatus | "all">("all");
  const [selectedRecord, setSelectedRecord] = useState<RefundRecord | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 8;

  const filtered = refunds.filter((r) => {
    const matchSearch =
      r.no.toLowerCase().includes(search.toLowerCase()) ||
      r.contractNo.toLowerCase().includes(search.toLowerCase()) ||
      r.customerName.includes(search);
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Stats
  const totalApproved = refunds.filter((r) => r.status === "approved").reduce((s, r) => s + r.amount, 0);
  const totalPending  = refunds.filter((r) => r.status === "pending").reduce((s, r) => s + r.amount, 0);
  const countPending  = refunds.filter((r) => r.status === "pending").length;
  const countApproved = refunds.filter((r) => r.status === "approved").length;

  const handleAdd = (data: Omit<RefundRecord, "id" | "no" | "status" | "submittedAt">) => {
    const newId = `REF${String(refunds.length + 1).padStart(3, "0")}`;
    const newNo = `REF-2024-${String(refunds.length + 1).padStart(3, "0")}`;
    const newRecord: RefundRecord = {
      ...data,
      id: newId,
      no: newNo,
      status: "pending",
      submittedAt: new Date().toISOString().slice(0, 10),
    };
    setRefunds((prev) => [newRecord, ...prev]);
    setShowAdd(false);
    console.log(`[Refund] 新增退款申请: ${newNo}，合同 ${data.contractNo}，金额 ${data.amount}`);
  };

  const handleApprove = (id: string) => {
    setRefunds((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: "approved", approvedBy: "王总监", approvedAt: new Date().toISOString().slice(0, 10) }
          : r
      )
    );
    setSelectedRecord((prev) =>
      prev?.id === id ? { ...prev, status: "approved", approvedBy: "王总监", approvedAt: new Date().toISOString().slice(0, 10) } : prev
    );
    console.log(`[Refund] 审批通过: ${id}`);
  };

  const handleReject = (id: string, reason: string) => {
    setRefunds((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: "rejected", approvedBy: "王总监", approvedAt: new Date().toISOString().slice(0, 10), rejectReason: reason }
          : r
      )
    );
    setSelectedRecord((prev) =>
      prev?.id === id
        ? { ...prev, status: "rejected", approvedBy: "王总监", approvedAt: new Date().toISOString().slice(0, 10), rejectReason: reason }
        : prev
    );
    console.log(`[Refund] 审批驳回: ${id}，原因: ${reason}`);
  };

  return (
    <div data-cmp="RefundPage" className="flex flex-col h-full overflow-hidden">
      {/* Stats Bar */}
      <div className="px-5 pt-4 pb-3 flex gap-3 flex-shrink-0">
        {[
          { label: "累计已执行退款", value: formatAmount(totalApproved), sub: `${countApproved} 笔`, icon: <RotateCcw size={18} />, accent: false },
          { label: "待审批退款",     value: formatAmount(totalPending),  sub: `${countPending} 笔待处理`, icon: <AlertTriangle size={18} />, accent: true },
          { label: "退款总笔数",     value: `${refunds.length} 笔`,     sub: "全部记录", icon: <FileText size={18} />, accent: false },
        ].map((s) => (
          <div key={s.label} className="flex-1 bg-card rounded-xl px-4 py-3 shadow-custom flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
              s.accent ? "bg-amber-50 text-amber-600" : "bg-accent text-primary"
            }`}>
              {s.icon}
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold text-foreground truncate">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label} · {s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="px-5 pb-3 flex items-center gap-3 flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="搜索退款单号 / 合同 / 客户"
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {([["all", "全部"], ["pending", "待审批"], ["approved", "已执行"], ["rejected", "已驳回"]] as [string, string][]).map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => { setFilterStatus(val as RefundStatus | "all"); setCurrentPage(1); }}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                filterStatus === val ? "bg-card text-foreground shadow-custom font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:opacity-90 transition-opacity ml-auto"
        >
          <Plus size={14} /> 新增退款
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-5 pb-3">
        <div className="bg-card rounded-xl shadow-custom overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["退款单号", "关联合同", "客户名称", "退款金额", "退款原因", "关联收款", "预计退款日", "状态", "操作"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-muted-foreground text-sm">暂无退款记录</td>
                </tr>
              )}
              {paged.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-destructive font-medium">{r.no}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <FileText size={12} className="text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-foreground">{r.contractNo}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Building2 size={12} className="text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-foreground max-w-32 truncate">{r.customerName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-destructive">{formatAmount(r.amount)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <ReasonBadge reason={r.reason} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                    {r.linkedPaymentNo || <span className="text-muted-foreground/50">-</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {r.expectedAt || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedRecord(r)}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Eye size={12} /> 详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 pb-4 flex-shrink-0">
          <Pagination total={filtered.length} page={currentPage} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} onPageSizeChange={() => {}} />
        </div>
      )}

      {/* Detail Panel */}
      {selectedRecord && (
        <DetailPanel
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      {/* Add Modal */}
      {showAdd && (
        <AddModal onClose={() => setShowAdd(false)} onSubmit={handleAdd} />
      )}
    </div>
  );
};

export default RefundPage;
