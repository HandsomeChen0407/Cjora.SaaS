import { useState } from "react";
import { Send, CheckCircle, Search, RefreshCw } from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import Pagination from "../components/Pagination";

const commandTypes = [
  { key: "set_voltage_limit", label: "设置电压上限", params: ["最大电压(V)"] },
  { key: "set_current_limit", label: "设置电流上限", params: ["最大电流(A)"] },
  { key: "set_temp_limit", label: "设置温度上限", params: ["最高温度(°C)"] },
  { key: "set_soc_limit", label: "设置SOC范围", params: ["最低SOC(%)", "最高SOC(%)"] },
  { key: "set_report_interval", label: "设置上报间隔", params: ["上报间隔(s)"] },
  { key: "reboot", label: "远程重启", params: [] },
  { key: "factory_reset", label: "恢复出厂设置", params: [] },
  { key: "enable_charge", label: "开启充电", params: [] },
  { key: "disable_charge", label: "禁止充电", params: [] },
];

const cmdHistory = [
  { id: "CMD-0001", sn: "BMS-000001", type: "设置电压上限", params: "54.5V", operator: "Admin", sendTime: "2024-06-10 14:30:00", status: "success", response: "ACK OK" },
  { id: "CMD-0002", sn: "BMS-000003", type: "设置温度上限", params: "50°C", operator: "Admin", sendTime: "2024-06-10 13:10:22", status: "failed", response: "设备离线" },
  { id: "CMD-0003", sn: "BMS-000005", type: "设置上报间隔", params: "30s", operator: "张伟", sendTime: "2024-06-10 11:45:18", status: "success", response: "ACK OK" },
  { id: "CMD-0004", sn: "BMS-000006", type: "远程重启", params: "-", operator: "Admin", sendTime: "2024-06-10 10:20:05", status: "pending", response: "等待响应" },
  { id: "CMD-0005", sn: "BMS-000002", type: "设置SOC范围", params: "20%-95%", operator: "李明", sendTime: "2024-06-09 16:30:44", status: "success", response: "ACK OK" },
  { id: "CMD-0006", sn: "BMS-000008", type: "开启充电", params: "-", operator: "Admin", sendTime: "2024-06-09 09:15:33", status: "success", response: "ACK OK" },
];

const deviceList = [
  "BMS-000001", "BMS-000002", "BMS-000003", "BMS-000004", "BMS-000005", "BMS-000006", "BMS-000007", "BMS-000008"
];

const DeviceCommandPage = () => {
  const [selectedDevice, setSelectedDevice] = useState("BMS-000001");
  const [selectedCmd, setSelectedCmd] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // 分页状态
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const selectedCmdInfo = commandTypes.find((c) => c.key === selectedCmd);

  const handleSend = () => {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    }, 1500);
  };

  const filtered = cmdHistory.filter((c) =>
    c.sn.includes(search) || c.type.includes(search)
  );

  // 分页切片
  const pagedHistory = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <div className="flex gap-4">
        {/* Command Panel */}
        <div className="w-80 flex-shrink-0 space-y-4">
          <div className="bms-card">
            <h3 className="font-semibold text-foreground mb-4">指令下发</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">目标设备</label>
                <select
                  value={selectedDevice}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                  className="bms-input text-sm w-full"
                >
                  {deviceList.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">指令类型</label>
                <select
                  value={selectedCmd}
                  onChange={(e) => setSelectedCmd(e.target.value)}
                  className="bms-input text-sm w-full"
                >
                  <option value="">请选择指令...</option>
                  {commandTypes.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>

              {selectedCmdInfo && selectedCmdInfo.params.length > 0 && (
                <div className="space-y-2">
                  {selectedCmdInfo.params.map((p) => (
                    <div key={p}>
                      <label className="text-xs text-muted-foreground block mb-1">{p}</label>
                      <input
                        placeholder={`输入${p}`}
                        className="bms-input text-sm w-full"
                      />
                    </div>
                  ))}
                </div>
              )}

              {selectedCmdInfo && (
                <div className="p-3 rounded-lg bg-muted text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">指令说明</p>
                  <p>{selectedCmdInfo.label}：向设备 {selectedDevice} 下发该配置指令，设备收到后立即生效。</p>
                </div>
              )}

              <button
                onClick={handleSend}
                disabled={!selectedCmd || sending}
                className="w-full bms-btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    发送中...
                  </>
                ) : sent ? (
                  <>
                    <CheckCircle size={14} />
                    发送成功
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    下发指令
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Device Status */}
          <div className="bms-card">
            <h4 className="text-sm font-semibold text-foreground mb-3">目标设备状态</h4>
            <div className="space-y-2">
              {[
                { label: "连接状态", value: "在线", ok: true },
                { label: "设备型号", value: "LFP-100Ah-48V" },
                { label: "固件版本", value: "v2.1.3" },
                { label: "最后心跳", value: "30秒前" },
                { label: "指令通道", value: "MQTT / QoS 1" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className={`font-medium ${s.ok ? "text-success" : "text-foreground"}`}>
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* History */}
        <div className="flex-1 bms-card p-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">指令历史记录</h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  placeholder="搜索设备/指令类型..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="bms-input pl-8 w-48 text-sm"
                />
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bms-table-header text-left">
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">指令ID</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">目标设备</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">指令类型</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">参数</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">操作人</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">发送时间</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">执行状态</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">设备响应</th>
                </tr>
              </thead>
              <tbody>
                {pagedHistory.length > 0 ? pagedHistory.map((c, i) => (
                  <tr key={c.id} className={`table-row-hover border-b border-border text-sm ${i % 2 === 0 ? "" : "bg-muted/30"}`}>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{c.id}</td>
                    <td className="px-5 py-3 font-mono text-xs text-accent-foreground font-medium">{c.sn}</td>
                    <td className="px-5 py-3 text-foreground">{c.type}</td>
                    <td className="px-5 py-3 text-muted-foreground font-mono text-xs">{c.params}</td>
                    <td className="px-5 py-3 text-foreground">{c.operator}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{c.sendTime}</td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        status={c.status === "success" ? "inuse" : c.status === "failed" ? "alarm" : "warning"}
                        label={c.status === "success" ? "成功" : c.status === "failed" ? "失败" : "等待中"}
                      />
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{c.response}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                      未找到匹配的指令记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            total={filtered.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        </div>
      </div>
    </div>
  );
};

export default DeviceCommandPage;
