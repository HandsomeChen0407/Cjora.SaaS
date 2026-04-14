import { useState } from "react";
import { Plus, Search, Copy, Link, RefreshCw, Edit2, Trash2 } from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import StatCard from "../components/StatCard";
import Pagination from "../components/Pagination";

const devices = [
  { id: "DEV-001", sn: "BMS-000001", model: "LFP-100Ah-48V", imei: "861234567890001", protocol: "MQTT", accessKey: "ak_sz01_abc123", project: "P001", status: "online", lastSeen: "2024-06-10 15:30:22" },
  { id: "DEV-002", sn: "BMS-000002", model: "LFP-100Ah-48V", imei: "861234567890002", protocol: "MQTT", accessKey: "ak_sz02_def456", project: "P001", status: "online", lastSeen: "2024-06-10 15:29:58" },
  { id: "DEV-003", sn: "BMS-000003", model: "NMC-200Ah-96V", imei: "861234567890003", protocol: "TCP", accessKey: "ak_sh01_ghi789", project: "P003", status: "alarm", lastSeen: "2024-06-10 15:28:44" },
  { id: "DEV-004", sn: "BMS-000004", model: "NMC-200Ah-96V", imei: "861234567890004", protocol: "MQTT", accessKey: "ak_sh02_jkl012", project: "P003", status: "offline", lastSeen: "2024-06-09 22:10:05" },
  { id: "DEV-005", sn: "BMS-000005", model: "NCM-150Ah-72V", imei: "861234567890005", protocol: "CoAP", accessKey: "ak_cd01_mno345", project: "P005", status: "online", lastSeen: "2024-06-10 15:31:01" },
  { id: "DEV-006", sn: "BMS-000006", model: "LFP-100Ah-48V", imei: "861234567890006", protocol: "MQTT", accessKey: "ak_gz01_pqr678", project: "P002", status: "online", lastSeen: "2024-06-10 15:30:44" },
];

const steps = [
  { step: "01", title: "设备注册", desc: "在平台创建设备，获取接入凭证（AccessKey）" },
  { step: "02", title: "固件烧录", desc: "将平台地址和 AccessKey 烧录至 BMS 设备" },
  { step: "03", title: "网络接入", desc: "设备通过 MQTT/TCP/CoAP 协议连接到平台服务器" },
  { step: "04", title: "数据上报", desc: "设备按配置周期上报电压、电流、温度等遥测数据" },
];

const DeviceAccessPage = () => {
  const [search, setSearch] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [copied, setCopied] = useState("");

  // 分页状态
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = devices.filter((d) =>
    d.sn.includes(search) || d.imei.includes(search) || d.model.includes(search)
  );

  // 分页切片
  const pagedDevices = filtered.slice((page - 1) * pageSize, page * pageSize);

  const online = devices.filter((d) => d.status === "online").length;
  const offline = devices.filter((d) => d.status === "offline").length;

  const handleCopy = (text: string, id: string) => {
    setCopied(id);
    setTimeout(() => setCopied(""), 2000);
  };

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <div className="flex gap-4">
        <div className="flex-1"><StatCard title="已注册设备" value={String(devices.length)} unit="台" iconName="cpu" colorType="blue" /></div>
        <div className="flex-1"><StatCard title="在线设备" value={String(online)} unit="台" iconName="activity" colorType="green" /></div>
        <div className="flex-1"><StatCard title="离线设备" value={String(offline)} unit="台" iconName="cpu" colorType="orange" /></div>
        <div className="flex-1"><StatCard title="接入成功率" value="97.8" unit="%" iconName="check" colorType="teal" /></div>
      </div>

      {/* Guide */}
      <div className="bms-card">
        <h3 className="font-semibold text-foreground mb-3">设备接入流程</h3>
        <div className="flex gap-0">
          {steps.map((s, i) => (
            <div key={s.step} className="flex-1 flex items-start gap-3">
              <div className="flex items-center flex-col">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {s.step}
                </div>
              </div>
              <div className="flex-1 pr-4">
                <p className="text-sm font-semibold text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="self-center w-8 flex-shrink-0 text-center text-muted-foreground">→</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Device Table */}
      <div className="bms-card p-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                placeholder="搜索设备SN/IMEI..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="bms-input pl-8 w-52 text-sm"
              />
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
            <button className="p-2 rounded hover:bg-muted transition-colors">
              <RefreshCw size={14} className="text-muted-foreground" />
            </button>
          </div>
          <button
            onClick={() => setShowRegister(!showRegister)}
            className="bms-btn-primary flex items-center gap-2 text-xs"
          >
            <Plus size={13} />
            注册设备
          </button>
        </div>

        {/* Register Form */}
        {showRegister && (
          <div className="px-5 py-4 border-b border-border bg-accent/30">
            <h4 className="text-sm font-medium text-foreground mb-3">注册新设备</h4>
            <div className="flex gap-3 flex-wrap">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">设备SN</label>
                <input placeholder="输入设备序列号" className="bms-input text-sm w-44" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">设备型号</label>
                <select className="bms-input text-sm w-40">
                  <option>LFP-100Ah-48V</option>
                  <option>NMC-200Ah-96V</option>
                  <option>NCM-150Ah-72V</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">通信协议</label>
                <select className="bms-input text-sm w-32">
                  <option>MQTT</option>
                  <option>TCP</option>
                  <option>CoAP</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">所属项目</label>
                <select className="bms-input text-sm w-36">
                  <option>P001 - 深圳基站项目A</option>
                  <option>P002 - 广州光储项目</option>
                  <option>P003 - 上海园区示范</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button className="bms-btn-primary text-xs">确认注册</button>
                <button onClick={() => setShowRegister(false)} className="bms-btn-secondary text-xs">取消</button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bms-table-header text-left">
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">设备SN</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">型号</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">IMEI</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">协议</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">AccessKey</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">所属项目</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">状态</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">最后上线</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {pagedDevices.length > 0 ? pagedDevices.map((d, i) => (
                <tr key={d.id} className={`table-row-hover border-b border-border text-sm ${i % 2 === 0 ? "" : "bg-muted/30"}`}>
                  <td className="px-5 py-3 font-mono text-xs text-accent-foreground font-medium">{d.sn}</td>
                  <td className="px-5 py-3 text-foreground">{d.model}</td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{d.imei}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-secondary text-accent-foreground">{d.protocol}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{d.accessKey}</code>
                      <button
                        onClick={() => handleCopy(d.accessKey, d.id)}
                        className="p-1 rounded hover:bg-secondary transition-colors"
                      >
                        <Copy size={11} className={copied === d.id ? "text-primary" : "text-muted-foreground"} />
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-foreground">{d.project}</td>
                  <td className="px-5 py-3">
                    <StatusBadge
                      status={d.status === "online" ? "online" : d.status === "alarm" ? "alarm" : "offline"}
                      label={d.status === "online" ? "在线" : d.status === "alarm" ? "告警" : "离线"}
                    />
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{d.lastSeen}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-primary">
                        <Edit2 size={13} />
                      </button>
                      <button className="p-1.5 rounded hover:bg-red-50 transition-colors text-muted-foreground hover:text-destructive">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground text-sm">
                    未找到匹配的设备记录
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
  );
};

export default DeviceAccessPage;
