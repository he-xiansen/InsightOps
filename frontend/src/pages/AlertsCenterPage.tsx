import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getIdleExportUrl, getIdleSnapshots } from "@/lib/api";

type AlertItem = {
  ip: string;
  idle_days: number;
  owner: string | null;
  department: string | null;
  lab: string | null;
  recycle_level: string;
  last_rdp_login_at: string | null;
};

const LEVELS = ["all", "high", "medium"] as const;
type LevelFilter = (typeof LEVELS)[number];

const LEVEL_LABELS: Record<LevelFilter, string> = { all: "全部", high: "严重", medium: "警告" };

export function AlertsCenterPage() {
  const [items, setItems] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LevelFilter>("all");

  useEffect(() => {
    let cancelled = false;
    getIdleSnapshots().then((res) => { if (!cancelled) setItems(res.items as AlertItem[]); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.recycle_level === filter)),
    [items, filter],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
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
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={getIdleExportUrl()} download>CSV 导出</a>
        </Button>
      </div>

      <div className="glass-panel micro-border rounded overflow-hidden divide-y divide-outline-variant">
        {loading ? (
          <div className="p-8 text-center text-sm text-on-surface-variant">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-on-surface-variant">暂无告警</div>
        ) : (
          filtered.map((item) => (
            <div key={item.ip} className="p-4 flex items-center gap-4 hover:bg-white/[0.04] transition-colors">
              <div className={`w-2 h-2 rounded-full shrink-0 ${item.recycle_level === "high" ? "bg-error" : "bg-tertiary"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-body-md font-medium truncate">
                  {item.ip} 已闲置 {item.idle_days} 天
                  {item.recycle_level === "high" ? "（高优先级回收）" : "（低优先级回收）"}
                </p>
                <p className="text-label-md text-on-surface-variant truncate">
                  {item.department ?? "--"} · {item.owner ?? "--"} · 最后登录: {item.last_rdp_login_at ?? "从未登录"}
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                item.recycle_level === "high"
                  ? "bg-error/10 text-error-container border border-error/20"
                  : "bg-tertiary-container/10 text-tertiary-fixed-dim border border-tertiary/20"
              }`}>
                {item.recycle_level === "high" ? "Critical" : "Warning"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
