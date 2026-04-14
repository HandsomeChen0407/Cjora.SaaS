import { useState } from "react";
import {
  Search, CheckCircle, XCircle, Clock, Eye,
  ChevronDown, FileText, User, Calendar, Filter, X, MessageSquare, BookOpen, CreditCard
} from "lucide-react";
import Pagination from "../components/Pagination";
import StatCard from "../components/StatCard";

type ApprovalStatus = "pending" | "approved" | "rejected" | "revoked";
type ApprovalType = "project_creation" | "contract_approval" | "refund" | "split";

interface ApprovalRecord {
  id: string;
  no: string;
  type: ApprovalType;
  title: string;
  projectId: string;
  projectName: string;
  applicant: string;
  applicantRole: string;
  submitTime: string;
  updateTime: string;
  status: ApprovalStatus;
  currentStep: string;
  currentApprover: string;
  totalSteps: number;
  doneSteps: number;
  remark: string;
  logs: ApprovalLog[];
}

interface ApprovalLog {
  id: number;
  time: string;
  action: string;
  operator: string;
  role: string;
  remark: string;
}

const STATUS_LABEL: Record<ApprovalStatus, string> = {
  pending: "审批中",
  approved: "已通过",
  rejected: "已驳回",
  revoked: "已撤回",
};

const STATUS_COLOR: Record<ApprovalStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-500 border-red-200",
  revoked: "bg-slate-100 text-slate-500 border-slate-200",
};

const STATUS_DOT: Record<ApprovalStatus, string> = {
  pending: "bg-amber-400",
  approved: "bg-green-500",
  rejected: "bg-red-500",
  revoked: "bg-slate-400",
};

const TYPE_LABEL: Record<ApprovalType, string> = {
  project_creation: "项目立项",
  contract_approval: "合同审批",
  refund: "预留退款",
  split: "分账申请"
};

const mockApprovals: ApprovalRecord[] = [
  {
    id: "AP001", no: "AP-2024-001", type: "project_creation",
    title: "深圳储能基站项目A 立项申请",
    projectId: "P001", projectName: "深圳储能基站项目A",
    applicant: "张伟", applicantRole: "项目创建人",
    submitTime: "2024-06-10 09:32", updateTime: "2024-06-10 14:20",
    status: "approved", currentStep: "已完成", currentApprover: "-",
    totalSteps: 2, doneSteps: 2, remark: "项目资料完整，技术方案可行",
    logs: [
      { id: 1, time: "2024-06-10 14:20", action: "审批通过", operator: "王财务", role: "财务", remark: "财务核算通过，同意立项" },
      { id: 2, time: "2024-06-10 11:05", action: "审批通过", operator: "李主管", role: "销售主管", remark: "销售数据核实无误" },
      { id: 3, time: "2024-06-10 09:32", action: "提交审批", operator: "张伟", role: "项目创建人", remark: "项目资料已完善，申请立项" },
    ],
  },
  {
    id: "AP002", no: "AP-2024-002", type: "contract_approval",
    title: "苏州市智能电网科技 首签合同审批",
    projectId: "CT-2024-004", projectName: "关联：苏州市智能电网科技",
    applicant: "李明", applicantRole: "销售",
    submitTime: "2024-06-12 10:15", updateTime: "2024-06-12 10:15",
    status: "pending", currentStep: "销售合同初审", currentApprover: "销售主管",
    totalSteps: 2, doneSteps: 0, remark: "请主管审核新客户合同",
    logs: [
      { id: 1, time: "2024-06-12 10:15", action: "提交审批", operator: "李明", role: "销售", remark: "请主管审核新客户合同" },
    ],
  },
  {
    id: "AP003", no: "AP-2024-003", type: "project_creation",
    title: "北京调峰储能项目 立项申请",
    projectId: "P004", projectName: "北京调峰储能项目",
    applicant: "刘洋", applicantRole: "项目创建人",
    submitTime: "2024-05-20 15:00", updateTime: "2024-05-22 09:45",
    status: "rejected", currentStep: "-", currentApprover: "-",
    totalSteps: 2, doneSteps: 1, remark: "材料不全，请补充BMS规格说明",
    logs: [
      { id: 1, time: "2024-05-22 09:45", action: "审批驳回", operator: "李主管", role: "销售主管", remark: "材料不全，请补充BMS规格说明" },
      { id: 2, time: "2024-05-20 15:00", action: "提交审批", operator: "刘洋", role: "项目创建人", remark: "请审核" },
    ],
  },
  {
    id: "AP005", no: "AP-2024-005", type: "contract_approval",
    title: "成都新能源汽车充电站 合同续签审批",
    projectId: "CT-2024-005", projectName: "关联：成都智储能源科技",
    applicant: "赵磊", applicantRole: "销售",
    submitTime: "2024-04-10 08:00", updateTime: "2024-04-10 09:15",
    status: "revoked", currentStep: "-", currentApprover: "-",
    totalSteps: 2, doneSteps: 0, remark: "需要修改金额后重新提交",
    logs: [
      { id: 1, time: "2024-04-10 09:15", action: "撤回审批", operator: "赵磊", role: "销售", remark: "需要修改金额后重新提交" },
      { id: 2, time: "2024-04-10 08:00", action: "提交审批", operator: "赵磊", role: "销售", remark: "申请续签" },
    ],
  },
];

interface ApprovalDetailDrawerProps {
  record: ApprovalRecord | null;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

const ApprovalDetailDrawer = ({
  record,
  onClose,
  onApprove,
  onReject,
}: ApprovalDetailDrawerProps) => {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  if (!record) return null;

  const canAction = record.status === "pending";

  const handleReject = () => {
    if (showRejectInput) {
      onReject(record.id);
      setShowRejectInput(false);
      setRejectReason("");
    } else {
      setShowRejectInput(true);
    }
  };

  const progressPct = record.totalSteps > 0
    ? Math.round((record.doneSteps / record.totalSteps) * 100)
    : 0;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full z-50 flex flex-col bg-card shadow-custom"
        style={{ width: 480, borderLeft: "1px solid var(--border)" }}
      >
        <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-foreground">审批详情</span>
              <span className="text-xs px-2 py-0.5 rounded bg-secondary text-primary font-mono">{record.no}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{record.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bms-card p-4 space-y-4">
            <h4 className="text-sm font-semibold text-foreground">申请信息</h4>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <div className="min-w-36">
                <p className="text-xs text-muted-foreground mb-1">申请类型</p>
                <p className="text-sm font-medium text-foreground">{TYPE_LABEL[record.type]}</p>
              </div>
              <div className="min-w-36">
                <p className="text-xs text-muted-foreground mb-1">关联业务</p>
                <p className="text-sm font-medium text-primary">{record.projectName}</p>
              </div>
              <div className="min-w-36">
                <p className="text-xs text-muted-foreground mb-1">申请人</p>
                <div className="flex items-center gap-1.5">
                  <User size={13} className="text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">{record.applicant}</p>
                  <span className="text-xs text-muted-foreground">({record.applicantRole})</span>
                </div>
              </div>
              <div className="min-w-36">
                <p className="text-xs text-muted-foreground mb-1">提交时间</p>
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-muted-foreground" />
                  <p className="text-sm text-foreground">{record.submitTime}</p>
                </div>
              </div>
              <div className="min-w-36">
                <p className="text-xs text-muted-foreground mb-1">当前状态</p>
                <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded border font-medium ${STATUS_COLOR[record.status]}`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${STATUS_DOT[record.status]}`}></span>
                  {STATUS_LABEL[record.status]}
                </span>
              </div>
              {record.status === "pending" && (
                <div className="min-w-36">
                  <p className="text-xs text-muted-foreground mb-1">当前审批人</p>
                  <p className="text-sm font-medium text-amber-600">{record.currentApprover}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bms-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">审批进度</h4>
              <span className="text-xs text-muted-foreground">{record.doneSteps}/{record.totalSteps} 步</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPct}%`,
                  background: record.status === "rejected" ? "var(--destructive)" : "var(--primary)",
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>提交申请</span>
              <span>初审</span>
              <span>复审</span>
              <span>流程结束</span>
            </div>
          </div>

          {canAction && (
            <div className="bms-card p-4 space-y-3 border-primary/20">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MessageSquare size={15} className="text-primary" />
                审批操作
              </h4>
              <p className="text-xs text-muted-foreground">
                当前节点：<span className="font-medium text-amber-600">{record.currentStep}</span>，
                待审批人：<span className="font-medium text-foreground">{record.currentApprover}</span>
              </p>
              {showRejectInput && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">驳回原因（必填）</label>
                  <textarea
                    className="bms-input w-full text-sm min-h-[80px] resize-none"
                    placeholder="请填写驳回理由..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleReject}
                  className="flex-1 py-2 rounded border border-destructive/40 text-destructive text-sm font-medium hover:bg-red-50 transition-colors"
                >
                  {showRejectInput ? "确认驳回" : "驳回"}
                </button>
                <button
                  onClick={() => onApprove(record.id)}
                  className="flex-1 bms-btn-primary py-2 text-sm"
                >
                  <CheckCircle size={14} className="inline mr-1.5" />
                  同意通过
                </button>
              </div>
              {showRejectInput && (
                <button
                  onClick={() => setShowRejectInput(false)}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  取消驳回
                </button>
              )}
            </div>
          )}

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">审批记录</h4>
            {record.logs.length > 0 ? (
              <div className="space-y-3">
                {record.logs.map((log, i) => {
                  const isReject = log.action === "审批驳回";
                  const isRevoke = log.action === "撤回审批";
                  const isApprove = log.action === "审批通过";
                  return (
                    <div key={log.id} className="flex gap-3">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isApprove
                              ? "bg-green-50 border border-green-200"
                              : isReject
                              ? "bg-red-50 border border-red-200"
                              : isRevoke
                              ? "bg-orange-50 border border-orange-200"
                              : "bg-secondary border border-border"
                          }`}
                        >
                          {isApprove ? (
                            <CheckCircle size={13} className="text-green-600" />
                          ) : isReject ? (
                            <XCircle size={13} className="text-red-500" />
                          ) : (
                            <Clock size={13} className="text-muted-foreground" />
                          )}
                        </div>
                        {i < record.logs.length - 1 && (
                          <div className="w-px flex-1 bg-border mt-1 min-h-4" />
                        )}
                      </div>
                      <div className="flex-1 bg-muted/30 border border-border rounded-lg p-3 mb-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold ${
                                isReject
                                  ? "text-destructive"
                                  : isRevoke
                                  ? "text-orange-500"
                                  : isApprove
                                  ? "text-green-600"
                                  : "text-foreground"
                              }`}
                            >
                              {log.action}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-primary">
                              {log.role}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">{log.time}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground mr-1">{log.operator}：</span>
                          {log.remark || "无备注"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                暂无审批记录
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

const ApprovalListPage = () => {
  const [approvals, setApprovals] = useState<ApprovalRecord[]>(mockApprovals);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | "all">("all");
  const [selectedRecord, setSelectedRecord] = useState<ApprovalRecord | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = approvals.filter((a) => {
    const matchSearch =
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.projectName.toLowerCase().includes(search.toLowerCase()) ||
      a.applicant.toLowerCase().includes(search.toLowerCase()) ||
      a.no.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleApprove = (id: string) => {
    setApprovals((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const newDone = a.doneSteps + 1;
        const isComplete = newDone >= a.totalSteps;
        return {
          ...a,
          status: isComplete ? "approved" : "pending",
          doneSteps: newDone,
          currentStep: isComplete ? "已完成" : "复审",
          currentApprover: isComplete ? "-" : "财务",
          updateTime: new Date().toLocaleString(),
          logs: [
            {
              id: Date.now(),
              time: new Date().toLocaleString(),
              action: isComplete ? "审批通过（终审）" : "审批通过",
              operator: "当前用户",
              role: newDone === 1 ? "销售主管" : "财务",
              remark: isComplete ? "审核通过，同意执行" : "信息核实无误",
            },
            ...a.logs,
          ],
        };
      })
    );
    setSelectedRecord(null);
    showToast("审批通过成功");
  };

  const handleReject = (id: string) => {
    setApprovals((prev) =>
      prev.map((a) =>
        a.id !== id
          ? a
          : {
              ...a,
              status: "rejected" as ApprovalStatus,
              currentStep: "-",
              currentApprover: "-",
              updateTime: new Date().toLocaleString(),
              logs: [
                {
                  id: Date.now(),
                  time: new Date().toLocaleString(),
                  action: "审批驳回",
                  operator: "当前用户",
                  role: "审批人",
                  remark: "材料不符合要求，请重新提交",
                },
                ...a.logs,
              ],
            }
      )
    );
    setSelectedRecord(null);
    showToast("已驳回该申请", "error");
  };

  const pendingCount = approvals.filter((a) => a.status === "pending").length;
  const approvedCount = approvals.filter((a) => a.status === "approved").length;
  const rejectedCount = approvals.filter((a) => a.status === "rejected").length;
  const totalCount = approvals.length;

  const statusTabs: { key: ApprovalStatus | "all"; label: string; count: number }[] = [
    { key: "all", label: "全部", count: totalCount },
    { key: "pending", label: "审批中", count: pendingCount },
    { key: "approved", label: "已通过", count: approvedCount },
    { key: "rejected", label: "已驳回", count: rejectedCount },
    { key: "revoked", label: "已撤回", count: approvals.filter((a) => a.status === "revoked").length },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 animate-in fade-in duration-300 relative">
      {toast && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 px-4 py-3 rounded-lg shadow-custom text-sm font-medium animate-in fade-in slide-in-from-top-5 ${
            toast.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-600 border border-red-200"
          }`}
        >
          {toast.type === "success" ? <CheckCircle size={15} /> : <XCircle size={15} />}
          {toast.msg}
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1">
          <StatCard
            title="审批总数"
            value={String(totalCount)}
            iconName="activity"
            colorType="blue"
            yoyValue="+12%"
            yoyUp={true}
            momValue="+3%"
            momUp={true}
          />
        </div>
        <div className="flex-1">
          <StatCard
            title="审批中"
            value={String(pendingCount)}
            iconName="clock"
            colorType="orange"
            yoyValue="+5%"
            yoyUp={true}
            momValue="+2%"
            momUp={true}
          />
        </div>
        <div className="flex-1">
          <StatCard
            title="已通过"
            value={String(approvedCount)}
            iconName="check"
            colorType="green"
            yoyValue="+18%"
            yoyUp={true}
            momValue="+8%"
            momUp={true}
          />
        </div>
        <div className="flex-1">
          <StatCard
            title="已驳回"
            value={String(rejectedCount)}
            iconName="alert"
            colorType="red"
            yoyValue="-5%"
            yoyUp={false}
            momValue="-1%"
            momUp={false}
          />
        </div>
      </div>

      <div className="bms-card p-0">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground">通用审批列表</h3>
          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="搜索申请编号、项目、标题..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="bms-input pl-8 pr-8 w-64 text-sm"
              />
              <Search size={14} className="absolute left-2.5 text-muted-foreground" />
              {search && (
                <button
                  onClick={() => { setSearch(""); setPage(1); }}
                  className="absolute right-2.5 p-0.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <div className="relative flex items-center gap-1">
              <Filter size={14} className="text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="px-5 border-b border-border flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setStatusFilter(tab.key); setPage(1); }}
              className={`py-3 px-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all flex items-center gap-1.5 ${
                statusFilter === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  statusFilter === tab.key
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bms-table-header text-left">
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">申请编号</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">申请标题</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">业务类型</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">申请人</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">提交时间</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">当前节点</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">进度</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">状态</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length > 0 ? (
                paged.map((a, i) => (
                  <tr
                    key={a.id}
                    className={`table-row-hover text-sm transition-colors ${i % 2 === 0 ? "" : "bg-muted/30"}`}
                  >
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{a.no}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {a.type === 'project_creation' ? <BookOpen size={14} className="text-primary flex-shrink-0" /> : <FileText size={14} className="text-green-600 flex-shrink-0" />}
                        <span className="font-medium text-foreground max-w-48 truncate" title={a.title}>{a.title}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        a.type === 'project_creation' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                      }`}>
                        {TYPE_LABEL[a.type]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <User size={13} className="text-muted-foreground" />
                        <span className="text-foreground">{a.applicant}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">{a.submitTime}</td>
                    <td className="px-5 py-3">
                      {a.status === "pending" ? (
                        <span className="text-amber-600 text-xs font-medium flex items-center gap-1">
                          <Clock size={12} />
                          {a.currentStep} · {a.currentApprover}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 min-w-24">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${a.totalSteps > 0 ? (a.doneSteps / a.totalSteps) * 100 : 0}%`,
                              background: a.status === "rejected" ? "var(--destructive)" : "var(--primary)",
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {a.doneSteps}/{a.totalSteps}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center text-xs px-2 py-0.5 rounded border font-medium ${STATUS_COLOR[a.status]}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${STATUS_DOT[a.status]}`}></span>
                        {STATUS_LABEL[a.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedRecord(a)}
                          className="px-2 py-1.5 flex items-center gap-1 rounded border border-border hover:bg-muted transition-colors text-xs font-medium text-foreground"
                        >
                          <Eye size={13} className="text-muted-foreground" />
                          查看详情
                        </button>
                        {a.status === "pending" && (
                          <button
                            onClick={() => setSelectedRecord(a)}
                            className="px-2 py-1.5 flex items-center gap-1 rounded bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors text-xs font-medium text-amber-700"
                          >
                            <ChevronDown size={12} />
                            待审批
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-muted-foreground text-sm">
                    没有找到匹配的审批记录
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
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        />
      </div>

      {selectedRecord && (
        <ApprovalDetailDrawer
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
};

export default ApprovalListPage;