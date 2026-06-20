import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { toBeijingTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { Input } from "@/components/ui/input";
import { getIdleSnapshots } from "@/lib/api";

type AlertItem = {
  ip: string;
  idle_days: number;
  owner: string | null;
  department: string | null;
  recycle_level: string;
  last_rdp_login_at: string | null;
};

const LEVELS = ["all", "high", "medium"] as const;
type LevelFilter = (typeof LEVELS)[number];
const LEVEL_LABELS: Record<LevelFilter, string> = { all: "全部", high: "严重 (≥60天)", medium: "警告 (≥30天)" };
const PAGE_SIZE = 15;

export function AlertsCenterPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LevelFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    getIdleSnapshots().then((res) => { if (!cancelled) setItems(res.items as AlertItem[]); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let list = filter === "all" ? items : items.filter((i) => i.recycle_level === filter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(i => i.ip.toLowerCase().includes(q) || (i.owner ?? "").toLowerCase().includes(q) || (i.department ?? "").toLowerCase().includes(q));
    return list;
  }, [items, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [filter, search]);

  const criticalCount = items.filter(i => i.recycle_level === "high").length;
  const warningCount = items.filter(i => i.recycle_level === "medium").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-headline-md flex items-center gap-2">
            <span className="material-symbols-outlined text-destructive">warning</span>
            告警中心
          </h2>
          <p className="text-label-md text-on-surface-variant">闲置告警 · 严重 {criticalCount} 台 · 警告 {warningCount} 台</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            const data = filtered.map(i => ({
              IP: i.ip,
              闲置天数: i.idle_days,
              等级: i.recycle_level === "high" ? "严重" : "警告",
              部门: i.department ?? "",
              负责人: i.owner ?? "",
              最后登录: toBeijingTime(i.last_rdp_login_at)
            }));
            const ws = XLSX.utils.json_to_sheet(data);
            ws["!cols"] = [{wch:16},{wch:10},{wch:8},{wch:14},{wch:12},{wch:20}];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "告警清单");
            XLSX.writeFile(wb, "alert-list.xlsx");
          }}>导出 Excel</Button>
          <Button variant="outline" size="sm" onClick={() => {
            const csv = "IP,闲置天数,等级,部门,负责人,最后登录\n" + filtered.map(i => `${i.ip},${i.idle_days},${i.recycle_level === "high" ? "严重" : "警告"},${i.department ?? ""},${i.owner ?? ""},${toBeijingTime(i.last_rdp_login_at)}`).join("\n");
            const blob = new Blob(["\uFEFF" + csv], {type: "text/csv;charset=utf-8"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = "alert-list.csv"; a.click();
            URL.revokeObjectURL(url);
          }}>导出 CSV</Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-panel micro-border rounded p-4 flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
          <div>
            <p className="text-headline-sm text-destructive">{criticalCount}</p>
            <p className="text-label-md text-on-surface-variant">严重闲置 (≥60天)</p>
          </div>
        </div>
        <div className="glass-panel micro-border rounded p-4 flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-tertiary" />
          <div>
            <p className="text-headline-sm text-tertiary">{warningCount}</p>
            <p className="text-label-md text-on-surface-variant">警告闲置 (30-59天)</p>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-wrap items-center gap-3">
        {LEVELS.map((level) => (
          <Button
            key={level}
            variant={filter === level ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(level)}
          >
            {LEVEL_LABELS[level]}
          </Button>
        ))}
        <Input
          placeholder="搜索 IP、负责人、部门..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs ml-auto"
        />
      </div>

      {/* 列表 */}
      <div className="glass-panel micro-border rounded overflow-hidden divide-y divide-outline-variant">
        {loading ? (
          <div className="p-8 text-center text-sm text-on-surface-variant">加载中...</div>
        ) : paged.length === 0 ? (
          <div className="p-8 text-center text-sm text-on-surface-variant">暂无告警</div>
        ) : (
          paged.map((item) => (
            <div key={item.ip} className="p-4 flex items-center gap-4 hover:bg-white/[0.04] transition-colors cursor-pointer" onClick={() => navigate(`/host/${item.ip}`)}>
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.recycle_level === "high" ? "bg-destructive animate-pulse" : "bg-tertiary"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-body-md font-medium truncate">
                  <span className="font-mono">{item.ip}</span>
                  <span className="ml-2 text-on-surface-variant">已闲置 {item.idle_days} 天</span>
                </p>
                <p className="text-label-md text-on-surface-variant truncate">
                  {item.department ?? "--"} · {item.owner ?? "--"} · 最后登录: {toBeijingTime(item.last_rdp_login_at)}
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                item.recycle_level === "high"
                  ? "bg-destructive/10 text-destructive border border-destructive/30"
                  : "bg-tertiary/10 text-tertiary-fixed-dim border border-tertiary/30"
              }`}>
                {item.recycle_level === "high" ? "Critical" : "Warning"}
              </span>
            </div>
          ))
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center text-sm text-on-surface-variant">
          <span>第 {page}/{totalPages} 页 · 共 {filtered.length} 条</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</Button>
          </div>
        </div>
      )}
    </div>
  );
}