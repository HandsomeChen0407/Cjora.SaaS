interface StatusBadgeProps {
  status?: string;
  label?: string;
}

const StatusBadge = ({ status = "default", label = "" }: StatusBadgeProps) => {
  const classMap: Record<string, string> = {
    // 设备在线状态
    online:    "status-online",
    offline:   "status-offline",
    alarm:     "status-alarm",
    warning:   "status-warning",
    // 电池资产状态
    instock:   "status-instock",
    assigned:  "status-assigned",
    inuse:     "status-inuse",
    returned:  "status-returned",
    repairing: "status-repairing",
    scrapped:  "status-scrapped",
    // 通用状态
    default:   "status-offline",
    success:   "status-inuse",
    error:     "status-alarm",
    pending:   "status-warning",
    confirmed: "status-instock",
    closed:    "status-offline",
  };

  const cls = classMap[status] || classMap["default"];

  return (
    <span
      data-cmp="StatusBadge"
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 inline-block" style={{ background: "currentColor" }}></span>
      {label}
    </span>
  );
};

export default StatusBadge;
