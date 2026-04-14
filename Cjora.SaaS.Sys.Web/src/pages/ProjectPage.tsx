import { useState, useEffect, useRef } from "react";
import { 
  Search, Plus, Trash2, FolderOpen, X, 
  Network, AlertTriangle, 
  FileText, CheckCircle, Download, ChevronDown,
  Send, Play, Pause, Square, XCircle, Link
} from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import StatCard from "../components/StatCard";
import Pagination from "../components/Pagination";

interface ProjectPageProps {
  initialSearch?: string;
  onViewDetail?: (projectId: string) => void;
  onViewDeviceGroup?: (projectId: string, projectName: string, customerId: string) => void;
  onSubmitApproval?: (projectId: string, projectName: string) => void;
}

type ProjectStatus = 'draft' | 'pending' | 'approved' | 'active' | 'paused' | 'ended' | 'closed';

interface Project {
  id: string;
  name: string;
  customer: string;
  customerId: string;
  contractNo: string;
  groups: number;
  devices: number;
  status: ProjectStatus;
  location: string;
  created: string;
  manager: string;
}

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

const READONLY_STATUSES: ProjectStatus[] = ['ended', 'closed'];

// Mock 有效合同列表（供新建项目时选择）
const AVAILABLE_CONTRACTS = [
  { no: 'CT-2024-001', customerName: '深圳储能科技有限公司', customerId: 'C001' },
  { no: 'CT-2024-002', customerName: '广州新能源集团', customerId: 'C002' },
  { no: 'CT-2024-003', customerName: '上海锂电科技股份有限公司', customerId: 'C004' },
  { no: 'CT-2024-006', customerName: '北京绿能电池有限公司', customerId: 'C005' },
];

const initialProjects: Project[] = [
  { id: "P001", name: "深圳储能基站项目A", contractNo: "CT-2024-001", customer: "深圳储能科技有限公司", customerId: "C001", groups: 4, devices: 120, status: "active", location: "深圳市南山区", created: "2024-01-15", manager: "张伟" },
  { id: "P002", name: "广州光储充一体化项目", contractNo: "CT-2024-002", customer: "广州新能源集团", customerId: "C002", groups: 3, devices: 85, status: "approved", location: "广州市天河区", created: "2024-02-20", manager: "李明" },
  { id: "P003", name: "上海园区储能示范工程", contractNo: "CT-2024-003", customer: "上海锂电科技股份有限公司", customerId: "C004", groups: 6, devices: 200, status: "paused", location: "上海市浦东新区", created: "2024-03-01", manager: "陈芳" },
  { id: "P004", name: "北京调峰储能项目", contractNo: "CT-2023-005", customer: "北京绿能电池有限公司", customerId: "C005", groups: 2, devices: 60, status: "ended", location: "北京市朝阳区", created: "2024-03-18", manager: "刘洋" },
  { id: "P005", name: "成都新能源汽车充电站", contractNo: "CT-2024-007", customer: "成都智储能源科技", customerId: "C007", groups: 5, devices: 150, status: "active", location: "成都市高新区", created: "2024-04-05", manager: "赵磊" },
  { id: "P006", name: "北京绿能二期项目", contractNo: "CT-2024-006", customer: "北京绿能电池有限公司", customerId: "C005", groups: 0, devices: 0, status: "draft", location: "北京市朝阳区", created: "2024-06-01", manager: "孙静" },
];

// ==========================================
// New Project Modal
// ==========================================
interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => void;
}

const NewProjectModal = ({ isOpen, onClose, onSave }: NewProjectModalProps) => {
  const [selectedContract, setSelectedContract] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const contract = AVAILABLE_CONTRACTS.find(c => c.no === selectedContract);
    if (!contract) return;

    const newProject: Project = {
      id: `P${String(Math.floor(Math.random() * 900) + 100)}`,
      name: formData.get("name") as string,
      customer: contract.customerName,
      customerId: contract.customerId,
      contractNo: contract.no,
      manager: formData.get("manager") as string,
      location: formData.get("location") as string,
      status: 'draft',
      groups: 0,
      devices: 0,
      created: new Date().toISOString().slice(0, 10),
    };
    onSave(newProject);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-card w-full max-w-lg rounded-xl shadow-custom overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen size={18} className="text-primary" />
            <h3 className="font-bold text-foreground text-base">新建执行项目</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-xs flex items-center gap-2 border border-blue-100">
            <AlertTriangle size={14} className="text-blue-600 flex-shrink-0" />
            <span>创建项目必须依赖已生效的正式合同，若无合同请先前往「合同管理」起草并完成审批。</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Link size={14} className="text-primary"/> 关联生效合同 <span className="text-destructive">*</span>
            </label>
            <select 
              required 
              value={selectedContract} 
              onChange={(e) => setSelectedContract(e.target.value)} 
              className="bms-input w-full"
            >
              <option value="">-- 请选择关联的合同 --</option>
              {AVAILABLE_CONTRACTS.map(c => (
                <option key={c.no} value={c.no}>{c.no} - {c.customerName}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              项目名称 <span className="text-destructive">*</span>
            </label>
            <input required name="name" placeholder="请输入项目名称" className="bms-input w-full" />
          </div>

          <div className="flex gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                项目负责人 <span className="text-destructive">*</span>
              </label>
              <input required name="manager" placeholder="请输入负责人姓名" className="bms-input w-full" />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium text-foreground">初始状态</label>
              <div className="bms-input w-full bg-muted/50 text-muted-foreground text-sm flex items-center">
                草稿（自动）
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">交付地点</label>
            <input name="location" placeholder="例如：深圳市南山区高新南九道" className="bms-input w-full" />
          </div>
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle size={13} className="text-primary" />
              项目创建后可提交立项审批
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="bms-btn-secondary py-2 px-4">取消</button>
              <button type="submit" disabled={!selectedContract} className="bms-btn-primary py-2 px-4 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                <Plus size={14} />
                创建项目
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// Confirm Dialog
// ==========================================
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  msg: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog = ({ isOpen, title, msg, onConfirm, onCancel }: ConfirmDialogProps) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-card w-full max-w-sm rounded-xl shadow-custom overflow-hidden">
        <div className="p-6 pb-5">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="text-destructive flex-shrink-0" size={24} />
            <h3 className="font-bold text-foreground text-lg">{title}</h3>
          </div>
          <p className="text-sm text-muted-foreground pl-9">{msg}</p>
        </div>
        <div className="px-6 py-4 bg-muted/30 border-t border-border flex justify-end gap-3">
          <button onClick={onCancel} className="bms-btn-secondary py-1.5">取消</button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 rounded text-sm font-medium bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// Row Action Dropdown Menu
// ==========================================
interface RowActionDropdownProps {
  project: Project;
  onAction: (action: string, project: Project) => void;
  onDelete: (project: Project) => void;
}

const RowActionDropdown = ({ project, onAction, onDelete }: RowActionDropdownProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const getAvailableActions = (status: ProjectStatus) => {
    const allActions = [
      { key: 'submit', label: '提交审批', icon: Send, color: 'text-amber-600', applicableStatuses: ['draft'] as ProjectStatus[] },
      { key: 'start', label: '开始项目', icon: Play, color: 'text-green-600', applicableStatuses: ['approved'] as ProjectStatus[] },
      { key: 'pause', label: '暂停项目', icon: Pause, color: 'text-orange-500', applicableStatuses: ['active'] as ProjectStatus[] },
      { key: 'resume', label: '恢复项目', icon: Play, color: 'text-green-600', applicableStatuses: ['paused'] as ProjectStatus[] },
      { key: 'end', label: '结束项目', icon: Square, color: 'text-slate-500', applicableStatuses: ['active', 'paused'] as ProjectStatus[] },
      { key: 'close', label: '关闭项目', icon: XCircle, color: 'text-destructive', applicableStatuses: ['ended'] as ProjectStatus[] },
    ];
    return allActions.filter(a => a.applicableStatuses.includes(status));
  };

  const availableActions = getAvailableActions(project.status);
  const canDelete = project.status === 'draft';
  const isReadonly = READONLY_STATUSES.includes(project.status);

  if (isReadonly) return null;
  if (availableActions.length === 0 && !canDelete) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(v => !v);
        }}
        className="px-2 py-1.5 flex items-center gap-1 rounded border border-border hover:bg-muted transition-colors text-xs font-medium text-foreground"
        title="更多操作"
      >
        更多
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-36 bg-card border border-border rounded-lg shadow-custom z-30 overflow-hidden animate-in fade-in slide-in-from-top-2">
          {availableActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.key}
                onClick={(e) => {
                  e.stopPropagation();
                  onAction(action.key, project);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs hover:bg-muted transition-colors text-left ${action.color}`}
              >
                <Icon size={13} />
                {action.label}
              </button>
            );
          })}

          {canDelete && (
            <>
              {availableActions.length > 0 && (
                <div className="mx-3 my-1 border-t border-border" />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(project);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs hover:bg-red-50 transition-colors text-left text-destructive"
              >
                <Trash2 size={13} />
                删除项目
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

interface ToastProps {
  msg: string;
  type: 'success' | 'info';
}

const ProjectPage = ({
  initialSearch = "",
  onViewDetail,
  onViewDeviceGroup,
  onSubmitApproval,
}: ProjectPageProps) => {
  const [search, setSearch] = useState(initialSearch);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [showNewModal, setShowNewModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [toast, setToast] = useState<ToastProps | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (initialSearch !== undefined) { setSearch(initialSearch); setPage(1); }
  }, [initialSearch]);

  const showToast = (msg: string, type: 'success' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.customer.toLowerCase().includes(search.toLowerCase()) ||
    p.contractNo.toLowerCase().includes(search.toLowerCase())
  );

  const pagedProjects = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stockProjects = projects.filter(p => ['approved', 'active', 'paused'].includes(p.status));
  const closedProjects = projects.filter(p => ['ended', 'closed'].includes(p.status));
  const totalDevices = projects.reduce((sum, p) => sum + p.devices, 0);

  const handleCreateProject = (project: Project) => {
    setProjects(prev => [project, ...prev]);
    showToast(`项目「${project.name}」创建成功，初始状态：草稿`);
    setPage(1);
  };

  const handleDeleteProject = () => {
    if (!deleteTarget) return;
    setProjects(prev => prev.filter(p => p.id !== deleteTarget.id));
    setDeleteTarget(null);
    showToast(`项目已删除`);
  };

  const handleOpenDeviceGroup = (project: Project) => {
    if (onViewDeviceGroup) onViewDeviceGroup(project.id, project.name, project.customerId);
  };

  const handleRowAction = (action: string, project: Project) => {
    if (action === 'submit') {
      setProjects(prev => prev.map(p =>
        p.id === project.id ? { ...p, status: 'pending' as ProjectStatus } : p
      ));
      if (onSubmitApproval) {
        onSubmitApproval(project.id, project.name);
      }
      showToast(`项目「${project.name}」已提交审批，可在审批中心查看进度`, 'info');
      return;
    }

    const statusTransitions: Record<string, ProjectStatus> = {
      start: 'active',
      pause: 'paused',
      resume: 'active',
      end: 'ended',
      close: 'closed',
    };

    const actionLabels: Record<string, string> = {
      start: `项目「${project.name}」已启动`,
      pause: `项目「${project.name}」已暂停`,
      resume: `项目「${project.name}」已恢复进行`,
      end: `项目「${project.name}」已结束`,
      close: `项目「${project.name}」已关闭`,
    };

    if (statusTransitions[action]) {
      setProjects(prev => prev.map(p =>
        p.id === project.id ? { ...p, status: statusTransitions[action] } : p
      ));
    }

    showToast(actionLabels[action] || '操作成功', 'info');
  };

  const handleExport = () => {
    showToast('项目文件导出成功，请检查下载文件夹', 'info');
  };

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 animate-in fade-in duration-300 relative">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 px-4 py-3 rounded-lg shadow-custom text-sm font-medium animate-in fade-in slide-in-from-top-5 ${
          toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-secondary text-primary border border-primary/20'
        }`}>
          <CheckCircle size={15} />
          {toast.msg}
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-4">
        <div className="flex-1">
          <StatCard
            title="执行项目总数"
            value={String(projects.length)}
            iconName="cpu"
            colorType="blue"
            yoyValue="+10%"
            yoyUp={true}
            momValue="+5%"
            momUp={true}
          />
        </div>
        <div className="flex-1">
          <StatCard
            title="进行中/已立项"
            value={String(stockProjects.length)}
            iconName="activity"
            colorType="green"
            yoyValue="+8%"
            yoyUp={true}
            momValue="+2%"
            momUp={true}
          />
        </div>
        <div className="flex-1">
          <StatCard
            title="关停项目"
            value={String(closedProjects.length)}
            iconName="alert"
            colorType="orange"
            yoyValue="-5%"
            yoyUp={false}
            momValue="+1%"
            momUp={true}
          />
        </div>
        <div className="flex-1">
          <StatCard
            title="纳管设备数"
            value={totalDevices.toLocaleString()}
            unit="台"
            iconName="battery"
            colorType="teal"
            yoyValue="+18%"
            yoyUp={true}
            momValue="+6%"
            momUp={true}
          />
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
          存量项目 = 已立项 + 进行中 + 已暂停（{stockProjects.length} 个）
        </span>
        <span className="w-px h-3 bg-border"></span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-orange-400"></span>
          关停项目 = 已结束 + 已关闭（{closedProjects.length} 个）
        </span>
        <span className="w-px h-3 bg-border"></span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-slate-400"></span>
          已结束/已关闭项目仅可查看详情，不可修改
        </span>
      </div>

      <div className="bms-card p-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/10">
          <h3 className="font-semibold text-foreground">执行项目列表</h3>
          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="搜索项目/客户/合同编号..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="bms-input pl-8 pr-8 w-60 text-sm transition-all focus:w-64 bg-background"
              />
              <Search size={14} className="absolute left-2.5 text-muted-foreground" />
              {search && (
                <button
                  onClick={() => handleSearch("")}
                  className="absolute right-2.5 p-0.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <button
              onClick={handleExport}
              className="bms-btn-secondary flex items-center gap-1.5 text-xs bg-background"
            >
              <Download size={13} />
              导出项目文件
            </button>

            <button
              className="bms-btn-primary flex items-center gap-2 text-xs"
              onClick={() => setShowNewModal(true)}
            >
              <Plus size={13} />
              新建项目
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bms-table-header text-left">
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">项目编号</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">项目名称</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">关联客户与合同</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">分组数</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">设备数</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">状态</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pagedProjects.length > 0 ? (
                pagedProjects.map((p, i) => {
                  const isReadonly = READONLY_STATUSES.includes(p.status);
                  return (
                    <tr key={p.id} className={`table-row-hover text-sm transition-colors ${i % 2 === 0 ? "" : "bg-muted/30"}`}>
                      <td className="px-5 py-3 text-muted-foreground font-mono text-xs">{p.id}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <FolderOpen size={14} className={`flex-shrink-0 ${isReadonly ? 'text-muted-foreground' : 'text-primary'}`} />
                          <span className="font-medium text-foreground">{p.name}</span>
                          {isReadonly && (
                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">只读</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-foreground font-medium text-xs">{p.customer}</span>
                          <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                            <Link size={10}/> {p.contractNo}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-foreground">{p.groups}</td>
                      <td className="px-5 py-3 text-foreground">{p.devices}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded border font-medium ${STATUS_COLOR[p.status]}`}>
                          {STATUS_LABEL[p.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            className="px-2 py-1.5 flex items-center gap-1 rounded border border-border hover:bg-muted transition-colors text-xs font-medium text-foreground"
                            title="进入项目详情"
                            onClick={() => onViewDetail && onViewDetail(p.id)}
                          >
                            <FileText size={13} className="text-muted-foreground" />
                            项目详情
                          </button>

                          {!isReadonly && (
                            <button
                              className="px-2 py-1.5 flex items-center gap-1 rounded bg-secondary text-primary hover:bg-primary hover:text-primary-foreground transition-colors text-xs font-medium"
                              title="设备分组管理"
                              onClick={() => handleOpenDeviceGroup(p)}
                            >
                              <Network size={13} />
                              设备分组
                            </button>
                          )}

                          {!isReadonly && (
                            <RowActionDropdown
                              project={p}
                              onAction={handleRowAction}
                              onDelete={(proj) => setDeleteTarget(proj)}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground text-sm">
                    没有找到匹配的项目
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

      <NewProjectModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSave={handleCreateProject}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="删除项目"
        msg={deleteTarget ? `确定要删除项目「${deleteTarget.name}」吗？删除后数据将无法恢复，项目下所有分组和设备关联也将一并解除。` : ""}
        onConfirm={handleDeleteProject}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default ProjectPage;