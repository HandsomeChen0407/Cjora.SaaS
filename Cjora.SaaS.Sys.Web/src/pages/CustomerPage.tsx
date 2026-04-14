import { useState } from "react";
import { Search, Edit2, Trash2, Link as LinkIcon, Unlink, Building2, User, FolderOpen, Database, Server, X, CheckCircle, AlertCircle, AlertTriangle, FileText } from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import StatCard from "../components/StatCard";
import Pagination from "../components/Pagination";

interface CustomerPageProps {
  onViewProjects?: (customerName: string) => void;
  onRenewContract?: (customerName: string) => void;
}

// 模拟初始租户资源池
const initialTenants = [
  { id: "tenant-sz-01", name: "深圳一区基础集群", strategy: "logical", boundCustomerId: "C001" },
  { id: "tenant-gz-02", name: "广州二区基础集群", strategy: "logical", boundCustomerId: "C002" },
  { id: "tenant-sh-03", name: "上海三区基础集群", strategy: "logical", boundCustomerId: "C004" },
  { id: "tenant-bj-04", name: "北京四区基础集群", strategy: "logical", boundCustomerId: "C005" },
  { id: "tenant-cd-05", name: "成都五区基础集群", strategy: "logical", boundCustomerId: "C007" },
  { id: "tenant-free-01", name: "华南空闲资源池A", strategy: "logical", boundCustomerId: null },
  { id: "tenant-free-02", name: "华南空闲资源池B", strategy: "logical", boundCustomerId: null },
  { id: "tenant-vip-01", name: "华东专属独立数据库", strategy: "physical", boundCustomerId: null },
];

// 模拟初始客户数据
const initialCustomers = [
  { id: "C001", name: "深圳储能科技有限公司", type: "enterprise", contact: "张伟", phone: "138-0000-0001", tenantId: "tenant-sz-01", status: "active", projects: 5, contracts: 2, created: "2024-01-10" },
  { id: "C002", name: "广州新能源集团", type: "enterprise", contact: "李明", phone: "139-0000-0002", tenantId: "tenant-gz-02", status: "active", projects: 3, contracts: 1, created: "2024-02-15" },
  { id: "C004", name: "上海锂电科技股份有限公司", type: "enterprise", contact: "陈芳", phone: "137-0000-0004", tenantId: "tenant-sh-03", status: "active", projects: 8, contracts: 3, created: "2024-03-22" },
  { id: "C005", name: "北京绿能电池有限公司", type: "enterprise", contact: "刘洋", phone: "135-0000-0005", tenantId: "tenant-bj-04", status: "active", projects: 6, contracts: 2, created: "2024-04-01" },
  { id: "C007", name: "成都智储能源科技", type: "enterprise", contact: "赵磊", phone: "186-0000-0007", tenantId: "tenant-cd-05", status: "active", projects: 2, contracts: 1, created: "2024-05-05" },
];

const CustomerPage = ({ onViewProjects, onRenewContract }: CustomerPageProps) => {
  const [customers, setCustomers] = useState(initialCustomers);
  const [tenants, setTenants] = useState(initialTenants);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [modalConfig, setModalConfig] = useState<{ type: 'customer' | 'tenant' | 'bind' | null, data?: any, mode?: 'add' | 'edit' }>({ type: null });
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'primary';
  } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filteredCustomers = customers.filter((c) => {
    const matchSearch = c.name.includes(search) || c.contact.includes(search);
    const matchType = typeFilter === "all" || c.type === typeFilter;
    return matchSearch && matchType;
  });

  const pagedCustomers = filteredCustomers.slice((page - 1) * pageSize, page * pageSize);

  const enterpriseCount = customers.filter(c => c.type === "enterprise").length;
  const individualCount = customers.filter(c => c.type === "individual").length;
  const boundCount = customers.filter(c => c.tenantId !== null).length;

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleTypeFilter = (v: string) => { setTypeFilter(v); setPage(1); };

  const triggerDeleteCustomer = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "确认删除客户",
      message: "确定要删除该客户吗？关联的租户将自动解绑，相关配置数据将被移除且无法恢复。",
      type: 'danger',
      onConfirm: () => {
        setCustomers(prev => prev.filter(c => c.id !== id));
        setTenants(prev => prev.map(t => t.boundCustomerId === id ? { ...t, boundCustomerId: null } : t));
        showToast("客户删除成功");
        setConfirmDialog(null);
      }
    });
  };

  const triggerUnbind = (customerId: string, tenantId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "确认解绑租户",
      message: `确定要解除客户与租户资源池 [${tenantId}] 的绑定关系吗？解除后客户数据将处于不可访问的游离状态。`,
      type: 'warning',
      onConfirm: () => {
        setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, tenantId: null } : c));
        setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, boundCustomerId: null } : t));
        showToast("解绑成功，租户资源已释放");
        setConfirmDialog(null);
      }
    });
  };

  const handleBindTenant = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const tenantId = formData.get("tenantId") as string;
    const customerId = modalConfig.data.id;
    
    if (!tenantId) return showToast("请选择要绑定的租户", "error");

    setConfirmDialog({
      isOpen: true,
      title: "确认绑定租户",
      message: `确定将所选租户资源分配给该客户吗？此操作将立即生效。`,
      type: 'primary',
      onConfirm: () => {
        setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, tenantId } : c));
        setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, boundCustomerId: customerId } : t));
        showToast("租户绑定成功，数据隔离域已分配");
        setConfirmDialog(null);
        setModalConfig({ type: null });
      }
    });
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries()) as any;
    
    setCustomers(customers.map(c => c.id === modalConfig.data.id ? { ...c, ...data } : c));
    showToast("客户信息已更新");
    setModalConfig({ type: null });
  };

  const handleSaveTenant = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries()) as any;
    const newId = `tenant-custom-${Math.floor(Math.random() * 1000)}`;
    setTenants([{ ...data, id: newId, boundCustomerId: null }, ...tenants]);
    showToast("新租户环境初始化成功");
    setModalConfig({ type: null });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 relative">
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-5 ${
          toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 
          toast.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
          'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-4">
        <div className="flex-1">
          <StatCard title="正式客户总数" value={String(customers.length)} unit="家" iconName="users" colorType="blue" />
        </div>
        <div className="flex-1">
          <StatCard title="企业客户" value={String(enterpriseCount)} unit="家" iconName="cpu" colorType="teal" />
        </div>
        <div className="flex-1">
          <StatCard title="个人客户" value={String(individualCount)} unit="人" iconName="activity" colorType="green" />
        </div>
        <div className="flex-1">
          <StatCard title="已开通资源" value={String(boundCount)} unit="家" iconName="check" colorType="orange" />
        </div>
      </div>

      {/* Table Card */}
      <div className="bms-card p-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="搜索客户名称/联系人..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="bms-input pl-8 w-56 text-sm bg-background"
              />
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => handleTypeFilter(e.target.value)}
              className="bms-input text-sm bg-background"
            >
              <option value="all">全部类型</option>
              <option value="enterprise">企业</option>
              <option value="individual">个人</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setModalConfig({ type: 'tenant' })}
              className="bms-btn-secondary flex items-center gap-2 bg-background"
            >
              <Database size={14} />
              管理租户池
            </button>
            <button 
              disabled
              title="新增客户必须由合同生效后自动生成"
              className="bms-btn-primary flex items-center gap-2 opacity-50 cursor-not-allowed"
            >
              <Plus size={14} />
              新增客户
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bms-table-header text-left">
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">客户编号</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">客户名称</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">类型</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">联系人 / 电话</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">合同状态</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">关联租户资源</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">下属项目</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {pagedCustomers.length > 0 ? pagedCustomers.map((c, i) => (
                <tr key={c.id} className={`table-row-hover border-b border-border text-sm transition-colors ${i % 2 === 0 ? "" : "bg-muted/30"}`}>
                  <td className="px-5 py-3 text-muted-foreground font-mono text-xs">{c.id}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {c.type === "enterprise" ? (
                        <Building2 size={14} className="text-primary flex-shrink-0" />
                      ) : (
                        <User size={14} className="text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="font-medium text-foreground">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${c.type === "enterprise" ? "bg-secondary text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
                      {c.type === "enterprise" ? "企业" : "个人"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col">
                      <span className="text-foreground">{c.contact}</span>
                      <span className="text-xs text-muted-foreground">{c.phone}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <FileText size={12} className="text-muted-foreground" />
                      <span className="text-xs font-medium text-primary">{c.contracts} 份合同</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {c.tenantId ? (
                      <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-2 py-1 rounded w-fit border border-green-100">
                        <Server size={12} />
                        <span className="text-xs font-mono">{c.tenantId}</span>
                      </div>
                    ) : (
                      <span className="text-xs px-2 py-1 bg-red-50 text-red-500 rounded border border-red-100 flex items-center gap-1 w-fit">
                        <AlertCircle size={12} /> 未分配资源
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {c.projects > 0 ? (
                      <button
                        onClick={() => onViewProjects && onViewProjects(c.name)}
                        className="text-primary hover:text-blue-700 hover:underline font-medium inline-flex items-center gap-1 transition-colors"
                        title={`点击查看 ${c.name} 的项目`}
                      >
                        <FolderOpen size={13} />
                        {c.projects} 个
                      </button>
                    ) : (
                      <span className="text-muted-foreground text-xs bg-muted px-2 py-0.5 rounded">无项目</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button 
                        onClick={() => onRenewContract && onRenewContract(c.name)}
                        className="px-2 py-1.5 flex items-center gap-1 rounded bg-secondary text-primary hover:bg-primary hover:text-primary-foreground transition-colors text-xs font-medium"
                      >
                        <FileText size={13} /> 续签
                      </button>
                      <button 
                        onClick={() => setModalConfig({ type: 'customer', mode: 'edit', data: c })}
                        className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-primary"
                        title="编辑客户"
                      >
                        <Edit2 size={14} />
                      </button>
                      {c.tenantId ? (
                        <button 
                          onClick={() => triggerUnbind(c.id, c.tenantId!)}
                          className="p-1.5 rounded hover:bg-orange-50 transition-colors text-muted-foreground hover:text-orange-500"
                          title="解绑租户"
                        >
                          <Unlink size={14} />
                        </button>
                      ) : (
                        <button 
                          onClick={() => setModalConfig({ type: 'bind', data: c })}
                          className="p-1.5 rounded hover:bg-green-50 transition-colors text-muted-foreground hover:text-green-600"
                          title="绑定租户"
                        >
                          <LinkIcon size={14} />
                        </button>
                      )}
                      <button 
                        onClick={() => triggerDeleteCustomer(c.id)}
                        className="p-1.5 rounded hover:bg-red-50 transition-colors text-muted-foreground hover:text-destructive"
                        title="删除客户"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                    未找到匹配的正式客户记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          total={filteredCustomers.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        />
      </div>

      {/* 二次确认弹窗 */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-card w-full max-w-sm rounded-xl shadow-custom overflow-hidden">
            <div className="p-6 pb-5">
              <div className="flex items-center gap-3 mb-3">
                {confirmDialog.type === 'danger' && <AlertCircle className="text-destructive flex-shrink-0" size={24} />}
                {confirmDialog.type === 'warning' && <AlertTriangle className="text-warning-foreground flex-shrink-0" size={24} />}
                {confirmDialog.type === 'primary' && <CheckCircle className="text-primary flex-shrink-0" size={24} />}
                <h3 className="font-bold text-foreground text-lg">{confirmDialog.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground pl-9 leading-relaxed">{confirmDialog.message}</p>
            </div>
            <div className="px-6 py-4 bg-muted/30 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="bms-btn-secondary"
              >
                取消
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-opacity hover:opacity-90 text-primary-foreground ${
                  confirmDialog.type === 'danger' ? 'bg-destructive' :
                  confirmDialog.type === 'warning' ? 'bg-warning' : 'bg-primary'
                }`}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal (Only Edit, Add is disabled) */}
      {modalConfig.type === 'customer' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-card w-full max-w-md rounded-xl shadow-custom overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-foreground text-lg">编辑客户资料</h3>
              <button onClick={() => setModalConfig({ type: null })} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveCustomer} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">客户名称</label>
                <input required name="name" defaultValue={modalConfig.data?.name} placeholder="输入公司或个人名称" className="bms-input w-full" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">客户类型</label>
                <select name="type" defaultValue={modalConfig.data?.type || 'enterprise'} className="bms-input w-full">
                  <option value="enterprise">企业客户</option>
                  <option value="individual">个人客户</option>
                </select>
              </div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium text-foreground">联系人</label>
                  <input required name="contact" defaultValue={modalConfig.data?.contact} placeholder="姓名" className="bms-input w-full" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium text-foreground">联系电话</label>
                  <input required name="phone" defaultValue={modalConfig.data?.phone} placeholder="手机号或座机" className="bms-input w-full" />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-border">
                <button type="button" onClick={() => setModalConfig({ type: null })} className="bms-btn-secondary">取消</button>
                <button type="submit" className="bms-btn-primary">保存配置</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Tenant Modal */}
      {modalConfig.type === 'tenant' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-card w-full max-w-lg rounded-xl shadow-custom overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
                <Database size={18} className="text-primary"/> 
                初始化租户集群
              </h3>
              <button onClick={() => setModalConfig({ type: null })} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveTenant} className="p-6 space-y-5">
              <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm flex gap-2 border border-blue-100">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <p>租户是 SaaS 系统数据隔离的基础单元。创建租户后，可将其分配给客户，实现设备与业务数据的独立管控。</p>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">资源池名称</label>
                <input required name="name" placeholder="例如：华南大区基础集群池" className="bms-input w-full" />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">数据隔离策略 <span className="text-xs text-muted-foreground font-normal">(基于租户级别的SaaS底层架构)</span></label>
                
                <label className="flex items-start gap-3 p-3 border border-primary/50 bg-secondary/20 rounded-lg cursor-pointer relative overflow-hidden">
                  <input type="radio" name="strategy" value="logical" defaultChecked className="mt-1" />
                  <div>
                    <span className="font-semibold text-sm text-foreground block">逻辑隔离 (共享数据库，独立Tenant ID)</span>
                    <span className="text-xs text-muted-foreground mt-1 block">推荐选择。所有租户共享数据库实例，通过业务代码拦截注入 tenant_id 实现数据级隔离，资源利用率最高。</span>
                  </div>
                  <div className="absolute top-0 right-0 px-2 py-1 bg-primary text-primary-foreground text-[10px] rounded-bl-lg font-medium">默认</div>
                </label>

                <label className="flex items-start gap-3 p-3 border border-border bg-muted/30 rounded-lg opacity-70 cursor-not-allowed">
                  <input type="radio" name="strategy" value="physical" disabled className="mt-1" />
                  <div>
                    <span className="font-semibold text-sm text-foreground flex items-center gap-2">
                      物理隔离 (独立数据库实例)
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded border border-amber-200">私有化专享</span>
                    </span>
                    <span className="text-xs text-muted-foreground mt-1 block">每个租户分配独立 Database/Schema 连接串。该功能需要向系统管理员申请开通高级版许可。</span>
                  </div>
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-border">
                <button type="button" onClick={() => setModalConfig({ type: null })} className="bms-btn-secondary">取消</button>
                <button type="submit" className="bms-btn-primary flex items-center gap-2">
                  <Database size={14} /> 创建资源池
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bind Tenant Modal */}
      {modalConfig.type === 'bind' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-card w-full max-w-md rounded-xl shadow-custom overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-foreground text-lg">为客户分配租户</h3>
              <button onClick={() => setModalConfig({ type: null })} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleBindTenant} className="p-6 space-y-4">
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-1">当前客户</p>
                <p className="text-base font-semibold text-foreground">{modalConfig.data?.name}</p>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">选择空闲租户资源</label>
                <select name="tenantId" className="bms-input w-full" required>
                  <option value="">-- 请选择可用租户 --</option>
                  {tenants.filter(t => !t.boundCustomerId).map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.id} - {t.strategy === 'logical' ? '逻辑隔离' : '物理隔离'})</option>
                  ))}
                </select>
                {tenants.filter(t => !t.boundCustomerId).length === 0 && (
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                    <AlertCircle size={12}/> 当前没有空闲的租户资源，请先去"创建租户池"
                  </p>
                )}
              </div>
              
              <div className="pt-6 flex justify-end gap-3 border-t border-border">
                <button type="button" onClick={() => setModalConfig({ type: null })} className="bms-btn-secondary">取消</button>
                <button type="submit" className="bms-btn-primary" disabled={tenants.filter(t => !t.boundCustomerId).length === 0}>
                  确定绑定
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPage;