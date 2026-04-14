import { useState } from "react";
import { FileText, Download, Eye, Search, File, Paperclip, FileCheck, Calendar, User, Tag } from "lucide-react";

interface DrawingsTabProps {
  projectId?: string;
}

type DocCategory = "all" | "drawing" | "manual" | "cert" | "report";

interface DocItem {
  id: string;
  name: string;
  category: DocCategory;
  version: string;
  updatedAt: string;
  updatedBy: string;
  size: string;
  format: string;
  desc: string;
}

const docs: DocItem[] = [
  {
    id: "D001",
    name: "LFP-100Ah-48V 电池组装配图",
    category: "drawing",
    version: "V2.1",
    updatedAt: "2024-01-10",
    updatedBy: "工艺部",
    size: "4.2 MB",
    format: "PDF/DWG",
    desc: "电池组整体装配尺寸图，包含接线端子位置与安装孔位。",
  },
  {
    id: "D002",
    name: "BMS 保护板原理图",
    category: "drawing",
    version: "V3.0",
    updatedAt: "2024-01-08",
    updatedBy: "硬件部",
    size: "2.8 MB",
    format: "PDF/SCH",
    desc: "BMS主控板完整电路原理图，含保护电路与通信接口。",
  },
  {
    id: "D003",
    name: "BMS 通信协议手册 (CAN/RS485)",
    category: "manual",
    version: "V1.5",
    updatedAt: "2024-01-12",
    updatedBy: "软件部",
    size: "1.1 MB",
    format: "PDF",
    desc: "CAN 2.0B 与 RS485 MODBUS RTU 完整通信协议说明文档。",
  },
  {
    id: "D004",
    name: "电池组安装与使用手册",
    category: "manual",
    version: "V2.0",
    updatedAt: "2023-12-20",
    updatedBy: "工艺部",
    size: "5.6 MB",
    format: "PDF",
    desc: "面向现场工程师的安装操作手册，含安全注意事项与调试流程。",
  },
  {
    id: "D005",
    name: "GB/T 36276-2018 检测报告",
    category: "cert",
    version: "2024版",
    updatedAt: "2024-01-05",
    updatedBy: "品质部",
    size: "3.3 MB",
    format: "PDF",
    desc: "国标 GB/T 36276 电力储能用锂离子蓄电池第三方检测报告。",
  },
  {
    id: "D006",
    name: "UN38.3 运输安全测试报告",
    category: "cert",
    version: "2023版",
    updatedAt: "2023-11-15",
    updatedBy: "品质部",
    size: "2.1 MB",
    format: "PDF",
    desc: "联合国 UN38.3 电池运输安全测试完整报告，覆盖振动/冲击/温度。",
  },
  {
    id: "D007",
    name: "出厂测试综合报告 – 深圳储能项目批次",
    category: "report",
    version: "R2024-001",
    updatedAt: "2024-01-15",
    updatedBy: "测试部",
    size: "8.5 MB",
    format: "PDF/XLSX",
    desc: "本批次120台电池出厂抽检及全检数据汇总报告。",
  },
  {
    id: "D008",
    name: "PCB Layout 文件（保护板）",
    category: "drawing",
    version: "V3.0",
    updatedAt: "2024-01-08",
    updatedBy: "硬件部",
    size: "6.7 MB",
    format: "Gerber",
    desc: "BMS 保护板 PCB 多层板布局文件，供生产制造使用。",
  },
];

const CATEGORY_LABELS: Record<DocCategory, string> = {
  all: "全部",
  drawing: "图纸",
  manual: "手册",
  cert: "认证报告",
  report: "测试报告",
};

const FORMAT_ICON_COLOR: Record<string, string> = {
  "PDF": "text-destructive",
  "PDF/DWG": "text-primary",
  "PDF/SCH": "text-warning",
  "PDF/XLSX": "text-success",
  "Gerber": "text-primary",
};

const DrawingsTab = ({ projectId = "P001" }: DrawingsTabProps) => {
  const [activeCategory, setActiveCategory] = useState<DocCategory>("all");
  const [searchText, setSearchText] = useState("");

  console.log("[DrawingsTab] projectId:", projectId, "category:", activeCategory);

  const filtered = docs.filter((d) => {
    const matchCat = activeCategory === "all" || d.category === activeCategory;
    const matchSearch = d.name.toLowerCase().includes(searchText.toLowerCase()) || d.desc.includes(searchText);
    return matchCat && matchSearch;
  });

  const categories: DocCategory[] = ["all", "drawing", "manual", "cert", "report"];

  return (
    <div data-cmp="DrawingsTab" className="p-6 space-y-5">
      {/* 工具栏 */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* 分类过滤 */}
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* 搜索框 */}
        <div className="flex-1 min-w-48 relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="搜索文档名称..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <button className="bms-btn-primary text-xs flex items-center gap-1.5 py-2">
          <Paperclip size={13} /> 上传文档
        </button>
      </div>

      {/* 文档列表 */}
      <div className="bg-card rounded-xl border border-border shadow-custom overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            <FileText size={32} className="mx-auto mb-3 opacity-30" />
            暂无匹配文档
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((doc) => (
              <div key={doc.id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                {/* 图标 */}
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                  <File size={18} className={FORMAT_ICON_COLOR[doc.format] || "text-primary"} />
                </div>

                {/* 信息主体 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-foreground">{doc.name}</span>
                    <span className="text-xs bg-secondary text-primary px-2 py-0.5 rounded font-medium">{doc.version}</span>
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">{CATEGORY_LABELS[doc.category]}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{doc.desc}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar size={11} /> {doc.updatedAt}</span>
                    <span className="flex items-center gap-1"><User size={11} /> {doc.updatedBy}</span>
                    <span className="flex items-center gap-1"><Tag size={11} /> {doc.format}</span>
                    <span className="flex items-center gap-1"><FileCheck size={11} /> {doc.size}</span>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="预览">
                    <Eye size={15} />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors" title="下载">
                    <Download size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DrawingsTab;
