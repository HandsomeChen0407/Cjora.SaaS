import { useState } from "react";
import {
  AlertTriangle, Hash, Package, Battery,
  ChevronDown, ChevronUp, Search, Filter, X
} from "lucide-react";

interface BatteryFaultTabProps {
  sn?: string;
  hwid?: string;
  productSn?: string;
  batteryNo?: string;
}

interface FaultRecord {
  id: string;
  faultName: string;
  faultType: string;
  occurTime: string;
  startTime: string;
  endTime: string;
  alarmLevel: string;
  faultCode: string;
  duration: string;
  endStatus: string;
}

const MOCK_FAULTS: FaultRecord[] = [
  {
    id: "F001",
    faultName: "单体过压告警",
    faultType: "电压异常",
    occurTime: "2024-07-14 10:23:15",
    startTime: "2024-07-14 10:23:15",
    endTime: "2024-07-14 10:35:42",
    alarmLevel: "二级告警",
    faultCode: "0x0102",
    duration: "12分27秒",
    endStatus: "自动恢复",
  },
  {
    id: "F002",
    faultName: "过温保护",
    faultType: "温度异常",
    occurTime: "2024-07-12 14:55:30",
    startTime: "2024-07-12 14:55:30",
    endTime: "2024-07-12 15:20:10",
    alarmLevel: "三级告警",
    faultCode: "0x0301",
    duration: "24分40秒",
    endStatus: "手动复位",
  },
  {
    id: "F003",
    faultName: "SOC过低告警",
    faultType: "容量异常",
    occurTime: "2024-07-10 22:10:08",
    startTime: "2024-07-10 22:10:08",
    endTime: "2024-07-10 22:10:08",
    alarmLevel: "一级告警",
    faultCode: "0x0201",
    duration: "0秒",
    endStatus: "实时告警",
  },
  {
    id: "F004",
    faultName: "充电过流",
    faultType: "电流异常",
    occurTime: "2024-07-09 08:32:55",
    startTime: "2024-07-09 08:32:55",
    endTime: "2024-07-09 08:33:12",
    alarmLevel: "三级告警",
    faultCode: "0x0401",
    duration: "17秒",
    endStatus: "自动恢复",
  },
  {
    id: "F005",
    faultName: "通信中断",
    faultType: "通信异常",
    occurTime: "2024-07-07 03:15:00",
    startTime: "2024-07-07 03:15:00",
    endTime: "2024-07-07 03:45:22",
    alarmLevel: "二级告警",
    faultCode: "0x0501",
    duration: "30分22秒",
    endStatus: "自动恢复",
  },
  {
    id: "F006",
    faultName: "单体欠压告警",
    faultType: "电压异常",
    occurTime: "2024-07-05 19:42:10",
    startTime: "2024-07-05 19:42:10",
    endTime: "2024-07-05 20:05:33",
    alarmLevel: "二级告警",
    faultCode: "0x0103",
    duration: "23分23秒",
    endStatus: "自动恢复",
  },
  {
    id: "F007",
    faultName: "均衡超时",
    faultType: "BMS异常",
    occurTime: "2024-07-03 11:00:45",
    startTime: "2024-07-03 11:00:45",
    endTime: "2024-07-03 11:30:45",
    alarmLevel: "一级告警",
    faultCode: "0x0601",
    duration: "30分钟",
    endStatus: "自动恢复",
  },
  {
    id: "F008",
    faultName: "放电过流保护",
    faultType: "电流异常",
    occurTime: "2024-06-28 16:20:00",
    startTime: "2024-06-28 16:20:00",
    endTime: "2024-06-28 16:20:08",
    alarmLevel: "三级告警",
    faultCode: "0x0402",
    duration: "8秒",
    endStatus: "自动恢复",
  },
];

const ALARM_LEVEL_STYLE: Record<string, string> = {
  "一级告警": "bg-primary/10 text-primary border-primary/30",
  "二级告警": "bg-warning/10 text-warning border-warning/30",
  "三级告警": "bg-destructive/10 text-destructive border-destructive/30",
};

const TYPE_COLORS: Record<string, string> = {
  "电压异常": "bg-primary/8 text-primary",
  "温度异常": "bg-warning/10 text-warning",
  "容量异常": "bg-success/10 text-success",
  "电流异常": "bg-destructive/10 text-destructive",
  "通信异常": "bg-muted text-muted-foreground",
  "BMS异常": "bg-primary/10 text-primary",
};

const BatteryFaultTab = ({
  sn = "BMS-000001",
  hwid = "HWID-BMS-A1-20230501",
  productSn = "FAC-2023-04-00123",
  batteryNo = "BAT-SZ-001",
}: BatteryFaultTabProps) => {
  const [searchText, setSearchText] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterType, setFilterType] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 6;

  const allTypes = Array.from(new Set(MOCK_FAULTS.map((f) => f.faultType)));
  const allLevels = Array.from(new Set(MOCK_FAULTS.map((f) => f.alarmLevel)));

  const filtered = MOCK_FAULTS.filter((f) => {
    const matchSearch =
      !searchText ||
      f.faultName.includes(searchText) ||
      f.faultCode.toLowerCase().includes(searchText.toLowerCase());
    const matchLevel = !filterLevel || f.alarmLevel === filterLevel;
    const matchType = !filterType || f.faultType === filterType;
    return matchSearch && matchLevel && matchType;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const resetFilter = () => {
    setSearchText("");
    setFilterLevel("");
    setFilterType("");
    setCurrentPage(1);
  };

  console.log("[BatteryFaultTab] sn:", sn, "filtered:", filtered.length);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 顶部标识栏 */}
      <div className="bg-card border-b border-border px-6 py-3 flex-shrink-0">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Hash size={13} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">HWID</span>
            <span className="text-xs font-mono font-medium text-foreground">{hwid}</span>
          </div>
          <div className="w-px h-4 bg-border flex-shrink-0"></div>
          <div className="flex items-center gap-2">
            <Package size={13} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">产品SN</span>
            <span className="text-xs font-mono font-medium text-foreground">{productSn}</span>
          </div>
          <div className="w-px h-4 bg-border flex-shrink-0"></div>
          <div className="flex items-center gap-2">
            <Battery size={13} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">电池编号</span>
            <span className="text-xs font-mono font-medium text-foreground">{batteryNo}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {/* 故障统计徽章 */}
            {[
              { label: "三级告警", count: MOCK_FAULTS.filter((f) => f.alarmLevel === "三级告警").length, cls: "bg-destructive/10 text-destructive border-destructive/30" },
              { label: "二级告警", count: MOCK_FAULTS.filter((f) => f.alarmLevel === "二级告警").length, cls: "bg-warning/10 text-warning border-warning/30" },
              { label: "一级告警", count: MOCK_FAULTS.filter((f) => f.alarmLevel === "一级告警").length, cls: "bg-primary/10 text-primary border-primary/30" },
            ].map((b) => (
              <span key={b.label} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${b.cls}`}>
                {b.label} × {b.count}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-muted/20 border-b border-border px-6 py-2.5 flex-shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索故障名称/故障码…"
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
              className="bms-input pl-8 w-52 text-sm h-8"
            />
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            {searchText && (
              <button onClick={() => setSearchText("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-muted-foreground" />
            <select
              value={filterLevel}
              onChange={(e) => { setFilterLevel(e.target.value); setCurrentPage(1); }}
              className="bms-input text-sm h-8 pr-6 min-w-[110px]"
            >
              <option value="">全部等级</option>
              {allLevels.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
            className="bms-input text-sm h-8 pr-6 min-w-[110px]"
          >
            <option value="">全部类型</option>
            {allTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          {(searchText || filterLevel || filterType) && (
            <button
              onClick={resetFilter}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <X size={12} /> 清除筛选
            </button>
          )}

          <span className="ml-auto text-xs text-muted-foreground">
            共 <span className="text-foreground font-medium">{filtered.length}</span> 条故障记录
          </span>
        </div>
      </div>

      {/* 表格区域（可横向滚动）*/}
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[960px]">
          <thead className="sticky top-0 bg-card z-10 shadow-sm">
            <tr className="bms-table-header text-left">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">故障名称</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">故障类型</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">报警等级</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">故障码</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">发生时间</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">起始时间</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">结束时间</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">持续时长</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">结束状态</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap text-center">详情</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paged.length > 0 ? paged.map((f) => {
              const isExpanded = expandedRow === f.id;
              return (
                <>
                  <tr
                    key={f.id}
                    className={`hover:bg-muted/30 transition-colors text-sm cursor-pointer ${isExpanded ? "bg-primary/5" : ""}`}
                    onClick={() => setExpandedRow(isExpanded ? null : f.id)}
                  >
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={13} className="text-warning flex-shrink-0" />
                        {f.faultName}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[f.faultType] || "bg-muted text-muted-foreground"}`}>
                        {f.faultType}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${ALARM_LEVEL_STYLE[f.alarmLevel] || "bg-muted text-muted-foreground border-border"}`}>
                        {f.alarmLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground whitespace-nowrap">{f.faultCode}</td>
                    <td className="px-4 py-3 text-xs text-foreground whitespace-nowrap">{f.occurTime}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{f.startTime}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{f.endTime}</td>
                    <td className="px-4 py-3 text-xs font-medium text-foreground whitespace-nowrap">{f.duration}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        f.endStatus === "自动恢复"
                          ? "bg-success/10 text-success"
                          : f.endStatus === "手动复位"
                          ? "bg-primary/10 text-primary"
                          : "bg-warning/10 text-warning"
                      }`}>
                        {f.endStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${f.id}-detail`} className="bg-muted/20">
                      <td colSpan={10} className="px-6 py-4">
                        <div className="flex flex-wrap gap-x-8 gap-y-3 text-xs">
                          <div>
                            <span className="text-muted-foreground">故障 ID：</span>
                            <span className="font-mono font-medium text-foreground">{f.id}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">所属设备 SN：</span>
                            <span className="font-mono font-medium text-foreground">{sn}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">HWID：</span>
                            <span className="font-mono font-medium text-foreground">{hwid}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">故障码（16进制）：</span>
                            <span className="font-mono font-medium text-foreground">{f.faultCode}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">完整时间段：</span>
                            <span className="font-medium text-foreground">{f.startTime} → {f.endTime}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">处理结果：</span>
                            <span className="font-medium text-foreground">{f.endStatus}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            }) : (
              <tr>
                <td colSpan={10} className="py-16 text-center text-muted-foreground text-sm">
                  {searchText || filterLevel || filterType
                    ? "未找到符合筛选条件的故障记录"
                    : "暂无故障历史记录"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-border flex items-center justify-between flex-shrink-0 bg-muted/10">
          <span className="text-xs text-muted-foreground">
            共 {filtered.length} 条，第 {currentPage}/{totalPages} 页
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-xs rounded border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              上一页
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                  currentPage === p
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-xs rounded border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatteryFaultTab;
