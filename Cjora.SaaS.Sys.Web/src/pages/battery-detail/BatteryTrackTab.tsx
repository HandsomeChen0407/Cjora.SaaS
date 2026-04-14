import { useState } from "react";
import { MapPin, Calendar, Clock, Navigation, Search } from "lucide-react";

interface BatteryTrackTabProps {
  sn?: string;
}

interface TrackPoint {
  time: string;
  lat: number;
  lng: number;
  speed: string;
  status: string;
}

const MOCK_TRACK_POINTS: TrackPoint[] = [
  { time: "2024-07-15 08:00:15", lat: 22.543099, lng: 114.057868, speed: "0 km/h", status: "静止" },
  { time: "2024-07-15 08:30:22", lat: 22.543120, lng: 114.057900, speed: "2 km/h", status: "移动" },
  { time: "2024-07-15 09:15:44", lat: 22.543250, lng: 114.058100, speed: "5 km/h", status: "移动" },
  { time: "2024-07-15 10:00:08", lat: 22.543300, lng: 114.058200, speed: "0 km/h", status: "静止" },
  { time: "2024-07-15 11:30:55", lat: 22.543300, lng: 114.058200, speed: "0 km/h", status: "静止" },
  { time: "2024-07-15 13:45:30", lat: 22.543180, lng: 114.058050, speed: "3 km/h", status: "移动" },
  { time: "2024-07-15 14:20:10", lat: 22.543099, lng: 114.057868, speed: "0 km/h", status: "静止" },
];

const BatteryTrackTab = ({ sn = "BMS-000001" }: BatteryTrackTabProps) => {
  const [startDate, setStartDate] = useState("2024-07-15");
  const [endDate, setEndDate] = useState("2024-07-15");
  const [queried, setQueried] = useState(true);

  console.log("[BatteryTrackTab] sn:", sn);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 筛选栏 */}
      <div className="bg-card border-b border-border px-6 py-3 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">开始时间：</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bms-input text-sm h-8 px-2"
            />
          </div>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">结束时间：</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bms-input text-sm h-8 px-2"
            />
          </div>
          <button
            onClick={() => setQueried(true)}
            className="bms-btn-primary flex items-center gap-1.5 h-8 px-4 text-sm"
          >
            <Search size={13} /> 查询轨迹
          </button>
          <span className="text-xs text-muted-foreground ml-auto">
            共 {MOCK_TRACK_POINTS.length} 个轨迹点
          </span>
        </div>
      </div>

      {/* 地图 + 轨迹列表 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 地图区域（模拟） */}
        <div className="flex-1 relative bg-muted/30 overflow-hidden">
          {/* 模拟地图背景 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-full relative">
              {/* 伪地图网格 */}
              <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)", backgroundSize: "40px 40px" }}></div>

              {/* 模拟道路线 */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet">
                {/* 主干道 */}
                <path d="M50,300 Q200,280 400,300 Q600,320 750,310" stroke="var(--border)" strokeWidth="8" fill="none" strokeLinecap="round" />
                <path d="M50,300 Q200,280 400,300 Q600,320 750,310" stroke="var(--card)" strokeWidth="6" fill="none" strokeLinecap="round" />
                {/* 支路 */}
                <path d="M400,100 L400,500" stroke="var(--border)" strokeWidth="6" fill="none" />
                <path d="M400,100 L400,500" stroke="var(--card)" strokeWidth="4" fill="none" />
                <path d="M200,150 Q220,300 200,450" stroke="var(--border)" strokeWidth="4" fill="none" />
                <path d="M200,150 Q220,300 200,450" stroke="var(--card)" strokeWidth="3" fill="none" />

                {/* 轨迹路线 */}
                {queried && (
                  <path
                    d="M380,310 Q390,308 395,305 Q400,303 410,295 Q430,280 420,270"
                    stroke="var(--primary)"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray="8,4"
                    strokeLinecap="round"
                  />
                )}

                {/* 轨迹点 */}
                {queried && MOCK_TRACK_POINTS.map((p, i) => {
                  const cx = 380 + (i * 5);
                  const cy = 310 - (i * 5);
                  return (
                    <g key={i}>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={i === 0 || i === MOCK_TRACK_POINTS.length - 1 ? 7 : 5}
                        fill={i === 0 ? "#22c55e" : i === MOCK_TRACK_POINTS.length - 1 ? "var(--primary)" : "var(--card)"}
                        stroke="var(--primary)"
                        strokeWidth="2"
                      />
                      {(i === 0 || i === MOCK_TRACK_POINTS.length - 1) && (
                        <text x={cx + 10} y={cy + 4} fontSize="10" fill="var(--foreground)" fontFamily="monospace">
                          {i === 0 ? "起点" : "终点"}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* 地图标注 */}
              <div className="absolute top-4 left-4 bg-card/90 rounded-lg border border-border px-3 py-2 text-xs backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-success"></div>
                  <span className="text-muted-foreground">起点</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <span className="text-muted-foreground">终点/当前位置</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 border-t-2 border-dashed border-primary"></div>
                  <span className="text-muted-foreground">运行轨迹</span>
                </div>
              </div>

              {/* 坐标显示 */}
              <div className="absolute bottom-4 left-4 bg-card/90 rounded-lg border border-border px-3 py-2 text-xs backdrop-blur-sm">
                <p className="text-muted-foreground">当前位置</p>
                <p className="font-mono text-foreground">114.057868°E, 22.543099°N</p>
                <p className="text-muted-foreground mt-0.5">{MOCK_TRACK_POINTS[MOCK_TRACK_POINTS.length - 1].time}</p>
              </div>

              {/* 地图提示 */}
              <div className="absolute bottom-4 right-4 bg-card/90 rounded-lg border border-border px-3 py-2 text-xs backdrop-blur-sm text-muted-foreground">
                地图组件（集成高德/百度地图 SDK）
              </div>
            </div>
          </div>
        </div>

        {/* 轨迹点列表 */}
        <div className="w-80 bg-card border-l border-border flex flex-col flex-shrink-0">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Navigation size={14} className="text-primary" />
            <h3 className="text-sm font-bold text-foreground">轨迹点列表</h3>
            <span className="ml-auto text-xs text-muted-foreground">{MOCK_TRACK_POINTS.length} 条</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {MOCK_TRACK_POINTS.map((point, i) => (
              <div
                key={i}
                className="px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1 flex-shrink-0 mt-0.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0
                        ? "bg-success text-primary-foreground"
                        : i === MOCK_TRACK_POINTS.length - 1
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted border border-border text-muted-foreground"
                    }`}>
                      {i + 1}
                    </div>
                    {i < MOCK_TRACK_POINTS.length - 1 && (
                      <div className="w-px h-4 bg-border"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-foreground font-medium">{point.time}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        point.status === "移动"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {point.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin size={9} className="text-muted-foreground flex-shrink-0" />
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {point.lng.toFixed(6)}, {point.lat.toFixed(6)}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">速度: {point.speed}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatteryTrackTab;
