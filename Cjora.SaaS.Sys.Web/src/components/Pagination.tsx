import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const Pagination = ({
  total = 0,
  page = 1,
  pageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange = () => {},
  onPageSizeChange = () => {},
}: PaginationProps) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 4) pages.push("...");
      const start = Math.max(2, page - 2);
      const end = Math.min(totalPages - 1, page + 2);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 3) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div data-cmp="Pagination" className="flex items-center justify-between px-5 py-3 border-t border-border flex-wrap gap-3">
      {/* Left: total info + page size */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          共 <span className="font-medium text-foreground">{total}</span> 条，显示第 {start}–{end} 条
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">每页</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="bms-input text-xs py-1 px-2 h-7"
          >
            {pageSizeOptions.map((s) => (
              <option key={s} value={s}>{s} 条</option>
            ))}
          </select>
        </div>
      </div>

      {/* Right: page buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className="p-1.5 rounded border border-border hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="首页"
        >
          <ChevronsLeft size={13} className="text-muted-foreground" />
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded border border-border hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="上一页"
        >
          <ChevronLeft size={13} className="text-muted-foreground" />
        </button>

        {getPageNumbers().map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-muted-foreground">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                page === p
                  ? "bg-primary text-primary-foreground"
                  : "border border-border hover:bg-muted text-foreground"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="p-1.5 rounded border border-border hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="下一页"
        >
          <ChevronRight size={13} className="text-muted-foreground" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          className="p-1.5 rounded border border-border hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="末页"
        >
          <ChevronsRight size={13} className="text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
