import { useState } from "react";
import { Plus, Trash2, ArrowDown, Save, User, Users, GitMerge, FileText, CreditCard } from "lucide-react";
import StatCard from "../components/StatCard";

interface FlowNode {
  id: string;
  name: string;
  role: string;
}

const AVAILABLE_ROLES = [
  { id: "creator", name: "申请人" },
  { id: "sales_manager", name: "销售主管" },
  { id: "finance", name: "财务" },
  { id: "tech_lead", name: "技术负责人" },
  { id: "admin", name: "管理员" },
  { id: "boss", name: "总经理" },
];

const ApprovalFlowPage = () => {
  const [businessType, setBusinessType] = useState<'project' | 'contract' | 'refund'>('project');

  const [projectNodes, setProjectNodes] = useState<FlowNode[]>([
    { id: "node-1", name: "技术方案初审", role: "tech_lead" },
    { id: "node-2", name: "立项终审", role: "admin" },
  ]);

  const [contractNodes, setContractNodes] = useState<FlowNode[]>([
    { id: "node-3", name: "销售合同初审", role: "sales_manager" },
    { id: "node-4", name: "财务价格复审", role: "finance" },
  ]);

  const [refundNodes, setRefundNodes] = useState<FlowNode[]>([
    { id: "node-5", name: "退款原因审核", role: "sales_manager" },
    { id: "node-6", name: "财务退款确认", role: "finance" },
    { id: "node-7", name: "总经理终审", role: "boss" },
  ]);

  const getNodes = () => {
    if (businessType === 'project') return projectNodes;
    if (businessType === 'contract') return contractNodes;
    return refundNodes;
  };

  const setNodes = (newNodes: FlowNode[]) => {
    if (businessType === 'project') setProjectNodes(newNodes);
    else if (businessType === 'contract') setContractNodes(newNodes);
    else setRefundNodes(newNodes);
  };

  const nodes = getNodes();

  const handleAddNode = () => {
    const newNode: FlowNode = {
      id: `node-${Date.now()}`,
      name: "新审批节点",
      role: "tech_lead",
    };
    setNodes([...nodes, newNode]);
  };

  const handleRemoveNode = (id: string) => {
    setNodes(nodes.filter(n => n.id !== id));
  };

  const handleUpdateNode = (id: string, field: keyof FlowNode, value: string) => {
    setNodes(nodes.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  const handleSave = () => {
    alert("审批流程已保存并生效！");
  };

  const getBusinessName = () => {
    if (businessType === 'project') return '项目立项';
    if (businessType === 'contract') return '合同审批';
    return '预留退款';
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-background h-full relative" data-cmp="ApprovalFlowPage">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <GitMerge className="text-primary" size={20} />
            通用审批流程配置
          </h2>
          <p className="text-sm text-muted-foreground mt-1">配置不同业务场景下的审批节点与角色权限</p>
        </div>
        <button onClick={handleSave} className="bms-btn-primary flex items-center gap-2">
          <Save size={15} />
          保存流程配置
        </button>
      </div>

      <div className="flex border-b border-border mb-4">
        {[
          { key: 'project', label: '项目立项', icon: GitMerge },
          { key: 'contract', label: '合同审批', icon: FileText },
          { key: 'refund', label: '退款审批', icon: CreditCard },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setBusinessType(t.key as any)}
            className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
              businessType === t.key ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <StatCard title="当前流程节点数" value={String(nodes.length)} iconName="activity" colorType="blue" />
        </div>
        <div className="flex-1">
          <StatCard title="涉及角色数" value={String(new Set(nodes.map(n => n.role)).size)} iconName="users" colorType="green" />
        </div>
      </div>

      <div className="bms-card bg-muted/20 border border-border flex flex-col items-center py-10 relative overflow-hidden">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(#000 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>
        
        {/* Start Node */}
        <div className="flex flex-col items-center relative z-10">
          <div className="w-64 bg-card border border-border shadow-sm rounded-lg p-3 flex flex-col items-center gap-2 opacity-80">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <User size={14} className="text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground">发起人</span>
            <span className="text-xs text-muted-foreground">提交 {getBusinessName()} 申请</span>
          </div>
          <ArrowDown size={24} className="text-muted-foreground/50 my-3" />
        </div>

        {/* Dynamic Nodes */}
        {nodes.map((node, index) => (
          <div key={node.id} className="flex flex-col items-center relative z-10 group">
            <div className="w-80 bg-card border border-border shadow-custom rounded-xl p-4 flex flex-col gap-3 relative transition-all hover:border-primary/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  第 {index + 1} 级审批
                </span>
                <button
                  onClick={() => handleRemoveNode(node.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  title="删除节点"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">节点名称</label>
                <input
                  value={node.name}
                  onChange={(e) => handleUpdateNode(node.id, 'name', e.target.value)}
                  className="bms-input text-sm w-full py-1.5"
                  placeholder="输入节点名称"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">审批角色</label>
                <div className="relative">
                  <Users size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <select
                    value={node.role}
                    onChange={(e) => handleUpdateNode(node.id, 'role', e.target.value)}
                    className="bms-input text-sm w-full pl-8 py-1.5"
                  >
                    {AVAILABLE_ROLES.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <ArrowDown size={24} className="text-muted-foreground/50 my-3" />
          </div>
        ))}

        {/* Add Node Button */}
        <div className="relative z-10 flex flex-col items-center">
          <button
            onClick={handleAddNode}
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
            title="添加审批节点"
          >
            <Plus size={20} />
          </button>
          <ArrowDown size={24} className="text-muted-foreground/50 my-3" />
          
          {/* End Node */}
          <div className="w-64 bg-success/5 border border-success/20 shadow-sm rounded-lg p-3 flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-success"></div>
            </div>
            <span className="text-sm font-medium text-success">审批通过 · 流程完结</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ApprovalFlowPage;