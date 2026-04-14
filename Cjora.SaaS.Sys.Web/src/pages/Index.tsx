import { useState, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import PageHeader from "../components/PageHeader";

import DashboardPage from "./DashboardPage";
import CustomerPage from "./CustomerPage";
import ProjectPage from "./ProjectPage";
import ProjectDetailPage from "./ProjectDetailPage";
import ApprovalFlowPage from "./ApprovalFlowPage";
import ApprovalListPage from "./ApprovalListPage";
import BatteryArchivePage from "./BatteryArchivePage";
import BatteryModelPage from "./BatteryModelPage";
import ProtectionBoardPage from "./ProtectionBoardPage";
import DeviceAccessPage from "./DeviceAccessPage";
import DeviceCommandPage from "./DeviceCommandPage";
import FirmwareManagePage from "./FirmwareManagePage";
import DeviceGroupPage from "./DeviceGroupPage";
import BatteryDetailPage from "./BatteryDetailPage";
import LeadPage from "./LeadPage";
import ContractPage from "./ContractPage";
import OpportunityPage from "./OpportunityPage";
import PaymentPage from "./PaymentPage";
import RefundPage from "./RefundPage";
import DataForwardPage from "./DataForwardPage";
import DataForwardCreatePage from "./DataForwardCreatePage";
import SysUserPage from "./sys/SysUserPage";
import SysDeptPage from "./sys/SysDeptPage";
import SysRolePage from "./sys/SysRolePage";
import SysPermPage from "./sys/SysPermPage";
import SysDictPage from "./sys/SysDictPage";
import { BatteryStatus } from "./BatteryArchivePage";
import type { Lead } from "./LeadPage";
import type { Opportunity } from "./OpportunityPage";
import type { Contract } from "./ContractPage";

const pageConfig: Record<string, { title: string; subtitle: string; hideHeader?: boolean }> = {
  dashboard:          { title: "总览仪表盘",    subtitle: "系统核心指标一览" },
  lead:               { title: "客户线索",       subtitle: "前置线索管理：潜在客户、意向客户的收集与跟进" },
  opportunity:        { title: "商机列表",       subtitle: "线索转化后的商机跟进与赢单推进" },
  customer:           { title: "客户列表",       subtitle: "正式签约客户列表，资源池统一管控" },
  contract:           { title: "合同管理",       subtitle: "商机结果 · 合同条目 · 项目起点 · 回款管理" },
  project:            { title: "项目列表",       subtitle: "立项、设备分组、项目统计等执行载体管理" },
  "project-detail":   { title: "项目详情",       subtitle: "管理项目完整生命周期", hideHeader: true },
  "approval-list":    { title: "待办审批",       subtitle: "处理项目立项、合同等各类业务审批申请" },
  "approval-flow":    { title: "流程配置",       subtitle: "配置多业务场景的审批节点和角色" },
  "battery-archive":  { title: "电池档案",       subtitle: "电池资产管理、生命周期追踪与状态流转" },
  "battery-model":    { title: "电池型号",       subtitle: "电池产品全套技术规格与测试数据集中管理" },
  "protection-board": { title: "保护板",         subtitle: "保护板电路规格、固件版本与通讯协议管理" },
  "device-group":     { title: "设备分组",       subtitle: "管理项目设备的分组架构与设备归属", hideHeader: true },
  "battery-detail":   { title: "电池详情",       subtitle: "电池全生命周期数据详情", hideHeader: true },
  "device-access":    { title: "设备接入",       subtitle: "设备注册、接入配置与状态管理" },
  "device-command":   { title: "指令下发",       subtitle: "远程配置设备参数，支持单台与批量下发" },
  "firmware-manage":  { title: "固件列表",       subtitle: "固件版本库管理、上传与历史追踪", hideHeader: true },
  "payment":          { title: "收款记录",       subtitle: "合同收款登记、凭证管理与审批流转" },
  "refund":           { title: "退款记录",       subtitle: "退款申请、审批与执行全流程管理" },
  "data-forward":     { title: "数据转发",       subtitle: "配置设备数据推送规则，将数据转发至第三方服务器" },
  "data-forward-create": { title: "创建转发规则", subtitle: "配置新的数据转发规则", hideHeader: true },
  "sys-user":       { title: "用户管理",   subtitle: "管理系统用户账号、所属部门及角色分配" },
  "sys-dept":       { title: "部门管理",   subtitle: "维护组织架构树形结构，用于数据权限范围划定" },
  "sys-role":       { title: "角色管理",   subtitle: "配置角色功能权限与数据权限，支持跨租户数据隔离" },
  "sys-permission": { title: "权限管理",   subtitle: "菜单权限与按钮权限的统一注册与维护" },
  "sys-dict":       { title: "字典管理",   subtitle: "维护系统字典与业务字典，统一枚举值管理" },
};

type DetailFromPage = "device-group" | "battery-archive" | "";

const Index = () => {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [projectSearch, setProjectSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const [deviceGroupInitProjectId, setDeviceGroupInitProjectId] = useState("");
  const [deviceGroupInitCustomerId, setDeviceGroupInitCustomerId] = useState("");

  const [batteryDetailSn, setBatteryDetailSn] = useState("");
  const [batteryDetailProjectId, setBatteryDetailProjectId] = useState("");
  const [batteryDetailStatus, setBatteryDetailStatus] = useState("");
  const [batteryDetailAssetStatus, setBatteryDetailAssetStatus] = useState<BatteryStatus | undefined>(undefined);
  const [batteryDetailFrom, setBatteryDetailFrom] = useState<DetailFromPage>("");

  const [contractInitAction, setContractInitAction] = useState<"new" | "renew" | "">("");
  const [contractInitCustomer, setContractInitCustomer] = useState("");
  const [contractInitLeadId, setContractInitLeadId] = useState("");
  const [contractInitOpportunityId, setContractInitOpportunityId] = useState("");
  const [contractInitOpportunityName, setContractInitOpportunityName] = useState("");

  const [pendingApprovalNotice, setPendingApprovalNotice] = useState<{ projectId: string; projectName: string } | null>(null);

  const [opportunityInitLead, setOpportunityInitLead] = useState<Lead | null>(null);

  const [autoCreatedCustomers, setAutoCreatedCustomers] = useState<Array<{ name: string; contact: string; phone: string; leadId?: string }>>([]);

  const [signedContractNotice, setSignedContractNotice] = useState<{ contractNo: string; customerName: string } | null>(null);

  const config = pageConfig[currentPage] || pageConfig["dashboard"];

  const handleNavigate = useCallback((page: string) => {
    setCurrentPage(page);
    if (page === "project") setProjectSearch("");
    if (page === "device-group") { setDeviceGroupInitProjectId(""); setDeviceGroupInitCustomerId(""); }
    if (page === "contract") { setContractInitAction(""); setContractInitCustomer(""); setContractInitLeadId(""); setContractInitOpportunityId(""); setContractInitOpportunityName(""); }
    if (page === "opportunity") setOpportunityInitLead(null);
  }, []);

  const handleViewProjects = useCallback((customerName: string) => {
    setProjectSearch(customerName);
    setCurrentPage("project");
  }, []);

  const handleRenewContract = useCallback((customerName: string) => {
    setContractInitAction("renew");
    setContractInitCustomer(customerName);
    setCurrentPage("contract");
  }, []);

  const handleCreateOpportunityFromLead = useCallback((lead: Lead) => {
    setOpportunityInitLead(lead);
    setCurrentPage("opportunity");
  }, []);

  const handleCreateContractFromOpportunity = useCallback((opportunity: Opportunity) => {
    setContractInitAction("new");
    setContractInitCustomer(opportunity.customerName);
    setContractInitLeadId(opportunity.leadId || "");
    setContractInitOpportunityId(opportunity.id);
    setContractInitOpportunityName(opportunity.name);
    setCurrentPage("contract");
    console.log(`[CRM] 商机赢单 → 合同创建: ${opportunity.name} (${opportunity.customerName})`);
  }, []);

  const handleNewCustomerFromOpportunity = useCallback((customerName: string, contact: string, phone: string, leadId?: string) => {
    setAutoCreatedCustomers(prev => [...prev, { name: customerName, contact, phone, leadId }]);
    console.log(`[CRM] 自动创建客户档案: ${customerName}（来自线索 ${leadId}）`);
  }, []);

  const handleContractSigned = useCallback((contract: Contract) => {
    setSignedContractNotice({ contractNo: contract.no, customerName: contract.customerName });
    console.log(`[Contract] 合同已签约，可驱动项目生成: ${contract.no}`, contract.items);
    setTimeout(() => setSignedContractNotice(null), 5000);
  }, []);

  const handleNavigateToProject = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentPage("project-detail");
  }, []);

  const handleViewProjectDetail = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentPage("project-detail");
  }, []);

  const handleViewDeviceGroup = useCallback((projectId: string, _projectName: string, customerId: string) => {
    setDeviceGroupInitProjectId(projectId);
    setDeviceGroupInitCustomerId(customerId);
    setCurrentPage("device-group");
  }, []);

  const handleViewBatteryDetail = useCallback(
    (sn: string, projectId: string, status: string, from: DetailFromPage = "device-group", assetStatus?: BatteryStatus) => {
      setBatteryDetailSn(sn);
      setBatteryDetailProjectId(projectId);
      setBatteryDetailStatus(status);
      setBatteryDetailAssetStatus(assetStatus);
      setBatteryDetailFrom(from);
      setCurrentPage("battery-detail");
    },
    []
  );

  const handleProjectSubmitApproval = useCallback((projectId: string, projectName: string) => {
    setPendingApprovalNotice({ projectId, projectName });
    setTimeout(() => setCurrentPage("approval-list"), 1500);
  }, []);

  // 跳转到项目详情（用于关联项目Tab）
  const handleNavigateToProjectDetail = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentPage("project-detail");
  }, []);

  const getSidebarCurrentPage = () => {
    if (currentPage === "project-detail") return "project";
    if (currentPage === "device-group") return "device-group";
    if (currentPage === "battery-detail") return batteryDetailFrom || "device-group";
    if (currentPage === "data-forward-create") return "data-forward";
    return currentPage;
  };

  const renderPage = (page: string) => {
    switch (page) {
      case "dashboard":         return <DashboardPage />;
      case "lead":              return (
        <LeadPage onCreateOpportunity={handleCreateOpportunityFromLead} />
      );
      case "opportunity":       return (
        <OpportunityPage
          initialLead={opportunityInitLead}
          onCreateContract={handleCreateContractFromOpportunity}
          onNewCustomerCreated={handleNewCustomerFromOpportunity}
        />
      );
      case "customer":          return (
        <CustomerPage
          onViewProjects={handleViewProjects}
          onRenewContract={handleRenewContract}
        />
      );
      case "contract":          return (
        <ContractPage
          initialAction={contractInitAction}
          initialCustomer={contractInitCustomer}
          initialLeadId={contractInitLeadId}
          initialOpportunityId={contractInitOpportunityId}
          initialOpportunityName={contractInitOpportunityName}
          onNavigateToProject={handleNavigateToProject}
          onContractSigned={handleContractSigned}
        />
      );
      case "project":           return (
        <ProjectPage
          initialSearch={projectSearch}
          onViewDetail={handleViewProjectDetail}
          onViewDeviceGroup={handleViewDeviceGroup}
          onSubmitApproval={handleProjectSubmitApproval}
        />
      );
      case "project-detail":    return (
        <ProjectDetailPage
          projectId={selectedProjectId}
          onBack={() => setCurrentPage("project")}
          onNavigateToCustomer={() => setCurrentPage("customer")}
          onNavigateToContract={() => setCurrentPage("contract")}
          onNavigateToBatteryModel={() => setCurrentPage("battery-model")}
          onNavigateToProtectionBoard={() => setCurrentPage("protection-board")}
          onNavigateToDeviceGroup={(pid, pname, cid) => handleViewDeviceGroup(pid, pname, cid)}
        />
      );
      case "approval-list":     return <ApprovalListPage />;
      case "approval-flow":     return <ApprovalFlowPage />;
      case "battery-archive":   return (
        <BatteryArchivePage
          onViewDetail={(sn, projectId, assetStatus) =>
            handleViewBatteryDetail(sn, projectId, "online", "battery-archive", assetStatus as BatteryStatus)
          }
        />
      );
      case "battery-model":     return (
        <BatteryModelPage
          onNavigateToProject={handleNavigateToProjectDetail}
        />
      );
      case "protection-board":  return (
        <ProtectionBoardPage
          onNavigateToProject={handleNavigateToProjectDetail}
        />
      );
      case "device-group":      return (
        <DeviceGroupPage
          initialProjectId={deviceGroupInitProjectId}
          initialCustomerId={deviceGroupInitCustomerId}
          onBack={deviceGroupInitProjectId ? () => setCurrentPage("project") : undefined}
          onViewBatteryDetail={(sn, projectId, status) =>
            handleViewBatteryDetail(sn, projectId, status, "device-group")
          }
        />
      );
      case "battery-detail":    return (
        <BatteryDetailPage
          sn={batteryDetailSn}
          model=""
          projectId={batteryDetailProjectId}
          status={batteryDetailStatus}
          assetStatus={batteryDetailAssetStatus}
          onBack={() => setCurrentPage(batteryDetailFrom || "device-group")}
        />
      );
      case "device-access":     return <DeviceAccessPage />;
      case "device-command":    return <DeviceCommandPage />;
      case "firmware-manage":   return <FirmwareManagePage />;
      case "payment":           return <PaymentPage />;
      case "refund":            return <RefundPage />;
      case "data-forward":      return (
        <DataForwardPage
          onCreateRule={() => handleNavigate("data-forward-create")}
        />
      );
      case "data-forward-create": return (
        <DataForwardCreatePage
          onBack={() => handleNavigate("data-forward")}
          onSubmit={() => {
            console.log("[DataForward] 规则提交成功，返回列表");
            handleNavigate("data-forward");
          }}
        />
      );
      case "sys-user":       return <SysUserPage />;
      case "sys-dept":       return <SysDeptPage />;
      case "sys-role":       return <SysRolePage />;
      case "sys-permission": return <SysPermPage />;
      case "sys-dict":       return <SysDictPage />;
      default:                  return <DashboardPage />;
    }
  };

  // suppress unused warning
  void autoCreatedCustomers;

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden">
      <Sidebar currentPage={getSidebarCurrentPage()} onNavigate={handleNavigate} />

      <div className="flex-1 flex flex-col overflow-hidden bg-background min-w-0">
        {!config.hideHeader && (
          <PageHeader title={config.title} subtitle={config.subtitle} />
        )}

        {pendingApprovalNotice && currentPage !== "approval-list" && (
          <div className="mx-4 mt-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-sm animate-in slide-in-from-top-3 z-20">
            <div className="flex items-center gap-2 text-amber-700">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0"></span>
              <span>
                项目「<span className="font-semibold">{pendingApprovalNotice.projectName}</span>」已提交审批，
                即将跳转到审批列表...
              </span>
            </div>
            <button
              onClick={() => setPendingApprovalNotice(null)}
              className="text-amber-500 hover:text-amber-700 transition-colors ml-4 flex-shrink-0"
            >
              ×
            </button>
          </div>
        )}

        {signedContractNotice && currentPage === "contract" && (
          <div className="mx-4 mt-3 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between text-sm animate-in slide-in-from-top-3 z-20">
            <div className="flex items-center gap-2 text-green-700">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0"></span>
              <span>
                合同「<span className="font-semibold">{signedContractNotice.contractNo}</span>」已签约，
                现在可前往「项目管理」创建关联执行项目
              </span>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => { setSignedContractNotice(null); setCurrentPage("project"); }}
                className="text-xs font-medium text-green-700 border border-green-300 rounded px-2 py-1 hover:bg-green-100 transition-colors"
              >
                前往项目管理
              </button>
              <button
                onClick={() => setSignedContractNotice(null)}
                className="text-green-500 hover:text-green-700 transition-colors flex-shrink-0"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-hidden flex flex-col">
          {renderPage(currentPage)}
        </main>
      </div>
    </div>
  );
};

export default Index;
