import { Bell, Search } from "lucide-react";

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
}

const PageHeader = ({ title = "页面标题", subtitle = "" }: PageHeaderProps) => {
  return (
    <div
      data-cmp="PageHeader"
      className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-card border-b border-border"
    >
      <div className="min-w-0 flex-1 mr-3">
        <h1 className="text-base md:text-lg font-semibold text-foreground truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5 truncate hidden sm:block">
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        {/* Search - hidden on mobile */}
        <div className="relative hidden md:block">
          <input
            type="text"
            placeholder="搜索..."
            className="bms-input pl-8 w-48 text-sm"
          />
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
        </div>
        <button className="relative p-2 rounded-full hover:bg-muted transition-colors">
          <Bell size={18} className="text-muted-foreground" />
          <span
            className="absolute top-1 right-1 w-2 h-2 rounded-full"
            style={{ background: "var(--destructive)" }}
          ></span>
        </button>
      </div>
    </div>
  );
};

export default PageHeader;
