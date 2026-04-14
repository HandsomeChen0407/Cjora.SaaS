import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Globe,
  Radio,
  Network,
  CheckCircle2,
  Circle,
  ChevronDown,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
  Zap,
  Bell,
  Wifi,
  ToggleRight,
} from "lucide-react";

interface DataForwardCreatePageProps {
  onBack?: () => void;
  onSubmit?: () => void;
}

type PushType = "HTTP" | "MQTT" | "TCP";
type DataType = "realtime" | "alarm" | "online";

interface Header { key: string; value: string }

const projects = [
  { id: "P001", name: `深圳基站项目A` },
  { id: "P002", name: `广州光储项目` },
  { id: "P003", name: `上海园区示范` },
  { id: "P004", name: `北京储能电站` },
  { id: "P005", name: `成都工业园` },
];

const allDevices: Record<string, { sn: string; model: string }[]> = {
  P001: [
    { sn: `BMS-000001`, model: `LFP-100Ah-48V` },
    { sn: `BMS-000002`, model: `LFP-100Ah-48V` },
  ],
  P002: [
    { sn: `BMS-000006`, model: `LFP-100Ah-48V` },
  ],
  P003: [
    { sn: `BMS-000003`, model: `NMC-200Ah-96V` },
    { sn: `BMS-000004`, model: `NMC-200Ah-96V` },
  ],
  P004: [],
  P005: [
    { sn: `BMS-000005`, model: `NCM-150Ah-72V` },
  ],
};

const rateLimitOptions = [
  `1次/秒`, `2次/秒`, `5次/秒`, `10次/秒`, `1次/分钟`, `5次/分钟`,
];

const STEPS = [
  { key: `source`,   label: `数据来源` },
  { key: `method`,   label: `推送方式` },
  { key: `target`,   label: `目标配置` },
  { key: `data`,     label: `数据选择` },
  { key: `control`,  label: `控制策略` },
  { key: `confirm`,  label: `确认提交` },
];

const DataForwardCreatePage = ({
  onBack = () => {},
  onSubmit = () => {},
}: DataForwardCreatePageProps) => {
  const [step, setStep] = useState(0);

  // Step 0: Source
  const [ruleName, setRuleName] = useState(``);
  const [sourceLevel, setSourceLevel] = useState<`project` | `device`>(`project`);
  const [selectedProject, setSelectedProject] = useState(`P001`);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);

  // Step 1: Method
  const [pushType, setPushType] = useState<PushType>(`HTTP`);

  // Step 2: Target
  const [httpUrl, setHttpUrl] = useState(``);
  const [httpHeaders, setHttpHeaders] = useState<Header[]>([{ key: `Authorization`, value: `` }]);
  const [mqttBroker, setMqttBroker] = useState(``);
  const [mqttTopic, setMqttTopic] = useState(``);
  const [tcpHost, setTcpHost] = useState(``);
  const [tcpPort, setTcpPort] = useState(`9000`);

  // Step 3: Data types
  const [dataTypes, setDataTypes] = useState<DataType[]>([`realtime`]);

  // Step 4: Control
  const [rateLimit, setRateLimit] = useState(`1次/秒`);
  const [enabled, setEnabled] = useState(true);

  const projectDevices = allDevices[selectedProject] || [];

  const toggleDevice = (sn: string) => {
    setSelectedDevices((prev) =>
      prev.includes(sn) ? prev.filter((s) => s !== sn) : [...prev, sn]
    );
  };

  const toggleDataType = (dt: DataType) => {
    setDataTypes((prev) =>
      prev.includes(dt) ? prev.filter((d) => d !== dt) : [...prev, dt]
    );
  };

  const addHeader = () => setHttpHeaders((prev) => [...prev, { key: ``, value: `` }]);
  const removeHeader = (idx: number) =>
    setHttpHeaders((prev) => prev.filter((_, i) => i !== idx));
  const updateHeader = (idx: number, field: `key` | `value`, val: string) =>
    setHttpHeaders((prev) =>
      prev.map((h, i) => (i === idx ? { ...h, [field]: val } : h))
    );

  const canNext = () => {
    if (step === 0) return ruleName.trim().length > 0;
    if (step === 2) {
      if (pushType === `HTTP`) return httpUrl.trim().length > 0;
      if (pushType === `MQTT`) return mqttBroker.trim().length > 0 && mqttTopic.trim().length > 0;
      if (pushType === `TCP`) return tcpHost.trim().length > 0;
    }
    if (step === 3) return dataTypes.length > 0;
    return true;
  };

  const handleFinalSubmit = () => {
    console.log(`[DataForward] 提交转发规则:`, {
      ruleName, sourceLevel, selectedProject, selectedDevices,
      pushType, httpUrl, httpHeaders, mqttBroker, mqttTopic,
      tcpHost, tcpPort, dataTypes, rateLimit, enabled,
    });
    onSubmit();
  };

  // ---- Step Renderers ----

  const renderStep0 = () => (
    <div className="space-y-5">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">规则名称 <span className="text-destructive">*</span></label>
        <input
          className="bms-input text-sm w-full max-w-md"
          placeholder="例如：深圳项目 → 客户云平台"
          value={ruleName}
          onChange={(e) => setRuleName(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">建议命名规则：数据来源 → 目标系统，方便识别</p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground">数据来源维度</label>
        <div className="flex gap-3">
          {([`project`, `device`] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSourceLevel(lvl)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border text-sm transition-all flex-1 max-w-52 ${
                sourceLevel === lvl
                  ? `border-primary bg-secondary text-accent-foreground`
                  : `border-border bg-card text-foreground hover:border-ring`
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${sourceLevel === lvl ? `border-primary` : `border-muted-foreground`}`}>
                {sourceLevel === lvl && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              {lvl === `project` ? `按项目推送（全部设备）` : `按设备推送（指定设备）`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">选择项目</label>
        <div className="relative w-full max-w-sm">
          <select
            className="bms-input text-sm w-full appearance-none pr-8 cursor-pointer"
            value={selectedProject}
            onChange={(e) => { setSelectedProject(e.target.value); setSelectedDevices([]); }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.id} · {p.name}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {sourceLevel === `device` && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">
            选择设备
            <span className="text-xs text-muted-foreground ml-2 font-normal">
              已选 {selectedDevices.length}/{projectDevices.length}
            </span>
          </label>
          {projectDevices.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {projectDevices.map((d) => {
                const active = selectedDevices.includes(d.sn);
                return (
                  <button
                    key={d.sn}
                    onClick={() => toggleDevice(d.sn)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all ${
                      active
                        ? `border-primary bg-secondary text-accent-foreground`
                        : `border-border bg-card text-foreground hover:border-ring`
                    }`}
                  >
                    {active ? <CheckCircle2 size={12} className="text-primary" /> : <Circle size={12} className="text-muted-foreground" />}
                    <div className="text-left">
                      <div className="font-mono font-medium">{d.sn}</div>
                      <div className="text-muted-foreground">{d.model}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
              该项目下暂无已注册设备
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">根据您的系统能力选择推送协议。HTTP 最简单易集成，推荐首选。</p>
      <div className="flex gap-4 flex-wrap">
        {([
          {
            type: `HTTP` as PushType,
            icon: <Globe size={20} />,
            title: `HTTP 推送`,
            desc: `通过标准 HTTP/HTTPS 接口向您的服务器发送数据，无需额外中间件，最易集成。`,
            badge: `推荐`,
            badgeCls: `bg-success/10 text-success`,
          },
          {
            type: `MQTT` as PushType,
            icon: <Radio size={20} />,
            title: `MQTT 推送`,
            desc: `将数据发布至您指定的 MQTT Broker，适合已有 IoT 消息队列基础设施的场景。需平台审核。`,
            badge: `需审核`,
            badgeCls: `bg-warning/10 text-warning-foreground`,
          },
          {
            type: `TCP` as PushType,
            icon: <Network size={20} />,
            title: `TCP 直推`,
            desc: `通过 TCP Socket 将数据发送到您的采集服务，适合有专用数据采集端口的工业场景。`,
            badge: `可选`,
            badgeCls: `bg-muted text-muted-foreground`,
          },
        ]).map(({ type, icon, title, desc, badge, badgeCls }) => (
          <button
            key={type}
            onClick={() => setPushType(type)}
            className={`flex-1 min-w-56 text-left p-5 rounded-xl border-2 transition-all ${
              pushType === type
                ? `border-primary bg-secondary/50`
                : `border-border bg-card hover:border-ring`
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${pushType === type ? `bg-secondary text-accent-foreground` : `bg-muted text-muted-foreground`}`}>
                {icon}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${badgeCls}`}>{badge}</span>
            </div>
            <div className="font-semibold text-sm text-foreground mb-1">{title}</div>
            <div className="text-xs text-muted-foreground leading-relaxed">{desc}</div>
            {pushType === type && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-primary font-medium">
                <CheckCircle2 size={12} />
                已选择
              </div>
            )}
          </button>
        ))}
      </div>

      {pushType === `MQTT` && (
        <div className="flex items-start gap-2 px-4 py-3 bg-warning/5 border border-warning/20 rounded-lg">
          <AlertTriangle size={14} className="text-warning-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-warning-foreground leading-relaxed">
            MQTT 推送需填写您的 Broker 地址，平台将验证可达性并人工审核，审核通过后规则方可生效（通常 1 个工作日内）。
          </p>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5">
      {pushType === `HTTP` && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">目标 URL <span className="text-destructive">*</span></label>
            <input
              className="bms-input text-sm w-full max-w-xl font-mono"
              placeholder="https://api.yourserver.com/bms/webhook"
              value={httpUrl}
              onChange={(e) => setHttpUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">支持 HTTP 和 HTTPS，平台将向此地址发送 POST 请求，Content-Type: application/json</p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">请求 Headers（可选）</label>
              <button
                onClick={addHeader}
                className="flex items-center gap-1 text-xs text-primary hover:opacity-80 transition-opacity"
              >
                <Plus size={12} />
                添加 Header
              </button>
            </div>
            <div className="space-y-2">
              {httpHeaders.map((h, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    className="bms-input text-xs font-mono w-44 flex-shrink-0"
                    placeholder="Header 名称"
                    value={h.key}
                    onChange={(e) => updateHeader(idx, `key`, e.target.value)}
                  />
                  <span className="text-muted-foreground text-sm flex-shrink-0">:</span>
                  <input
                    className="bms-input text-xs font-mono flex-1"
                    placeholder="Header 值"
                    value={h.value}
                    onChange={(e) => updateHeader(idx, `value`, e.target.value)}
                  />
                  <button
                    onClick={() => removeHeader(idx)}
                    className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive flex-shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-2 px-3 py-2.5 bg-accent/50 rounded-lg">
              <Info size={12} className="text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                常用 Header：Authorization（Token 鉴权）、X-API-Key（接口密钥）。Header 值将加密存储，不会明文展示。
              </p>
            </div>
          </div>
        </>
      )}

      {pushType === `MQTT` && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Broker 地址 <span className="text-destructive">*</span></label>
            <input
              className="bms-input text-sm w-full max-w-xl font-mono"
              placeholder="mqtt://your-broker.com:1883"
              value={mqttBroker}
              onChange={(e) => setMqttBroker(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">格式：mqtt://host:port 或 mqtts://host:8883（TLS）</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">发布 Topic <span className="text-destructive">*</span></label>
            <input
              className="bms-input text-sm w-full max-w-md font-mono"
              placeholder="bms/data/{device_sn}"
              value={mqttTopic}
              onChange={(e) => setMqttTopic(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              支持变量占位符：<code className="bg-muted px-1 rounded text-xs">device_sn</code>、<code className="bg-muted px-1 rounded text-xs">project_id</code>
            </p>
          </div>
          <div className="flex items-start gap-2 px-4 py-3 bg-warning/5 border border-warning/20 rounded-lg">
            <AlertTriangle size={14} className="text-warning-foreground flex-shrink-0 mt-0.5" />
            <div className="text-xs text-warning-foreground leading-relaxed space-y-1">
              <p className="font-medium">MQTT 目标地址需平台审核</p>
              <p>平台将核验 Broker 地址的合法性与可达性，审核通过后规则方可生效，通常在 1 个工作日内完成。</p>
            </div>
          </div>
        </>
      )}

      {pushType === `TCP` && (
        <>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex flex-col gap-1.5 flex-1 min-w-56">
              <label className="text-sm font-medium text-foreground">主机地址 <span className="text-destructive">*</span></label>
              <input
                className="bms-input text-sm w-full font-mono"
                placeholder="192.168.10.50"
                value={tcpHost}
                onChange={(e) => setTcpHost(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5 w-32">
              <label className="text-sm font-medium text-foreground">端口</label>
              <input
                className="bms-input text-sm w-full font-mono"
                placeholder="9000"
                value={tcpPort}
                onChange={(e) => setTcpPort(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-start gap-2 px-3 py-2.5 bg-accent/50 rounded-lg">
            <Info size={12} className="text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              TCP 推送采用 JSON 换行符分隔的流式传输（NDJSON）。您的服务器需监听指定端口并接受来自平台 IP 段的连接。平台 IP 白名单可在账号设置中查看。
            </p>
          </div>
        </>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">选择需要转发的数据类型，至少选择一项。</p>
      <div className="flex gap-4 flex-wrap">
        {([
          {
            dt: `realtime` as DataType,
            icon: <Zap size={18} />,
            title: `实时数据`,
            desc: `设备按周期上报的遥测数据：电压、电流、温度、SOC 等核心指标，数据量较大。`,
          },
          {
            dt: `alarm` as DataType,
            icon: <Bell size={18} />,
            title: `告警事件`,
            desc: `设备触发的各类告警：过压、欠压、过温、过流、通讯中断等，支持按告警级别过滤。`,
          },
          {
            dt: `online` as DataType,
            icon: <Wifi size={18} />,
            title: `上下线事件`,
            desc: `设备连接状态变化通知：上线（连接成功）和下线（断开连接）的实时事件推送。`,
          },
        ]).map(({ dt, icon, title, desc }) => {
          const active = dataTypes.includes(dt);
          return (
            <button
              key={dt}
              onClick={() => toggleDataType(dt)}
              className={`flex-1 min-w-52 text-left p-4 rounded-xl border-2 transition-all ${
                active ? `border-primary bg-secondary/50` : `border-border bg-card hover:border-ring`
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${active ? `bg-secondary text-accent-foreground` : `bg-muted text-muted-foreground`}`}>
                  {icon}
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${active ? `border-primary bg-primary` : `border-muted-foreground`}`}>
                  {active && <CheckCircle2 size={12} className="text-primary-foreground" />}
                </div>
              </div>
              <div className="font-semibold text-sm text-foreground mb-1">{title}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{desc}</div>
            </button>
          );
        })}
      </div>
      {dataTypes.length === 0 && (
        <div className="flex items-center gap-2 text-destructive text-xs">
          <AlertTriangle size={12} />
          请至少选择一种数据类型
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground">推送频率限制</label>
        <p className="text-xs text-muted-foreground">限制平台向您服务器的最大推送速率，防止目标服务器被大量数据压垮。</p>
        <div className="flex flex-wrap gap-2">
          {rateLimitOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => setRateLimit(opt)}
              className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                rateLimit === opt
                  ? `border-primary bg-secondary text-accent-foreground font-medium`
                  : `border-border bg-card text-foreground hover:border-ring`
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        <div className="flex items-start gap-2 px-3 py-2.5 bg-accent/50 rounded-lg mt-1">
          <Info size={12} className="text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            超出限速的数据将进入缓冲队列，按照时序延迟推送，不会丢失。如需更高速率，请联系商务升级套餐。
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground">规则启用状态</label>
        <p className="text-xs text-muted-foreground">创建后即刻生效 or 稍后手动开启</p>
        <div className="flex gap-3">
          {([
            { val: true,  label: `立即启用`,   desc: `规则创建后立刻开始推送数据` },
            { val: false, label: `暂不启用`,   desc: `规则保存为草稿，手动开启后生效` },
          ] as const).map(({ val, label, desc }) => (
            <button
              key={String(val)}
              onClick={() => setEnabled(val)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm transition-all flex-1 max-w-64 ${
                enabled === val
                  ? `border-primary bg-secondary text-accent-foreground`
                  : `border-border bg-card text-foreground hover:border-ring`
              }`}
            >
              <ToggleRight size={18} className={enabled === val ? `text-primary` : `text-muted-foreground`} />
              <div className="text-left">
                <div className="font-medium text-sm">{label}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const dtLabels: Record<DataType, string> = { realtime: `实时数据`, alarm: `告警事件`, online: `上下线事件` };

  const renderStep5 = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">请确认以下配置信息，提交后规则{enabled ? `将立即生效` : `保存为草稿`}。</p>
      <div className="border border-border rounded-xl overflow-hidden">
        {([
          {
            label: `规则名称`,
            value: ruleName,
          },
          {
            label: `数据来源`,
            value: sourceLevel === `project`
              ? `按项目：${projects.find((p) => p.id === selectedProject)?.name ?? selectedProject}`
              : `按设备：${selectedDevices.length > 0 ? selectedDevices.join(`、`) : `未选择设备`}`,
          },
          {
            label: `推送方式`,
            value: pushType,
          },
          {
            label: `目标地址`,
            value: pushType === `HTTP` ? httpUrl : pushType === `MQTT` ? `${mqttBroker} → ${mqttTopic}` : `${tcpHost}:${tcpPort}`,
          },
          {
            label: `数据类型`,
            value: dataTypes.map((d) => dtLabels[d]).join(`、`),
          },
          {
            label: `推送频率`,
            value: rateLimit,
          },
          {
            label: `初始状态`,
            value: enabled ? `立即启用` : `暂不启用`,
          },
        ]).map(({ label, value }, idx, arr) => (
          <div
            key={label}
            className={`flex items-start px-5 py-3 ${idx < arr.length - 1 ? `border-b border-border` : ``} ${idx % 2 === 0 ? `` : `bg-muted/30`}`}
          >
            <span className="text-sm text-muted-foreground w-24 flex-shrink-0">{label}</span>
            <span className="text-sm text-foreground font-medium flex-1 font-mono break-all">{value || `—`}</span>
          </div>
        ))}
      </div>

      {pushType === `MQTT` && (
        <div className="flex items-start gap-2 px-4 py-3 bg-warning/5 border border-warning/20 rounded-lg">
          <AlertTriangle size={14} className="text-warning-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-warning-foreground">
            您选择了 MQTT 推送，规则提交后将进入审核流程，审核通过后方可生效（预计 1 个工作日）。
          </p>
        </div>
      )}
    </div>
  );

  const stepContent = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4, renderStep5];

  return (
    <div data-cmp="DataForwardCreatePage" className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={15} />
          返回转发列表
        </button>

        {/* Progress Steps */}
        <div className="bms-card py-4 px-5">
          <div className="flex items-center">
            {STEPS.map((s, idx) => {
              const done = idx < step;
              const active = idx === step;
              return (
                <div key={s.key} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        done
                          ? `bg-success text-primary-foreground`
                          : active
                          ? `bg-primary text-primary-foreground`
                          : `bg-muted text-muted-foreground`
                      }`}
                    >
                      {done ? <CheckCircle2 size={16} /> : idx + 1}
                    </div>
                    <span
                      className={`text-xs mt-1 font-medium whitespace-nowrap ${
                        active ? `text-primary` : done ? `text-success` : `text-muted-foreground`
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-all ${done ? `bg-success` : `bg-border`}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bms-card">
          <h3 className="text-base font-semibold text-foreground mb-1">
            {STEPS[step].label}
          </h3>
          <p className="text-xs text-muted-foreground mb-5">
            {step === 0 && `配置转发规则的名称以及数据来源维度（项目或设备）`}
            {step === 1 && `选择数据推送到外部系统所使用的传输协议`}
            {step === 2 && `配置目标系统的连接信息，平台将向此地址推送数据`}
            {step === 3 && `选择需要向外部系统推送的设备数据类型`}
            {step === 4 && `设置推送频率限制与规则的初始启用状态`}
            {step === 5 && `请仔细核对以下配置，确认无误后提交`}
          </p>
          {stepContent[step]()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={step === 0 ? onBack : () => setStep((s) => s - 1)}
            className="bms-btn-secondary flex items-center gap-2 text-sm"
          >
            <ArrowLeft size={14} />
            {step === 0 ? `取消` : `上一步`}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              步骤 {step + 1} / {STEPS.length}
            </span>
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext()}
                className={`bms-btn-primary flex items-center gap-2 text-sm ${!canNext() ? `opacity-50 cursor-not-allowed` : ``}`}
              >
                下一步
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleFinalSubmit}
                className="bms-btn-primary flex items-center gap-2 text-sm"
              >
                <CheckCircle2 size={14} />
                提交规则
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataForwardCreatePage;
