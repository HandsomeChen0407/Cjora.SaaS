// BMS 全局共享数据 Store（基于 React Context，无需第三方库）
// 业务链路: 客户线索 → 合同 → 正式客户 → 项目

export type LeadStatus = 'potential' | 'intent' | 'opportunity';
export type ContractStatus = 'draft' | 'approving' | 'active' | 'ended';
export type ContractType = 'new' | 'renew' | 'expand' | 'change';
export type ProjectStatus = 'draft' | 'pending' | 'approved' | 'active' | 'paused' | 'ended' | 'closed';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'revoked';
export type ApprovalBizType = 'project' | 'contract';

export interface Lead {
  id: string;
  name: string;
  contact: string;
  phone: string;
  status: LeadStatus;
  source: string;
  followRecords: FollowRecord[];
  created: string;
  convertedToCustomerId?: string; // 转化后的正式客户ID
}

export interface FollowRecord {
  id: string;
  time: string;
  content: string;
  operator: string;
}

export interface Contract {
  id: string;
  no: string;
  customerId: string;      // 关联正式客户
  leadId?: string;         // 来源线索（若来自线索转化）
  customerName: string;
  type: ContractType;
  amount: number;
  status: ContractStatus;
  effectiveDate: string;
  expireDate: string;
  created: string;
  approvalId?: string;     // 关联审批单
  prevContractId?: string; // 续签/增购时的上一份合同
  relatedProjectIds: string[];
  remark: string;
}

export interface Customer {
  id: string;
  name: string;
  type: 'enterprise' | 'individual';
  contact: string;
  phone: string;
  tenantId: string | null;
  status: 'active' | 'inactive';
  projects: number;
  created: string;
  sourceContractId: string; // 来源合同
  sourceLeadId?: string;    // 来源线索
}

export interface Project {
  id: string;
  name: string;
  customer: string;
  customerId: string;
  contractId: string;    // 必须关联已生效合同
  contractNo: string;
  groups: number;
  devices: number;
  status: ProjectStatus;
  location: string;
  created: string;
  manager: string;
}

export interface ApprovalRecord {
  id: string;
  no: string;
  bizType: ApprovalBizType;
  title: string;
  relatedId: string;   // projectId 或 contractId
  relatedName: string;
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

export interface ApprovalLog {
  id: number;
  time: string;
  action: string;
  operator: string;
  role: string;
  remark: string;
}

// ========== Mock 初始数据 ==========

export const INITIAL_LEADS: Lead[] = [
  {
    id: 'L001', name: '杭州储能研究院', contact: '孙静', phone: '187-0000-0011',
    status: 'opportunity', source: '行业展会', created: '2024-05-10',
    convertedToCustomerId: undefined,
    followRecords: [
      { id: 'f1', time: '2024-06-01 10:00', content: '完成第二轮技术评估，决策层已认可方案', operator: '张销售' },
      { id: 'f2', time: '2024-05-20 14:30', content: '发送正式报价单，等待回复', operator: '张销售' },
    ],
  },
  {
    id: 'L002', name: '武汉绿色动力有限公司', contact: '孙敏', phone: '188-0000-0008',
    status: 'intent', source: '官网询盘', created: '2024-05-18',
    convertedToCustomerId: undefined,
    followRecords: [
      { id: 'f3', time: '2024-05-25 09:00', content: '电话沟通，对方有意愿采购50台设备', operator: '李销售' },
    ],
  },
  {
    id: 'L003', name: '福州新能源科技', contact: '林峰', phone: '139-0000-0099',
    status: 'potential', source: '朋友介绍', created: '2024-06-01',
    convertedToCustomerId: undefined,
    followRecords: [],
  },
  {
    id: 'L004', name: '南京储能集团', contact: '王磊', phone: '136-1234-5678',
    status: 'opportunity', source: '销售外呼', created: '2024-04-15',
    convertedToCustomerId: 'C009',
    followRecords: [
      { id: 'f5', time: '2024-04-20 11:00', content: '合同谈判完成，已签署', operator: '张销售' },
    ],
  },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'C001', name: '深圳储能科技有限公司', type: 'enterprise', contact: '张伟', phone: '138-0000-0001', tenantId: 'tenant-sz-01', status: 'active', projects: 5, created: '2024-01-10', sourceContractId: 'CON001' },
  { id: 'C002', name: '广州新能源集团', type: 'enterprise', contact: '李明', phone: '139-0000-0002', tenantId: 'tenant-gz-02', status: 'active', projects: 3, created: '2024-02-15', sourceContractId: 'CON002' },
  { id: 'C003', name: '上海锂电科技股份有限公司', type: 'enterprise', contact: '陈芳', phone: '137-0000-0004', tenantId: 'tenant-sh-03', status: 'active', projects: 8, created: '2024-03-22', sourceContractId: 'CON003' },
  { id: 'C004', name: '北京绿能电池有限公司', type: 'enterprise', contact: '刘洋', phone: '135-0000-0005', tenantId: 'tenant-bj-04', status: 'active', projects: 6, created: '2024-04-01', sourceContractId: 'CON004' },
  { id: 'C005', name: '成都智储能源科技', type: 'enterprise', contact: '赵磊', phone: '186-0000-0007', tenantId: null, status: 'active', projects: 2, created: '2024-05-05', sourceContractId: 'CON005' },
  { id: 'C009', name: '南京储能集团', type: 'enterprise', contact: '王磊', phone: '136-1234-5678', tenantId: null, status: 'active', projects: 1, created: '2024-04-22', sourceContractId: 'CON009', sourceLeadId: 'L004' },
];

export const INITIAL_CONTRACTS: Contract[] = [
  {
    id: 'CON001', no: 'CT-2024-001', customerId: 'C001', customerName: '深圳储能科技有限公司',
    type: 'new', amount: 2800000, status: 'active',
    effectiveDate: '2024-01-10', expireDate: '2025-01-09', created: '2024-01-05',
    relatedProjectIds: ['P001'], remark: '首批储能基站部署合同',
  },
  {
    id: 'CON002', no: 'CT-2024-002', customerId: 'C002', customerName: '广州新能源集团',
    type: 'new', amount: 1500000, status: 'active',
    effectiveDate: '2024-02-15', expireDate: '2025-02-14', created: '2024-02-10',
    relatedProjectIds: ['P002'], remark: '',
  },
  {
    id: 'CON003', no: 'CT-2024-003', customerId: 'C003', customerName: '上海锂电科技股份有限公司',
    type: 'new', amount: 5200000, status: 'active',
    effectiveDate: '2024-03-22', expireDate: '2026-03-21', created: '2024-03-18',
    relatedProjectIds: ['P003'], remark: '三年长期合作框架协议',
  },
  {
    id: 'CON004', no: 'CT-2024-004', customerId: 'C004', customerName: '北京绿能电池有限公司',
    type: 'new', amount: 3100000, status: 'active',
    effectiveDate: '2024-04-01', expireDate: '2025-03-31', created: '2024-03-28',
    relatedProjectIds: ['P004'], remark: '',
  },
  {
    id: 'CON005', no: 'CT-2024-005', customerId: 'C005', customerName: '成都智储能源科技',
    type: 'new', amount: 980000, status: 'active',
    effectiveDate: '2024-05-05', expireDate: '2025-05-04', created: '2024-04-30',
    relatedProjectIds: ['P005'], remark: '',
  },
  {
    id: 'CON006', no: 'CT-2024-006', customerId: 'C001', customerName: '深圳储能科技有限公司',
    type: 'renew', amount: 3200000, status: 'draft',
    effectiveDate: '2025-01-10', expireDate: '2026-01-09', created: '2024-11-01',
    prevContractId: 'CON001', relatedProjectIds: [], remark: '合同续签申请',
  },
  {
    id: 'CON007', no: 'CT-2024-007', customerId: 'C002', customerName: '广州新能源集团',
    type: 'expand', amount: 800000, status: 'approving',
    effectiveDate: '', expireDate: '', created: '2024-08-01',
    approvalId: 'AP007', relatedProjectIds: [], remark: '增购100台设备',
  },
  {
    id: 'CON009', no: 'CT-2024-009', customerId: 'C009', customerName: '南京储能集团',
    type: 'new', amount: 1200000, status: 'active',
    effectiveDate: '2024-04-22', expireDate: '2025-04-21', created: '2024-04-18',
    leadId: 'L004', relatedProjectIds: ['P007'], remark: '由线索L004转化',
  },
];

export const INITIAL_PROJECTS: Project[] = [
  { id: 'P001', name: '深圳储能基站项目A', customer: '深圳储能科技有限公司', customerId: 'C001', contractId: 'CON001', contractNo: 'CT-2024-001', groups: 4, devices: 120, status: 'active', location: '深圳市南山区', created: '2024-01-15', manager: '张伟' },
  { id: 'P002', name: '广州光储充一体化项目', customer: '广州新能源集团', customerId: 'C002', contractId: 'CON002', contractNo: 'CT-2024-002', groups: 3, devices: 85, status: 'approved', location: '广州市天河区', created: '2024-02-20', manager: '李明' },
  { id: 'P003', name: '上海园区储能示范工程', customer: '上海锂电科技股份有限公司', customerId: 'C003', contractId: 'CON003', contractNo: 'CT-2024-003', groups: 6, devices: 200, status: 'paused', location: '上海市浦东新区', created: '2024-03-01', manager: '陈芳' },
  { id: 'P004', name: '北京调峰储能项目', customer: '北京绿能电池有限公司', customerId: 'C004', contractId: 'CON004', contractNo: 'CT-2024-004', groups: 2, devices: 60, status: 'ended', location: '北京市朝阳区', created: '2024-03-18', manager: '刘洋' },
  { id: 'P005', name: '成都新能源汽车充电站', customer: '成都智储能源科技', customerId: 'C005', contractId: 'CON005', contractNo: 'CT-2024-005', groups: 5, devices: 150, status: 'active', location: '成都市高新区', created: '2024-04-05', manager: '赵磊' },
  { id: 'P007', name: '南京储能一期工程', customer: '南京储能集团', customerId: 'C009', contractId: 'CON009', contractNo: 'CT-2024-009', groups: 2, devices: 40, status: 'approved', location: '南京市江宁区', created: '2024-04-25', manager: '王磊' },
];

export const INITIAL_APPROVALS: ApprovalRecord[] = [
  {
    id: 'AP001', no: 'AP-2024-001', bizType: 'project',
    title: '深圳储能基站项目A 立项申请',
    relatedId: 'P001', relatedName: '深圳储能基站项目A',
    applicant: '张伟', applicantRole: '项目创建人',
    submitTime: '2024-06-10 09:32', updateTime: '2024-06-10 14:20',
    status: 'approved', currentStep: '已完成', currentApprover: '-',
    totalSteps: 2, doneSteps: 2, remark: '项目资料完整，技术方案可行',
    logs: [
      { id: 1, time: '2024-06-10 14:20', action: '审批通过', operator: '王财务', role: '财务', remark: '财务核算通过，同意立项' },
      { id: 2, time: '2024-06-10 11:05', action: '审批通过', operator: '李主管', role: '销售主管', remark: '销售数据核实无误' },
      { id: 3, time: '2024-06-10 09:32', action: '提交审批', operator: '张伟', role: '项目创建人', remark: '项目资料已完善，申请立项' },
    ],
  },
  {
    id: 'AP002', no: 'AP-2024-002', bizType: 'project',
    title: '广州光储充一体化项目 立项申请',
    relatedId: 'P002', relatedName: '广州光储充一体化项目',
    applicant: '李明', applicantRole: '项目创建人',
    submitTime: '2024-06-12 10:15', updateTime: '2024-06-12 10:15',
    status: 'pending', currentStep: '初审', currentApprover: '销售主管',
    totalSteps: 2, doneSteps: 0, remark: '',
    logs: [
      { id: 1, time: '2024-06-12 10:15', action: '提交审批', operator: '李明', role: '项目创建人', remark: '项目方案已确认，请审批' },
    ],
  },
  {
    id: 'AP007', no: 'AP-2024-007', bizType: 'contract',
    title: '广州新能源集团 增购合同审批',
    relatedId: 'CON007', relatedName: 'CT-2024-007',
    applicant: '李明', applicantRole: '销售经理',
    submitTime: '2024-08-01 09:00', updateTime: '2024-08-01 09:00',
    status: 'pending', currentStep: '合同初审', currentApprover: '法务',
    totalSteps: 3, doneSteps: 0, remark: '',
    logs: [
      { id: 1, time: '2024-08-01 09:00', action: '提交审批', operator: '李明', role: '销售经理', remark: '增购合同，请尽快审批' },
    ],
  },
];
