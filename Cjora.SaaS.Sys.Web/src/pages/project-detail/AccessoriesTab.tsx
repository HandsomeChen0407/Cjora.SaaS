import { useState } from "react";
import { Package, Plus, Search, Wrench, Truck, CheckCircle, Clock, AlertCircle, MoreHorizontal } from "lucide-react";

interface AccessoriesTabProps {
  projectId?: string;
}

type AccessoryStatus = "instock" | "shipped" | "installed" | "pending";

interface Accessory {
  id: string;
  name: string;
  partNo: string;
  category: string;
  unit: string;
  planned: number;
  shipped: number;
  installed: number;
  status: AccessoryStatus;
  supplier: string;
  remark: string;
}

const accessories: Accessory[] = [
  {
    id: "A001",
    name: "BMS 通信线（CAN）",
    partNo: "CBL-CAN-1M",
    category: "线缆",
    unit: "根",
    planned: 120,
    shipped: 120,
    installed: 118,
    status: "installed",
    supplier: "深圳凯星线缆",
    remark: "1米标准CAN通信线",
  },
  {
    id: "A002",
    name: "电池安装支架（壁挂式）",
    partNo: "BKT-WM-48V",
    category: "安装件",
    unit: "套",
    planned: 120,
    shipped: 120,
    installed: 120,
    status: "installed",
    supplier: "宁波金属制品厂",
    remark: "适配LFP-48V系列",
  },
  {
    id: "A003",
    name: "DC 输出熔断器（100A）",
    partNo: "FUS-100A-60V",
    category: "保护器件",
    unit: "个",
    planned: 240,
    shipped: 240,
    installed: 236,
    status: "installed",
    supplier: "上海保险丝厂",
    remark: "每台电池配2只，备用4只",
  },
  {
    id: "A004",
    name: "工业以太网交换机（8口）",
    partNo: "SW-ETH-8P",
    category: "网络设备",
    unit: "台",
    planned: 15,
    shipped: 15,
    installed: 14,
    status: "installed",
    supplier: "研华科技",
    remark: "用于BMS局域网汇聚",
  },
  {
    id: "A005",
    name: "RS485 转 CAN 协议转换器",
    partNo: "GW-485-CAN",
    category: "网关设备",
    unit: "台",
    planned: 10,
    shipped: 10,
    installed: 10,
    status: "installed",
    supplier: "致远电子",
    remark: "用于旧设备接入兼容",
  },
  {
    id: "A006",
    name: "温湿度传感器",
    partNo: "SEN-TH-RS485",
    category: "传感器",
    unit: "个",
    planned: 30,
    shipped: 25,
    installed: 20,
    status: "shipped",
    supplier: "建大仁科",
    remark: "机房环境监测用",
  },
  {
    id: "A007",
    name: "配电箱（防水IP54）",
    partNo: "PDU-IP54-60A",
    category: "配电设备",
    unit: "套",
    planned: 8,
    shipped: 0,
    installed: 0,
    status: "pending",
    supplier: "正泰电气",
    remark: "待采购，预计下周到货",
  },
  {
    id: "A008",
    name: "防火封堵套件",
    partNo: "FIRE-SEAL-KIT",
    category: "安全附件",
    unit: "套",
    planned: 120,
    shipped: 120,
    installed: 120,
    status: "installed",
    supplier: "3M 中国",
    remark: "线缆穿墙防火封堵",
  },
];

const STATUS_CONFIG: Record<AccessoryStatus, { label: string; className: string; icon: React.FC<{ size?: number; className?: string }> }> = {
  installed: { label: "已安装", className: "text-success bg-success/10 border-success/30", icon: CheckCircle },
  shipped: { label: "已发货", className: "text-primary bg-primary/10 border-primary/20", icon: Truck },
  instock: { label: "备货中", className: "text-warning bg-warning/10 border-warning/30", icon: Clock },
  pending: { label: "待采购", className: "text-muted-foreground bg-muted border-border", icon: AlertCircle },
};

const AccessoriesTab = ({ projectId = "P001" }: AccessoriesTabProps) => {
  const [searchText, setSearchText] = useState("");

  console.log("[AccessoriesTab] projectId:", projectId);

  const filtered = accessories.filter(
    (a) =>
      a.name.toLowerCase().includes(searchText.toLowerCase()) ||
      a.partNo.toLowerCase().includes(searchText.toLowerCase()) ||
      a.category.includes(searchText)
  );

  const totalPlanned = accessories.reduce((s, a) => s + a.planned, 0);
  const totalShipped = accessories.reduce((s, a) => s + a.shipped, 0);
  const totalInstalled = accessories.reduce((s, a) => s + a.installed, 0);
  const pendingCount = accessories.filter((a) => a.status === "pending").length;

  return (
    <div data-cmp="AccessoriesTab" className="p-6 space-y-5">
      {/* 汇总统计 */}
      <div className="flex gap-4">
        <div className="flex-1 bg-card rounded-xl border border-border shadow-custom p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Package size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">计划总量</p>
            <p className="text-lg font-bold text-foreground">{totalPlanned.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex-1 bg-card rounded-xl border border-border shadow-custom p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Truck size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">已发货</p>
            <p className="text-lg font-bold text-foreground">{totalShipped.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex-1 bg-card rounded-xl border border-border shadow-custom p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
            <CheckCircle size={16} className="text-success" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">已安装</p>
            <p className="text-lg font-bold text-success">{totalInstalled.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex-1 bg-card rounded-xl border border-border shadow-custom p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
            <AlertCircle size={16} className="text-warning" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">待采购物料</p>
            <p className="text-lg font-bold text-warning">{pendingCount} 类</p>
          </div>
        </div>
      </div>

      {/* 列表 */}
      <div className="bg-card rounded-xl border border-border shadow-custom overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
          <Wrench size={14} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">配件清单</h3>
          <div className="ml-auto relative w-52">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="搜索名称/型号..."
              className="w-full pl-7 pr-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button className="bms-btn-primary text-xs flex items-center gap-1 py-1.5">
            <Plus size={12} /> 新增配件
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted text-muted-foreground text-xs text-left">
              <tr>
                <th className="px-5 py-3 font-medium">配件名称</th>
                <th className="px-5 py-3 font-medium">物料编号</th>
                <th className="px-5 py-3 font-medium">类别</th>
                <th className="px-5 py-3 font-medium">供应商</th>
                <th className="px-5 py-3 font-medium text-center">计划</th>
                <th className="px-5 py-3 font-medium text-center">发货</th>
                <th className="px-5 py-3 font-medium text-center">安装</th>
                <th className="px-5 py-3 font-medium">状态</th>
                <th className="px-5 py-3 font-medium">备注</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {filtered.map((item) => {
                const cfg = STATUS_CONFIG[item.status];
                const StatusIcon = cfg.icon;
                return (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 font-medium text-foreground">{item.name}</td>
                    <td className="px-5 py-3 font-mono text-muted-foreground">{item.partNo}</td>
                    <td className="px-5 py-3">
                      <span className="bg-muted px-2 py-0.5 rounded text-muted-foreground">{item.category}</span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{item.supplier}</td>
                    <td className="px-5 py-3 text-center font-mono">{item.planned}</td>
                    <td className="px-5 py-3 text-center font-mono">{item.shipped}</td>
                    <td className="px-5 py-3 text-center font-mono">{item.installed}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-medium ${cfg.className}`}>
                        <StatusIcon size={10} /> {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground max-w-32 truncate" title={item.remark}>{item.remark}</td>
                    <td className="px-5 py-3">
                      <button className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors">
                        <MoreHorizontal size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AccessoriesTab;
