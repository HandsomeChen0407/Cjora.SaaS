import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Page Imports
import Index from "./pages/Index";
import AlarmPage from "./pages/AlarmPage";
import ApprovalFlowPage from "./pages/ApprovalFlowPage";
import ApprovalListPage from "./pages/ApprovalListPage";
import BatteryArchivePage from "./pages/BatteryArchivePage";
import BatteryDetailPage from "./pages/BatteryDetailPage";
import BatteryModelPage from "./pages/BatteryModelPage";
import BatteryMonitorPage from "./pages/BatteryMonitorPage";
import ChargeAnalysisPage from "./pages/ChargeAnalysisPage";
import CustomerPage from "./pages/CustomerPage";
import DashboardPage from "./pages/DashboardPage";
import DeviceAccessPage from "./pages/DeviceAccessPage";
import DeviceCommandPage from "./pages/DeviceCommandPage";
import DeviceGroupPage from "./pages/DeviceGroupPage";
import FirmwareUpgradePage from "./pages/FirmwareUpgradePage";
import FirmwareVersionPage from "./pages/FirmwareVersionPage";
import HealthPage from "./pages/HealthPage";
import NotFound from "./pages/NotFound";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import ProjectPage from "./pages/ProjectPage";
import ProtectionBoardPage from "./pages/ProtectionBoardPage";
import LeadPage from "./pages/LeadPage";
import ContractPage from "./pages/ContractPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        {/* Main application entry point */}
        <Route path="/" element={<Index />} />
        
        {/* Direct page routes for architectural compliance */}
        <Route path="/alarm" element={<AlarmPage />} />
        <Route path="/approval-flow" element={<ApprovalFlowPage />} />
        <Route path="/approval-list" element={<ApprovalListPage />} />
        <Route path="/battery-archive" element={<BatteryArchivePage />} />
        <Route path="/battery-detail" element={<BatteryDetailPage />} />
        <Route path="/battery-model" element={<BatteryModelPage />} />
        <Route path="/battery-monitor" element={<BatteryMonitorPage />} />
        <Route path="/charge-analysis" element={<ChargeAnalysisPage />} />
        <Route path="/customer" element={<CustomerPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/device-access" element={<DeviceAccessPage />} />
        <Route path="/device-command" element={<DeviceCommandPage />} />
        <Route path="/device-group" element={<DeviceGroupPage />} />
        <Route path="/firmware-upgrade" element={<FirmwareUpgradePage />} />
        <Route path="/firmware-version" element={<FirmwareVersionPage />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="/not-found" element={<NotFound />} />
        <Route path="/project-detail" element={<ProjectDetailPage />} />
        <Route path="/project" element={<ProjectPage />} />
        <Route path="/protection-board" element={<ProtectionBoardPage />} />
        <Route path="/lead" element={<LeadPage />} />
        <Route path="/contract" element={<ContractPage />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
