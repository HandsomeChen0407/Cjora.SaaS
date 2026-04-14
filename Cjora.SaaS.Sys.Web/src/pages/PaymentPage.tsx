import { useState } from "react";
import React from "react";
import {
  Search, Plus, X, CheckCircle, Clock, XCircle, Eye,
  DollarSign, FileText, Upload, Building2, CreditCard,
  CalendarDays, ChevronDown, CheckSquare, AlertCircle, MoreHorizontal, Filter
} from "lucide-react";
import Pagination from "../components/Pagination";

// ===================== Types =====================

export type PaymentStatus = "pending" | "approved" | "rejected";
export type PaymentMethod = "bank_transfer" | "wire" | "check" | "other";

export interface PaymentRecord {
  id: string;
  no: string;                // 收款单号 PAY-2024-001
  contractId: string;
  contractNo: string;
  customerName: string;
  amount: number;
  receivedAt: string;        // 收款时间
  method: PaymentMethod;
  voucherNo?: string;        // 凭证号
  note?: string;
  status: PaymentStatus;
  submittedBy: string;
  submittedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectReason?: string;
}

// ===================== Constants =====================

const METHOD_MAP: Record<PaymentMethod, { label: string }> = {
  bank_transfer: { label: "银行转账" },
  wire:          { label: "电汇" },
  check:         { label: "支票" },
  other:         { label: "其他" },
};

const STATUS_MAP: Record<PaymentStatus, { label: string; color: string; icon: string }> = {
  pending:  { label: "审批中", color: "bg-amber-50 text-amber-700 border border-amber-200",   icon: "clock" },
  approved: { label: "已到账", color: "bg-green-50 text-green-700 border border-green-200",   icon: "check" },
  rejected: { label: "已驳回", color: "bg-red-50 text-red-600 border border-red-200",         icon: "x" },
};

const MOCK_CONTRACTS = [
  { id: "C001", no: "CT-2024-001", customerName: "深圳储能科技有限公司",  totalAmount: 1500000 },
  { id: "C002", no: "CT-2024-002", customerName: "苏州市智能电网科技",     totalAmount: 2000000 },
  { id: "C003", no: "CT-2024-003", customerName: "武汉绿色动力有限责任公司", totalAmount: 850000 },
  { id: "C004", no: "CT-2023-004", customerName: "北京绿能电池有限公司",   totalAmount: 480000 },
];

const initialPayments: PaymentRecord[] = [
  {
    id: "PAY001", no: "PAY-2024-001",
    contractId: "C001", contractNo: "CT-2024-001", customerName: "深圳储能科技有限公司",
    amount: 600000, receivedAt: "2024-02-15", method: "bank_transfer",
    voucherNo: "ZZ2024021501", note: "首款（40%）",
    status: "approved", submittedBy: "李明", submittedAt: "2024-02-16",
    approvedBy: "王总监", approvedAt: "2024-02-17",
  },
  {
    id: "PAY002", no: "PAY-2024-002",
    contractId: "C001", contractNo: "CT-2024-001", customerName: "深圳储能科技有限公司",
    amount: 300000, receivedAt: "2024-05-10", method: "wire",
    voucherNo: "ZZ2024051001", note: "进度款（20%）",
    status: "approved", submittedBy: "李明", submittedAt: "2024-05-11",
    approvedBy: "王总监", approvedAt: "2024-05-12",
  },
  {
    id: "PAY003", no: "PAY-2024-003",
    contractId: "C002", contractNo: "CT-2024-002", customerName: "苏州市智能电网科技",
    amount: 400000, receivedAt: "2024-08-01", method: "bank_transfer",
    voucherNo: "ZZ2024080101", note: "预付款（20%）",
    status: "approved", submittedBy: "陈芳", submittedAt: "2024-08-02",
    approvedBy: "王总监", approvedAt: "2024-08-03",
  },
  {
    id: "PAY004", no: "PAY-2024-004",
    contractId: "C001", contractNo: "CT-2024-001", customerName: "深圳储能科技有限公司",
    amount: 300000, receivedAt: "2024-10-20", method: "bank_transfer",
    voucherNo: "ZZ2024102001", note: "阶段款（20%）",
    status: "pending", submittedBy: "李明", submittedAt: "2024-10-21",
  },
  {
    id: "PAY005", no: "PAY-2024-005",
    contractId: "C004", contractNo: "CT-2023-004", customerName: "北京绿能电池有限公司",
    amount: 120000, receivedAt: "2023-06-15", method: "check",
    voucherNo: "ZP2023061501",
    status: "rejected", submittedBy: "刘洋", submittedAt: "2023-06-16",
    approvedBy: "王总监", approvedAt: "2023-06-17",
    rejectReason: "凭证号与银行流水不符，请重新上传原始回单",
  },
];

// ===================== Helper =====================

const formatAmount = (n: number) =>
  `¥${n.toLocaleString("zh-CN", { minimumFractionDigits: 0 })}`;

const StatusBadge = ({ status }: { status: PaymentStatus }) => {
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

// ===================== Detail Panel =====================

const DetailPanel = ({
  record,
  onClose,
  onApprove,
  onReject,
}: {
  record: PaymentRecord;
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
            <div className="text-xs text-muted-foreground mb-1">实收金额</div>
            <div className="text-3xl font-bold text-primary">{formatAmount(record.amount)}</div>
          </div>

          {/* Basic Info */}
          <div className="space-y-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">基本信息</div>
            {([
              ["合同编号", record.contractNo],
              ["收款时间", record.receivedAt],
              ["收款方式", METHOD_MAP[record.method].label],
              ["凭证号",   record.voucherNo || "-"],
              ["备注",     record.note || "-"],
            ] as [string, string][]).map(([label, val]) => (
              <div key={label} className="flex items-start justify-between py-1.5 border-b border-border last:border-0">
                <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{label}</span>
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
                      {record.status === "approved" ? "审批通过" : "审批驳回"}
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

          {/* Reject reason if needed */}
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
              通过审批
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
  onSubmit: (data: Omit<PaymentRecord, "id" | "no" | "status" | "submittedAt">) => void;
}) => {
  const [contractId, setContractId] = useState("");
  const [amount, setAmount] = useState("");
  const [receivedAt, setReceivedAt] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [voucherNo, setVoucherNo] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedContract = MOCK_CONTRACTS.find((c) => c.id === contractId);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!contractId) e.contractId = "请选择关联合同";
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) e.amount = "请输入有效金额";
    if (!receivedAt) e.receivedAt = "请选择收款时间";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    if (!selectedContract) return;
    onSubmit({
      contractId,
      contractNo:   selectedContract.no,
      customerName: selectedContract.customerName,
      amount:       Number(amount),
      receivedAt,
      method,
      voucherNo:    voucherNo || undefined,
      note:         note || undefined,
      submittedBy:  "李明",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card rounded-2xl w-full max-w-lg shadow-custom p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold text-foreground">新增收款记录</div>
            <div className="text-xs text-muted-foreground mt-0.5">收款提交后进入审批流程</div>
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
                onChange={(e) => setContractId(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm appearance-none bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">请选择合同</option>
                {MOCK_CONTRACTS.map((c) => (
                  <option key={c.id} value={c.id}>{c.no} · {c.customerName}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            {selectedContract && (
              <div className="mt-1.5 text-xs text-muted-foreground">
                合同金额：{formatAmount(selectedContract.totalAmount)}
              </div>
            )}
            {errors.contractId && <div className="text-xs text-destructive mt-1">{errors.contractId}</div>}
          </div>

          {/* Amount + Date row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-foreground mb-1.5 block">收款金额（元） <span className="text-destructive">*</span></label>
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
              <label className="text-xs font-medium text-foreground mb-1.5 block">收款时间 <span className="text-destructive">*</span></label>
              <div className="relative">
                <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="date"
                  value={receivedAt}
                  onChange={(e) => setReceivedAt(e.target.value)}
                  className="w-full border border-border rounded-lg pl-8 pr-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {errors.receivedAt && <div className="text-xs text-destructive mt-1">{errors.receivedAt}</div>}
            </div>
          </div>

          {/* Method */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">收款方式</label>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(METHOD_MAP) as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    method === m
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {METHOD_MAP[m].label}
                </button>
              ))}
            </div>
          </div>

          {/* Voucher + Note */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-foreground mb-1.5 block">凭证号</label>
              <input
                type="text"
                value={voucherNo}
                onChange={(e) => setVoucherNo(e.target.value)}
                placeholder="银行流水号/支票号…"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-foreground mb-1.5 block">备注</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="如：首款（40%）"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
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
            提交收款申请
          </button>
        </div>
      </div>
    </div>
  );
};

// ===================== Main Page =====================

const PaymentPage = () => {
  const [payments, setPayments] = useState<PaymentRecord[]>(initialPayments);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | "all">("all");
  const [selectedRecord, setSelectedRecord] = useState<PaymentRecord | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 8;

  // Filtered list
  const filtered = payments.filter((p) => {
    const matchSearch =
      p.no.toLowerCase().includes(search.toLowerCase()) ||
      p.contractNo.toLowerCase().includes(search.toLowerCase()) ||
      p.customerName.includes(search);
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Stats
  const totalApproved  = payments.filter((p) => p.status === "approved").reduce((s, p) => s + p.amount, 0);
  const totalPending   = payments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
  const countPending   = payments.filter((p) => p.status === "pending").length;
  const countApproved  = payments.filter((p) => p.status === "approved").length;

  const handleAdd = (data: Omit<PaymentRecord, "id" | "no" | "status" | "submittedAt">) => {
    const newId = `PAY${String(payments.length + 1).padStart(3, "0")}`;
    const newNo = `PAY-2024-${String(payments.length + 1).padStart(3, "0")}`;
    const newRecord: PaymentRecord = {
      ...data,
      id: newId,
      no: newNo,
      status: "pending",
      submittedAt: new Date().toISOString().slice(0, 10),
    };
    setPayments((prev) => [newRecord, ...prev]);
    setShowAdd(false);
    console.log(`[Payment] 新增收款申请: ${newNo}，合同 ${data.contractNo}，金额 ${data.amount}`);
  };

  const handleApprove = (id: string) => {
    setPayments((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: "approved", approvedBy: "王总监", approvedAt: new Date().toISOString().slice(0, 10) }
          : p
      )
    );
    setSelectedRecord((prev) =>
      prev?.id === id ? { ...prev, status: "approved", approvedBy: "王总监", approvedAt: new Date().toISOString().slice(0, 10) } : prev
    );
    console.log(`[Payment] 审批通过: ${id}`);
  };

  const handleReject = (id: string, reason: string) => {
    setPayments((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: "rejected", approvedBy: "王总监", approvedAt: new Date().toISOString().slice(0, 10), rejectReason: reason }
          : p
      )
    );
    setSelectedRecord((prev) =>
      prev?.id === id
        ? { ...prev, status: "rejected", approvedBy: "王总监", approvedAt: new Date().toISOString().slice(0, 10), rejectReason: reason }
        : prev
    );
    console.log(`[Payment] 审批驳回: ${id}，原因: ${reason}`);
  };

  return (
    <div data-cmp="PaymentPage" className="flex flex-col h-full overflow-hidden">
      {/* Stats Bar */}
      <div className="px-5 pt-4 pb-3 flex gap-3 flex-shrink-0">
        {[
          { label: "累计已到账", value: formatAmount(totalApproved), sub: `${countApproved} 笔`, icon: <CheckCircle size={18} />, accent: false },
          { label: "待审批金额", value: formatAmount(totalPending),  sub: `${countPending} 笔待处理`, icon: <Clock size={18} />, accent: true },
          { label: "收款总笔数", value: `${payments.length} 笔`, sub: "全部记录", icon: <FileText size={18} />, accent: false },
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
            placeholder="搜索收款单号 / 合同 / 客户"
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {/* Status filter tabs */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {([["all", "全部"], ["pending", "审批中"], ["approved", "已到账"], ["rejected", "已驳回"]] as [string, string][]).map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => { setFilterStatus(val as PaymentStatus | "all"); setCurrentPage(1); }}
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
          <Plus size={14} /> 新增收款
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-5 pb-3">
        <div className="bg-card rounded-xl shadow-custom overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["收款单号", "关联合同", "客户名称", "收款金额", "收款时间", "收款方式", "凭证号", "状态", "操作"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-muted-foreground text-sm">暂无收款记录</td>
                </tr>
              )}
              {paged.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-primary font-medium">{p.no}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <FileText size={12} className="text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-foreground">{p.contractNo}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Building2 size={12} className="text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-foreground max-w-32 truncate">{p.customerName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-foreground">{formatAmount(p.amount)}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{p.receivedAt}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <CreditCard size={12} className="text-muted-foreground" />
                      <span className="text-xs text-foreground">{METHOD_MAP[p.method].label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{p.voucherNo || "-"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedRecord(p)}
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

export default PaymentPage;
