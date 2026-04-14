import { useState } from "react";
import { Search, Plus, Phone, Mail, Building, CheckCircle, Clock, Edit2, User, X, Target, ArrowRight, ChevronDown } from "lucide-react";
import StatCard from "../components/StatCard";
import Pagination from "../components/Pagination";

// 线索状态：仅三种标准状态，禁止出现"商机中"等混合概念
type LeadStatus = 'potential' | 'intended' | 'converted';

interface FollowUp {
  id: string;
  date: string;
  content: string;
  operator: string;
}

export interface Lead {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  source: string;
  status: LeadStatus;
  lastFollowUp: string;
  created: string;
  followUps: FollowUp[];
  convertedAt?: string; // 转化时间
}

const initialLeads: Lead[] = [
  {
    id: "L001", name: "杭州极光新能源有限公司", contact: "王总", phone: "139-1111-2222", email: "wang@jiguang.com",
    source: "渠道推荐", status: "potential", lastFollowUp: "2024-06-01", created: "2024-05-20",
    followUps: [
      { id: "F1", date: "2024-06-01 10:30", content: "初步电话沟通，对方对BMS系统有兴趣，发送了产品手册。", operator: "张伟" }
    ]
  },
  {
    id: "L002", name: "武汉绿色动力有限责任公司", contact: "刘经理", phone: "138-3333-4444", email: "liu@greenpower.com",
    source: "官网询盘", status: "intended", lastFollowUp: "2024-06-05", created: "2024-05-25",
    followUps: [
      { id: "F2", date: "2024-06-05 14:00", content: "线上演示了BMS功能，对方比较认可，准备内部讨论。", operator: "李明" },
      { id: "F3", date: "2024-05-26 09:15", content: "交换微信，约定下周演示时间。", operator: "李明" }
    ]
  },
  {
    id: "L003", name: "苏州市智能电网科技", contact: "陈工", phone: "137-5555-6666", email: "chen@smartgrid.com",
    source: "展会获客", status: "intended", lastFollowUp: "2024-06-10", created: "2024-06-01",
    followUps: [
      { id: "F4", date: "2024-06-10 16:45", content: "双方已达成初步意向，明确了核心需求和预算范围。", operator: "陈芳" }
    ]
  },
  {
    id: "L004", name: "南京星源电池厂", contact: "赵总", phone: "136-7777-8888", email: "zhao@xingyuan.com",
    source: "电话开拓", status: "potential", lastFollowUp: "2024-06-08", created: "2024-06-02",
    followUps: [
      { id: "F5", date: "2024-06-08 11:20", content: "对方正在比价，需要我们提供更详细的技术规格书。", operator: "刘洋" }
    ]
  },
  {
    id: "L005", name: "深圳储能科技有限公司", contact: "张伟", phone: "138-0000-0001", email: "zhang@szcn.com",
    source: "老客户推荐", status: "converted", lastFollowUp: "2024-01-05", created: "2023-12-10",
    convertedAt: "2024-01-06",
    followUps: []
  },
];

const STATUS_MAP: Record<LeadStatus, { label: string; color: string }> = {
  potential: { label: '潜在客户', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  intended: { label: '意向客户', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  converted: { label: '已转化', color: 'bg-green-50 text-green-700 border-green-200' },
};

const SOURCE_OPTIONS = ['渠道推荐', '官网询盘', '展会获客', '电话开拓', '老客户推荐', '自然流量', '其他'];

interface LeadPageProps {
  onCreateOpportunity?: (lead: Lead) => void;
}

const LeadPage = ({ onCreateOpportunity }: LeadPageProps) => {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [showConverted, setShowConverted] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

  // 跟进记录侧边栏
  const [followUpModal, setFollowUpModal] = useState<{ isOpen: boolean, lead: Lead | null }>({ isOpen: false, lead: null });
  const [newFollowUpContent, setNewFollowUpContent] = useState("");

  // 新建/编辑线索弹窗
  const [leadFormModal, setLeadFormModal] = useState<{ isOpen: boolean; mode: 'add' | 'edit'; data: Partial<Lead> }>({
    isOpen: false, mode: 'add', data: {}
  });

  // 创建商机确认弹窗
  const [convertConfirm, setConvertConfirm] = useState<{ isOpen: boolean; lead: Lead | null }>({ isOpen: false, lead: null });

  const showToast = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const activeLeads = leads.filter(l => l.status !== 'converted');
  const allVisible = showConverted ? leads : activeLeads;

  const filtered = allVisible.filter(l => {
    const matchSearch = l.name.includes(search) || l.contact.includes(search) || l.phone.includes(search);
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pagedLeads = filtered.slice((page - 1) * pageSize, page * pageSize);

  const potentialCount = activeLeads.filter(l => l.status === 'potential').length;
  const intendedCount = activeLeads.filter(l => l.status === 'intended').length;
  const convertedCount = leads.filter(l => l.status === 'converted').length;

  // 跟进记录提交
  const handleSaveFollowUp = () => {
    if (!newFollowUpContent.trim() || !followUpModal.lead) return;
    const newRecord: FollowUp = {
      id: `F${Date.now()}`,
      date: new Date().toLocaleString('zh-CN', { hour12: false }).slice(0, 16),
      content: newFollowUpContent,
      operator: "当前用户"
    };
    setLeads(prev => prev.map(l => {
      if (l.id === followUpModal.lead!.id) {
        return { ...l, followUps: [newRecord, ...l.followUps], lastFollowUp: newRecord.date.slice(0, 10) };
      }
      return l;
    }));
    setNewFollowUpContent("");
    showToast("跟进记录添加成功");
    setFollowUpModal(prev => ({
      ...prev,
      lead: prev.lead ? { ...prev.lead, followUps: [newRecord, ...prev.lead.followUps] } : null
    }));
  };

  // 新建/编辑线索保存
  const handleSaveLead = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const name = fd.get("name") as string;
    const contact = fd.get("contact") as string;
    const phone = fd.get("phone") as string;
    const email = fd.get("email") as string;
    const source = fd.get("source") as string;
    const status = fd.get("status") as LeadStatus;

    if (leadFormModal.mode === 'add') {
      const newLead: Lead = {
        id: `L${Date.now()}`,
        name, contact, phone, email, source,
        status: status || 'potential',
        lastFollowUp: "-",
        created: new Date().toISOString().slice(0, 10),
        followUps: []
      };
      setLeads(prev => [newLead, ...prev]);
      showToast(`线索「${name}」已创建`);
    } else {
      setLeads(prev => prev.map(l => l.id === leadFormModal.data.id
        ? { ...l, name, contact, phone, email, source, status }
        : l
      ));
      showToast(`线索「${name}」已更新`);
    }
    setLeadFormModal({ isOpen: false, mode: 'add', data: {} });
  };

  // 创建商机：自动更新线索状态为"已转化"
  const handleConfirmCreateOpportunity = () => {
    if (!convertConfirm.lead) return;
    const lead = convertConfirm.lead;

    // 更新线索状态为"已转化"
    setLeads(prev => prev.map(l => l.id === lead.id
      ? { ...l, status: 'converted' as LeadStatus, convertedAt: new Date().toISOString().slice(0, 10) }
      : l
    ));

    const updatedLead: Lead = { ...lead, status: 'converted', convertedAt: new Date().toISOString().slice(0, 10) };

    if (onCreateOpportunity) {
      onCreateOpportunity(updatedLead);
    }
    setConvertConfirm({ isOpen: false, lead: null });
    showToast(`线索「${lead.name}」已转化，商机已创建`, 'success');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 animate-in fade-in duration-300 relative">
      {/* Toast */}
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
          <StatCard title="活跃线索总数" value={String(activeLeads.length)} iconName="users" colorType="blue" />
        </div>
        <div className="flex-1">
          <StatCard title="潜在客户" value={String(potentialCount)} iconName="activity" colorType="teal" />
        </div>
        <div className="flex-1">
          <StatCard title="意向客户" value={String(intendedCount)} iconName="check" colorType="green" />
        </div>
        <div className="flex-1">
          <StatCard title="已转化" value={String(convertedCount)} iconName="arrow-right" colorType="orange" />
        </div>
      </div>

      <div className="bms-card p-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="搜索公司/联系人/手机号..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="bms-input pl-8 w-60 text-sm bg-background"
              />
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as LeadStatus | "all"); setPage(1); }}
              className="bms-input text-sm w-32 bg-background"
            >
              <option value="all">全部阶段</option>
              <option value="potential">潜在客户</option>
              <option value="intended">意向客户</option>
              <option value="converted">已转化</option>
            </select>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showConverted}
                onChange={e => { setShowConverted(e.target.checked); setPage(1); }}
                className="rounded"
              />
              显示已转化
            </label>
          </div>
          <button
            onClick={() => setLeadFormModal({ isOpen: true, mode: 'add', data: {} })}
            className="bms-btn-primary flex items-center gap-2 text-xs"
          >
            <Plus size={13} />
            新建线索
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bms-table-header text-left">
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">线索名称</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">联系方式</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">来源</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">当前状态</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">最近跟进</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">跟进次数</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pagedLeads.length > 0 ? pagedLeads.map((l, i) => (
                <tr key={l.id} className={`table-row-hover text-sm transition-colors ${i % 2 === 0 ? "" : "bg-muted/30"} ${l.status === 'converted' ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Building size={14} className="text-primary flex-shrink-0" />
                      <div>
                        <span className="font-medium text-foreground">{l.name}</span>
                        <div className="text-xs text-muted-foreground font-mono">{l.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-foreground flex items-center gap-1.5"><User size={12} className="text-muted-foreground" /> {l.contact}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone size={12} className="text-muted-foreground" /> {l.phone}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{l.source}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex text-xs px-2 py-0.5 rounded border font-medium w-fit ${STATUS_MAP[l.status].color}`}>
                        {STATUS_MAP[l.status].label}
                      </span>
                      {l.status === 'converted' && l.convertedAt && (
                        <span className="text-xs text-muted-foreground">转化于 {l.convertedAt}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} className="text-muted-foreground" />
                      {l.lastFollowUp}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">
                    <span className="font-medium text-foreground">{l.followUps.length}</span> 次
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {l.status !== 'converted' && (
                        <button
                          onClick={() => setLeadFormModal({ isOpen: true, mode: 'edit', data: l })}
                          className="px-2 py-1.5 flex items-center gap-1 rounded border border-border hover:bg-muted transition-colors text-xs font-medium text-foreground"
                          title="编辑线索基础信息"
                        >
                          <Edit2 size={13} className="text-muted-foreground" /> 编辑
                        </button>
                      )}
                      <button
                        onClick={() => setFollowUpModal({ isOpen: true, lead: l })}
                        className="px-2 py-1.5 flex items-center gap-1 rounded border border-border hover:bg-muted transition-colors text-xs font-medium text-foreground"
                      >
                        <Mail size={13} className="text-muted-foreground" /> 跟进记录
                      </button>
                      {l.status !== 'converted' && (
                        <button
                          onClick={() => setConvertConfirm({ isOpen: true, lead: l })}
                          className="px-2 py-1.5 flex items-center gap-1 rounded bg-secondary text-primary hover:bg-primary hover:text-primary-foreground transition-colors text-xs font-medium"
                          title="将该线索转化为商机，并自动生成客户档案"
                        >
                          <Target size={13} /> 创建商机
                        </button>
                      )}
                      {l.status === 'converted' && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1 px-2 py-1.5">
                          <CheckCircle size={12} className="text-green-600" /> 已转化
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                    未找到符合条件的线索
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

      {/* Follow Up Drawer */}
      {followUpModal.isOpen && followUpModal.lead && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={() => setFollowUpModal({ isOpen: false, lead: null })} />
          <div className="w-96 bg-card shadow-custom border-l border-border flex flex-col animate-in slide-in-from-right duration-300">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div>
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <Mail size={15} className="text-primary" /> 跟进记录
                </h3>
                <p className="text-xs text-muted-foreground mt-1">线索：<span className="font-medium text-foreground">{followUpModal.lead.name}</span></p>
              </div>
              <button onClick={() => setFollowUpModal({ isOpen: false, lead: null })} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 border-b border-border bg-card">
              <label className="text-xs font-medium text-foreground mb-2 block">新增跟进记录</label>
              <textarea
                value={newFollowUpContent}
                onChange={(e) => setNewFollowUpContent(e.target.value)}
                placeholder="记录本次沟通的主要内容、客户意向或下一步计划..."
                className="bms-input w-full text-sm min-h-[80px] resize-none mb-3"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSaveFollowUp}
                  disabled={!newFollowUpContent.trim()}
                  className="bms-btn-primary py-1.5 px-4 text-xs disabled:opacity-50"
                >
                  提交记录
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <h4 className="text-xs font-semibold text-muted-foreground mb-4">历史记录 ({followUpModal.lead.followUps.length})</h4>
              <div className="space-y-4">
                {followUpModal.lead.followUps.length > 0 ? (
                  followUpModal.lead.followUps.map((record, index) => (
                    <div key={record.id} className="relative pl-4">
                      {index !== followUpModal.lead!.followUps.length - 1 && (
                        <div className="absolute left-1 top-4 bottom-[-24px] w-px bg-border"></div>
                      )}
                      <div className="absolute left-[-2px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-card"></div>
                      <div className="bg-muted/30 border border-border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-foreground">{record.operator}</span>
                          <span className="text-xs text-muted-foreground">{record.date}</span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{record.content}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                    暂无跟进记录
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 新建/编辑线索弹窗 */}
      {leadFormModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-card w-full max-w-lg rounded-xl shadow-custom overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-foreground text-base flex items-center gap-2">
                <Building size={16} className="text-primary" />
                {leadFormModal.mode === 'add' ? '新建线索' : '编辑线索'}
              </h3>
              <button onClick={() => setLeadFormModal({ isOpen: false, mode: 'add', data: {} })} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveLead} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">公司名称 <span className="text-destructive">*</span></label>
                <input required name="name" defaultValue={leadFormModal.data.name || ""} placeholder="请输入公司或机构名称" className="bms-input w-full" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium text-foreground">联系人 <span className="text-destructive">*</span></label>
                  <input required name="contact" defaultValue={leadFormModal.data.contact || ""} placeholder="姓名" className="bms-input w-full" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium text-foreground">联系电话 <span className="text-destructive">*</span></label>
                  <input required name="phone" defaultValue={leadFormModal.data.phone || ""} placeholder="手机号" className="bms-input w-full" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">邮箱</label>
                <input name="email" type="email" defaultValue={leadFormModal.data.email || ""} placeholder="选填" className="bms-input w-full" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium text-foreground">线索来源</label>
                  <select name="source" defaultValue={leadFormModal.data.source || "其他"} className="bms-input w-full">
                    {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium text-foreground">当前状态</label>
                  <select name="status" defaultValue={leadFormModal.data.status || "potential"} className="bms-input w-full">
                    <option value="potential">潜在客户</option>
                    <option value="intended">意向客户</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-border">
                <button type="button" onClick={() => setLeadFormModal({ isOpen: false, mode: 'add', data: {} })} className="bms-btn-secondary">取消</button>
                <button type="submit" className="bms-btn-primary">{leadFormModal.mode === 'add' ? '创建线索' : '保存修改'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 创建商机确认弹窗 */}
      {convertConfirm.isOpen && convertConfirm.lead && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-card w-full max-w-md rounded-xl shadow-custom overflow-hidden">
            <div className="px-6 py-5 border-b border-border">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <Target size={18} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">确认创建商机</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">此操作将同时完成以下动作</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                <ArrowRight size={14} className="text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">基于此线索创建商机</p>
                  <p className="text-xs text-muted-foreground mt-0.5">线索「{convertConfirm.lead.name}」将进入商机管理流程，由销售负责推进</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                <ArrowRight size={14} className="text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">自动生成客户档案</p>
                  <p className="text-xs text-muted-foreground mt-0.5">系统将自动在客户列表中创建对应的客户记录</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                <ArrowRight size={14} className="text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">线索状态更新为"已转化"</p>
                  <p className="text-xs text-muted-foreground mt-0.5">线索完成历史使命，后续通过商机流程推进合同签约</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700 flex items-start gap-2">
                <ChevronDown size={14} className="mt-0.5 flex-shrink-0 rotate-[-90deg]" />
                <span>线索不直接生成合同，需通过商机流转后由销售在商机详情中创建合同</span>
              </div>
            </div>
            <div className="px-6 py-4 bg-muted/30 border-t border-border flex justify-end gap-3">
              <button onClick={() => setConvertConfirm({ isOpen: false, lead: null })} className="bms-btn-secondary">取消</button>
              <button onClick={handleConfirmCreateOpportunity} className="bms-btn-primary flex items-center gap-2">
                <Target size={14} /> 确认创建商机
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadPage;
