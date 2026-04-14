import { useState, useEffect } from "react";
import {
  Search, Plus, Target, CheckCircle, Clock, X, AlertTriangle,
  Building, User, Phone, FileText, TrendingUp, ChevronRight, Edit2,
  Trophy, XCircle, Calendar, DollarSign, ArrowRight
} from "lucide-react";
import StatCard from "../components/StatCard";
import Pagination from "../components/Pagination";
import type { Lead } from "./LeadPage";

export type OpportunityStage = 'qualifying' | 'demo' | 'proposal' | 'negotiation' | 'won' | 'lost';

interface Opportunity {
  id: string;
  name: string;
  customerId: string;
  customerName: string;
  contact: string;
  phone: string;
  leadId?: string;
  stage: OpportunityStage;
  amount: number;
  probability: number;
  owner: string;
  expectedCloseDate: string;
  created: string;
  note: string;
}

const STAGE_MAP: Record<OpportunityStage, { label: string; color: string; step: number }> = {
  qualifying: { label: '资质确认', color: 'bg-slate-100 text-slate-600 border-slate-200', step: 1 },
  demo: { label: '方案演示', color: 'bg-blue-50 text-blue-600 border-blue-200', step: 2 },
  proposal: { label: '报价阶段', color: 'bg-purple-50 text-purple-600 border-purple-200', step: 3 },
  negotiation: { label: '谈判中', color: 'bg-amber-50 text-amber-700 border-amber-200', step: 4 },
  won: { label: '已赢单', color: 'bg-green-50 text-green-700 border-green-200', step: 5 },
  lost: { label: '已输单', color: 'bg-red-50 text-red-500 border-red-200', step: 5 },
};

const initialOpportunities: Opportunity[] = [
  {
    id: "OP001", name: "深圳储能科技BMS系统采购", customerId: "C001", customerName: "深圳储能科技有限公司",
    contact: "张伟", phone: "138-0000-0001", leadId: "L005",
    stage: "won", amount: 1500000, probability: 100, owner: "李明",
    expectedCloseDate: "2024-01-06", created: "2024-01-06", note: "已赢单，合同已生效"
  },
  {
    id: "OP002", name: "苏州智能电网BMS集成项目", customerId: "C003", customerName: "苏州市智能电网科技",
    contact: "陈工", phone: "137-5555-6666", leadId: "L003",
    stage: "negotiation", amount: 2000000, probability: 70, owner: "陈芳",
    expectedCloseDate: "2024-08-01", created: "2024-06-10", note: "双方确认需求，进入合同谈判阶段"
  },
  {
    id: "OP003", name: "武汉绿色动力储能解决方案", customerId: "C006", customerName: "武汉绿色动力有限责任公司",
    contact: "刘经理", phone: "138-3333-4444", leadId: "L002",
    stage: "proposal", amount: 850000, probability: 50, owner: "李明",
    expectedCloseDate: "2024-09-15", created: "2024-06-05", note: "已发送报价单，等待回复"
  },
];

interface OpportunityPageProps {
  initialLead?: Lead | null;
  onCreateContract?: (opportunity: Opportunity) => void;
  onNewCustomerCreated?: (customerName: string, contact: string, phone: string, leadId?: string) => void;
}

const OpportunityPage = ({
  initialLead = null,
  onCreateContract,
  onNewCustomerCreated
}: OpportunityPageProps) => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(initialOpportunities);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<OpportunityStage | "active" | "all">("active");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [formModal, setFormModal] = useState<{ isOpen: boolean; mode: 'add' | 'edit'; data: Partial<Opportunity> }>({
    isOpen: false, mode: 'add', data: {}
  });
  const [wonConfirm, setWonConfirm] = useState<{ isOpen: boolean; opp: Opportunity | null }>({ isOpen: false, opp: null });
  const [lostConfirm, setLostConfirm] = useState<{ isOpen: boolean; opp: Opportunity | null }>({ isOpen: false, opp: null });

  // 处理从线索传入的初始数据
  useEffect(() => {
    if (initialLead) {
      setFormModal({
        isOpen: true,
        mode: 'add',
        data: {
          customerName: initialLead.name,
          contact: initialLead.contact,
          phone: initialLead.phone,
          leadId: initialLead.id,
          stage: 'qualifying',
        }
      });
    }
  }, [initialLead]);

  const showToast = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const activeOpps = opportunities.filter(o => o.stage !== 'won' && o.stage !== 'lost');
  const wonOpps = opportunities.filter(o => o.stage === 'won');

  const filtered = opportunities.filter(o => {
    const matchSearch = o.name.includes(search) || o.customerName.includes(search) || o.contact.includes(search);
    const matchStage =
      stageFilter === "all" ? true :
      stageFilter === "active" ? (o.stage !== 'won' && o.stage !== 'lost') :
      o.stage === stageFilter;
    return matchSearch && matchStage;
  });

  const pagedOpps = filtered.slice((page - 1) * pageSize, page * pageSize);

  const totalAmount = activeOpps.reduce((sum, o) => sum + o.amount, 0);
  const avgProbability = activeOpps.length > 0
    ? Math.round(activeOpps.reduce((sum, o) => sum + o.probability, 0) / activeOpps.length)
    : 0;

  const handleSaveOpportunity = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const name = fd.get("name") as string;
    const customerName = fd.get("customerName") as string;
    const contact = fd.get("contact") as string;
    const phone = fd.get("phone") as string;
    const stage = fd.get("stage") as OpportunityStage;
    const amount = Number(fd.get("amount")) || 0;
    const probability = Number(fd.get("probability")) || 0;
    const owner = fd.get("owner") as string;
    const expectedCloseDate = fd.get("expectedCloseDate") as string;
    const note = fd.get("note") as string;

    if (formModal.mode === 'add') {
      const newOpp: Opportunity = {
        id: `OP${Date.now()}`,
        name, customerName, contact, phone,
        customerId: `C${Date.now()}`,
        leadId: formModal.data.leadId,
        stage, amount, probability, owner, expectedCloseDate,
        created: new Date().toISOString().slice(0, 10),
        note: note || ""
      };
      setOpportunities(prev => [newOpp, ...prev]);
      // 如果是从线索转化，通知外部生成客户
      if (formModal.data.leadId && onNewCustomerCreated) {
        onNewCustomerCreated(customerName, contact, phone, formModal.data.leadId);
      }
      showToast(`商机「${name}」已创建`);
    } else {
      setOpportunities(prev => prev.map(o => o.id === formModal.data.id
        ? { ...o, name, customerName, contact, phone, stage, amount, probability, owner, expectedCloseDate, note }
        : o
      ));
      showToast(`商机「${name}」已更新`);
    }
    setFormModal({ isOpen: false, mode: 'add', data: {} });
  };

  // 赢单：商机通过后触发创建合同
  const handleConfirmWon = () => {
    if (!wonConfirm.opp) return;
    const opp = wonConfirm.opp;
    setOpportunities(prev => prev.map(o => o.id === opp.id
      ? { ...o, stage: 'won' as OpportunityStage, probability: 100 }
      : o
    ));
    const updatedOpp: Opportunity = { ...opp, stage: 'won', probability: 100 };
    if (onCreateContract) {
      onCreateContract(updatedOpp);
    }
    setWonConfirm({ isOpen: false, opp: null });
    showToast(`商机「${opp.name}」已赢单，即将进入合同签约流程`, 'success');
  };

  // 输单
  const handleConfirmLost = () => {
    if (!lostConfirm.opp) return;
    const opp = lostConfirm.opp;
    setOpportunities(prev => prev.map(o => o.id === opp.id
      ? { ...o, stage: 'lost' as OpportunityStage, probability: 0 }
      : o
    ));
    setLostConfirm({ isOpen: false, opp: null });
    showToast(`商机「${opp.name}」已标记为输单`, 'info');
  };

  const isActive = (stage: OpportunityStage) => stage !== 'won' && stage !== 'lost';

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 animate-in fade-in duration-300 relative">
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 px-4 py-3 rounded-lg shadow-custom text-sm font-medium animate-in fade-in slide-in-from-top-5 ${
          toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
          toast.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
          'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          <CheckCircle size={15} />
          {toast.msg}
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-4">
        <div className="flex-1">
          <StatCard title="活跃商机" value={String(activeOpps.length)} iconName="activity" colorType="blue" />
        </div>
        <div className="flex-1">
          <StatCard title="预计金额" value={`${(totalAmount / 10000).toFixed(0)}`} unit="万" iconName="cpu" colorType="teal" />
        </div>
        <div className="flex-1">
          <StatCard title="平均赢单率" value={String(avgProbability)} unit="%" iconName="check" colorType="green" />
        </div>
        <div className="flex-1">
          <StatCard title="累计赢单" value={String(wonOpps.length)} iconName="users" colorType="orange" />
        </div>
      </div>

      {/* Pipeline 阶段漏斗 */}
      <div className="bms-card px-5 py-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">商机漏斗</h4>
        <div className="flex items-center gap-1">
          {(['qualifying', 'demo', 'proposal', 'negotiation'] as OpportunityStage[]).map((stage, i, arr) => {
            const count = opportunities.filter(o => o.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-1">
                <button
                  onClick={() => { setStageFilter(stage); setPage(1); }}
                  className={`flex-1 flex flex-col items-center py-3 px-2 rounded-lg border transition-all ${
                    stageFilter === stage ? 'border-primary bg-secondary' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <span className="text-lg font-bold text-foreground">{count}</span>
                  <span className="text-xs text-muted-foreground mt-0.5">{STAGE_MAP[stage].label}</span>
                </button>
                {i < arr.length - 1 && <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />}
              </div>
            );
          })}
          <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setStageFilter('won'); setPage(1); }}
              className={`flex flex-col items-center py-3 px-4 rounded-lg border transition-all ${
                stageFilter === 'won' ? 'border-green-400 bg-green-50' : 'border-border hover:bg-muted/50'
              }`}
            >
              <span className="text-lg font-bold text-green-700">{wonOpps.length}</span>
              <span className="text-xs text-green-700 mt-0.5">已赢单</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bms-card p-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="搜索商机名称/客户/联系人..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="bms-input pl-8 w-64 text-sm bg-background"
              />
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
            <select
              value={stageFilter}
              onChange={(e) => { setStageFilter(e.target.value as any); setPage(1); }}
              className="bms-input text-sm w-36 bg-background"
            >
              <option value="active">进行中</option>
              <option value="all">全部阶段</option>
              <option value="qualifying">资质确认</option>
              <option value="demo">方案演示</option>
              <option value="proposal">报价阶段</option>
              <option value="negotiation">谈判中</option>
              <option value="won">已赢单</option>
              <option value="lost">已输单</option>
            </select>
          </div>
          <button
            onClick={() => setFormModal({ isOpen: true, mode: 'add', data: {} })}
            className="bms-btn-primary flex items-center gap-2 text-xs"
          >
            <Plus size={13} />
            新建商机
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bms-table-header text-left">
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">商机名称</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">关联客户</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">当前阶段</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">预计金额</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">赢单率</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">预计关闭</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">负责人</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pagedOpps.length > 0 ? pagedOpps.map((opp, i) => (
                <tr key={opp.id} className={`table-row-hover text-sm transition-colors ${i % 2 === 0 ? "" : "bg-muted/30"} ${!isActive(opp.stage) ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-3">
                    <div>
                      <div className="font-medium text-foreground flex items-center gap-1.5">
                        <Target size={13} className="text-primary flex-shrink-0" />
                        {opp.name}
                      </div>
                      {opp.leadId && (
                        <span className="text-xs text-muted-foreground mt-0.5 block">关联线索: {opp.leadId}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-foreground flex items-center gap-1.5"><Building size={12} className="text-muted-foreground" /> {opp.customerName}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5"><User size={11} className="text-muted-foreground" /> {opp.contact}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex text-xs px-2 py-0.5 rounded border font-medium ${STAGE_MAP[opp.stage].color}`}>
                      {STAGE_MAP[opp.stage].label}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-foreground">
                    ¥ {(opp.amount / 10000).toFixed(0)}万
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${opp.probability}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{opp.probability}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} />
                      {opp.expectedCloseDate}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-foreground text-xs">{opp.owner}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      {isActive(opp.stage) && (
                        <>
                          <button
                            onClick={() => setFormModal({ isOpen: true, mode: 'edit', data: opp })}
                            className="px-2 py-1.5 flex items-center gap-1 rounded border border-border hover:bg-muted transition-colors text-xs font-medium text-foreground"
                          >
                            <Edit2 size={12} className="text-muted-foreground" /> 编辑
                          </button>
                          <button
                            onClick={() => setWonConfirm({ isOpen: true, opp })}
                            className="px-2 py-1.5 flex items-center gap-1 rounded bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors text-xs font-medium"
                          >
                            <Trophy size={12} /> 赢单
                          </button>
                          <button
                            onClick={() => setLostConfirm({ isOpen: true, opp })}
                            className="px-2 py-1.5 flex items-center gap-1 rounded border border-border hover:bg-red-50 hover:text-destructive transition-colors text-xs font-medium text-muted-foreground"
                          >
                            <XCircle size={12} /> 输单
                          </button>
                        </>
                      )}
                      {opp.stage === 'won' && (
                        <span className="text-xs flex items-center gap-1 text-green-700">
                          <Trophy size={12} /> 已赢单
                        </span>
                      )}
                      {opp.stage === 'lost' && (
                        <span className="text-xs flex items-center gap-1 text-muted-foreground">
                          <XCircle size={12} /> 已输单
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                    未找到符合条件的商机
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
          onPageSizeChange={() => { setPage(1); }}
        />
      </div>

      {/* 新建/编辑商机弹窗 */}
      {formModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-card w-full max-w-lg rounded-xl shadow-custom overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
              <h3 className="font-bold text-foreground text-base flex items-center gap-2">
                <Target size={16} className="text-primary" />
                {formModal.mode === 'add' ? '新建商机' : '编辑商机'}
              </h3>
              <button onClick={() => setFormModal({ isOpen: false, mode: 'add', data: {} })} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveOpportunity} className="p-6 space-y-4">
              {formModal.data.leadId && (
                <div className="bg-green-50 border border-green-100 text-green-800 p-3 rounded-lg text-xs flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-600 flex-shrink-0" />
                  <span>该商机由线索 <strong>{formModal.data.leadId}</strong> 转化而来，系统将自动关联客户档案</span>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">商机名称 <span className="text-destructive">*</span></label>
                <input required name="name" defaultValue={formModal.data.name || ""} placeholder="例如：XX公司BMS采购项目" className="bms-input w-full" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium text-foreground">客户名称 <span className="text-destructive">*</span></label>
                  <input required name="customerName" defaultValue={formModal.data.customerName || ""} placeholder="公司名称" className="bms-input w-full" readOnly={!!formModal.data.leadId} />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium text-foreground">联系人 <span className="text-destructive">*</span></label>
                  <input required name="contact" defaultValue={formModal.data.contact || ""} placeholder="联系人姓名" className="bms-input w-full" />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium text-foreground">联系电话</label>
                  <input name="phone" defaultValue={formModal.data.phone || ""} placeholder="手机号" className="bms-input w-full" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium text-foreground">当前阶段</label>
                  <select name="stage" defaultValue={formModal.data.stage || "qualifying"} className="bms-input w-full">
                    <option value="qualifying">资质确认</option>
                    <option value="demo">方案演示</option>
                    <option value="proposal">报价阶段</option>
                    <option value="negotiation">谈判中</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium text-foreground">预计金额 (元)</label>
                  <input name="amount" type="number" min="0" defaultValue={formModal.data.amount || ""} placeholder="0" className="bms-input w-full" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium text-foreground">赢单概率 (%)</label>
                  <input name="probability" type="number" min="0" max="100" defaultValue={formModal.data.probability ?? 30} className="bms-input w-full" />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium text-foreground">负责人</label>
                  <input name="owner" defaultValue={formModal.data.owner || "当前用户"} placeholder="销售负责人" className="bms-input w-full" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium text-foreground">预计关闭日期</label>
                  <input name="expectedCloseDate" type="date" defaultValue={formModal.data.expectedCloseDate || ""} className="bms-input w-full" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">备注</label>
                <textarea name="note" defaultValue={formModal.data.note || ""} placeholder="商机进展说明..." className="bms-input w-full text-sm min-h-[60px] resize-none" />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-border">
                <button type="button" onClick={() => setFormModal({ isOpen: false, mode: 'add', data: {} })} className="bms-btn-secondary">取消</button>
                <button type="submit" className="bms-btn-primary">{formModal.mode === 'add' ? '创建商机' : '保存修改'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 赢单确认弹窗 */}
      {wonConfirm.isOpen && wonConfirm.opp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-card w-full max-w-md rounded-xl shadow-custom overflow-hidden">
            <div className="px-6 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                  <Trophy size={18} className="text-green-700" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">确认赢单</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">商机将标记为已赢单，并自动创建合同草稿</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">商机名称</span>
                  <span className="font-medium text-foreground">{wonConfirm.opp.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">客户</span>
                  <span className="font-medium text-foreground">{wonConfirm.opp.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">预计金额</span>
                  <span className="font-mono font-medium text-primary">¥ {wonConfirm.opp.amount.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                <ArrowRight size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-green-800">
                  赢单后将跳转至合同页面，由销售人员起草并提交正式合同，经审批通过后方可生效
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-muted/30 border-t border-border flex justify-end gap-3">
              <button onClick={() => setWonConfirm({ isOpen: false, opp: null })} className="bms-btn-secondary">取消</button>
              <button onClick={handleConfirmWon} className="px-4 py-2 rounded-md text-sm font-medium bg-green-600 text-primary-foreground hover:opacity-90 transition-opacity flex items-center gap-2">
                <Trophy size={14} /> 确认赢单并创建合同
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 输单确认弹窗 */}
      {lostConfirm.isOpen && lostConfirm.opp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-card w-full max-w-sm rounded-xl shadow-custom overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="text-destructive flex-shrink-0" size={22} />
                <h3 className="font-bold text-foreground text-base">确认输单</h3>
              </div>
              <p className="text-sm text-muted-foreground pl-9">确定将商机「{lostConfirm.opp.name}」标记为输单？此操作会将商机归档，赢单率将清零。</p>
            </div>
            <div className="px-6 py-4 bg-muted/30 border-t border-border flex justify-end gap-3">
              <button onClick={() => setLostConfirm({ isOpen: false, opp: null })} className="bms-btn-secondary">取消</button>
              <button onClick={handleConfirmLost} className="px-4 py-2 rounded-md text-sm font-medium bg-destructive text-primary-foreground hover:opacity-90 transition-opacity">
                确认输单
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpportunityPage;
export type { Opportunity };
