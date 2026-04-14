import { useState } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  ArrowRight,
  Globe,
  Radio,
  Network,
  MoreHorizontal,
  Power,
  Pencil,
  Trash2,
  Activity,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronDown,
} from "lucide-react";
import Pagination from "../components/Pagination";
import StatCard from "../components/StatCard";

export interface ForwardRule {
  id: string;
  name: string;
  project: string;
  type: "HTTP" | "MQTT" | "TCP";
  target: string;
  status: "active" | "inactive" | "pending";
  lastPushTime: string;
  pushCount: number;
  successRate: number;
  dataTypes: string[];
  rateLimit: string;
}

const mockRules: ForwardRule[] = [
  {
    id: "FWD-001",
    name: `深圳基站 → 客户云平台`,
    project: `P001 · 深圳基站项目A`,
    type: "HTTP",
    target: `https://api.customer-a.com/bms/push`,
    status: "active",
    lastPushTime: `2024-06-10 15:30:22`,
    pushCount: 128400,
    successRate: 99.6,
    dataTypes: [`实时数据`, `告警`],
    rateLimit: `1次/秒`,
  },
  {
    id: "FWD-002",
    name: `上海园区 → SCADA系统`,
    project: `P003 · 上海园区示范`,
    type: "HTTP",
    target: `http://10.0.0.100:8080/iot/data`,
    status: "active",
    lastPushTime: `2024-06-10 15:29:58`,
    pushCount: 56320,
    successRate: 98.2,
    dataTypes: [`实时数据`, `上下线`],
    rateLimit: `5次/秒`,
  },
  {
    id: "FWD-003",
    name: `广州光储 → MQ推送`,
    project: `P002 · 广州光储项目`,
    type: "MQTT",
    target: `mqtt://broker.customer-b.com:1883`,
    status: "pending",
    lastPushTime: `—`,
    pushCount: 0,
    successRate: 0,
    dataTypes: [`实时数据`],
    rateLimit: `10次/秒`,
  },
  {
    id: "FWD-004",
    name: `北京储能 → 运维平台`,
    project: `P004 · 北京储能电站`,
    type: "HTTP",
    target: `https://ops.customer-c.cn/api/v2/device`,
    status: "active",
    lastPushTime: `2024-06-10 15:31:01`,
    pushCount: 89100,
    successRate: 99.1,
    dataTypes: [`实时数据`, `告警`, `上下线`],
    rateLimit: `2次/秒`,
  },
  {
    id: "FWD-005",
    name: `成都园区 → TCP采集`,
    project: `P005 · 成都工业园`,
    type: "TCP",
    target: `tcp://192.168.10.50:9000`,
    status: "inactive",
    lastPushTime: `2024-06-08 10:22:15`,
    pushCount: 3200,
    successRate: 87.5,
    dataTypes: [`实时数据`],
    rateLimit: `1次/秒`,
  },
];

const typeIcon = (type: ForwardRule["type"]) => {
  if (type === "HTTP") return <Globe size={13} className="text-accent-foreground" />;
  if (type === "MQTT") return <Radio size={13} className="text-success" />;
  return <Network size={13} className="text-warning-foreground" />;
};

const typeBg = (type: ForwardRule["type"]) => {
  if (type === "HTTP") return "bg-secondary text-accent-foreground";
  if (type === "MQTT") return "bg-success/10 text-success";
  return "bg-warning/10 text-warning-foreground";
};

const statusConfig = {
  active:   { label: `运行中`, cls: `status-online` },
  inactive: { label: `已停用`, cls: `status-offline` },
  pending:  { label: `待审核`, cls: `status-warning` },
};

interface DataForwardPageProps {
  onCreateRule?: () => void;
}

const DataForwardPage = ({ onCreateRule = () => {} }: DataForwardPageProps) => {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openMenu, setOpenMenu] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = mockRules.filter((r) => {
    const matchSearch = r.name.includes(search) || r.project.includes(search) || r.target.includes(search);
    const matchType = typeFilter === "all" || r.type === typeFilter;
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const activeCount = mockRules.filter((r) => r.status === "active").length;
  const pendingCount = mockRules.filter((r) => r.status === "pending").length;
  const totalPushes = mockRules.reduce((s, r) => s + r.pushCount, 0);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  return (
    <div data-cmp="DataForwardPage" className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* Stats */}
      <div className="flex gap-4">
        <div className="flex-1">
          <StatCard title="转发规则总数" value={String(mockRules.length)} unit="条" iconName="cpu" colorType="blue" />
        </div>
        <div className="flex-1">
          <StatCard title="运行中规则" value={String(activeCount)} unit="条" iconName="activity" colorType="green" />
        </div>
        <div className="flex-1">
          <StatCard title="待审核规则" value={String(pendingCount)} unit="条" iconName="cpu" colorType="orange" />
        </div>
        <div className="flex-1">
          <StatCard title="累计推送次数" value={String(Math.round(totalPushes / 1000))} unit="k次" iconName="check" colorType="teal" />
        </div>
      </div>

      {/* Info Banner */}
      <div className="bms-card py-3 px-5 flex items-start gap-3">
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-secondary flex items-center justify-center mt-0.5">
          <ArrowRight size={14} className="text-accent-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">数据转发说明</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            数据转发允许您将设备实时数据、告警及上下线事件推送至您自己的服务器，而无需开放底层 MQTT/TCP 连接。所有推送均可独立控制频率与开关，MQTT 目标地址需平台审核后生效。
          </p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded bg-success/10 text-success font-medium flex items-center gap-1">
            <CheckCircle2 size={11} />
            安全可控
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-secondary text-accent-foreground font-medium flex items-center gap-1">
            <Activity size={11} />
            可限流
          </span>
        </div>
      </div>

      {/* Table Card */}
      <div className="bms-card p-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <input
                placeholder="搜索规则名称/项目/目标地址..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="bms-input pl-8 w-60 text-sm"
              />
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
            {/* Type filter */}
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                className="bms-input text-sm appearance-none pr-7 pl-3 w-32 cursor-pointer"
              >
                <option value="all">全部类型</option>
                <option value="HTTP">HTTP</option>
                <option value="MQTT">MQTT</option>
                <option value="TCP">TCP</option>
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            {/* Status filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="bms-input text-sm appearance-none pr-7 pl-3 w-28 cursor-pointer"
              >
                <option value="all">全部状态</option>
                <option value="active">运行中</option>
                <option value="inactive">已停用</option>
                <option value="pending">待审核</option>
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            <button className="p-2 rounded hover:bg-muted transition-colors">
              <RefreshCw size={14} className="text-muted-foreground" />
            </button>
          </div>
          <button
            onClick={onCreateRule}
            className="bms-btn-primary flex items-center gap-2 text-xs flex-shrink-0"
          >
            <Plus size={13} />
            创建转发规则
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bms-table-header text-left">
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">规则名称</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">所属项目</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">推送类型</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">目标地址</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">数据类型</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">推送频率</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">状态</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">成功率</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">最近推送</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {paged.length > 0 ? paged.map((rule, i) => {
                const sc = statusConfig[rule.status];
                return (
                  <tr
                    key={rule.id}
                    className={`table-row-hover border-b border-border text-sm ${i % 2 === 0 ? "" : "bg-muted/30"}`}
                  >
                    {/* Name */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground text-sm">{rule.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">{rule.id}</div>
                    </td>
                    {/* Project */}
                    <td className="px-5 py-3 text-xs text-muted-foreground max-w-36">
                      <span className="truncate block">{rule.project}</span>
                    </td>
                    {/* Type */}
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded font-medium ${typeBg(rule.type)}`}>
                        {typeIcon(rule.type)}
                        {rule.type}
                      </span>
                    </td>
                    {/* Target */}
                    <td className="px-5 py-3 max-w-52">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground truncate block">
                        {rule.target}
                      </code>
                    </td>
                    {/* DataTypes */}
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {rule.dataTypes.map((dt) => (
                          <span key={dt} className="text-xs bg-muted px-1.5 py-0.5 rounded text-foreground">
                            {dt}
                          </span>
                        ))}
                      </div>
                    </td>
                    {/* Rate */}
                    <td className="px-5 py-3">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock size={11} />
                        {rule.rateLimit}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${sc.cls}`}>
                        {rule.status === "active" && <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />}
                        {rule.status === "inactive" && <XCircle size={10} />}
                        {rule.status === "pending" && <Clock size={10} />}
                        {sc.label}
                      </span>
                    </td>
                    {/* Success rate */}
                    <td className="px-5 py-3">
                      {rule.status !== "pending" ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${rule.successRate >= 95 ? "bg-success" : rule.successRate >= 80 ? "bg-warning" : "bg-destructive"}`}
                              style={{ width: `${rule.successRate}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{rule.successRate}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    {/* Last push */}
                    <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">{rule.lastPushTime}</td>
                    {/* Actions */}
                    <td className="px-5 py-3">
                      <div className="relative flex items-center gap-1">
                        <button
                          title={rule.status === "active" ? `停用` : `启用`}
                          className={`p-1.5 rounded transition-colors ${rule.status === "active" ? "hover:bg-warning/10 text-muted-foreground hover:text-warning-foreground" : "hover:bg-success/10 text-muted-foreground hover:text-success"}`}
                        >
                          <Power size={13} />
                        </button>
                        <button
                          title="编辑"
                          className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-accent-foreground"
                        >
                          <Pencil size={13} />
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenu(openMenu === rule.id ? "" : rule.id)}
                            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
                          >
                            <MoreHorizontal size={13} />
                          </button>
                          {openMenu === rule.id && (
                            <div
                              className="absolute right-0 top-7 z-20 bg-card border border-border rounded-lg shadow-custom py-1 w-28"
                              onClick={() => setOpenMenu("")}
                            >
                              <button className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors">
                                查看日志
                              </button>
                              <button className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors">
                                复制规则
                              </button>
                              <div className="border-t border-border my-1" />
                              <button className="w-full text-left px-3 py-2 text-xs text-destructive hover:bg-destructive/5 transition-colors flex items-center gap-1.5">
                                <Trash2 size={11} />
                                删除规则
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-muted-foreground text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <ArrowRight size={28} className="text-border" />
                      <span>暂无转发规则，点击右上角「创建转发规则」开始配置</span>
                    </div>
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
    </div>
  );
};

export default DataForwardPage;
