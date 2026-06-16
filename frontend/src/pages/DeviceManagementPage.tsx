import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getVmAssetsWithPerf, type VmAssetPerfItem } from "@/lib/api";
import { toBeijingTime } from "@/lib/utils";

const PAGE_SIZE = 15;

export function DeviceManagementPage() {
  const [items, setItems] = useState<VmAssetPerfItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    getVmAssetsWithPerf().then((res) => { if (!cancelled) setItems(res.items as VmAssetPerfItem[]); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (item) =>
          item.ip.toLowerCase().includes(q) ||
          (item.hostname ?? "").toLowerCase().includes(q) ||
          (item.owner ?? "").toLowerCase().includes(q)
      );
    }
    if (statusFilter === "active") list = list.filter(i => i.status === "active");
    else if (statusFilter === "inactive") list = list.filter(i => i.status !== "active");
    else if (statusFilter === "idle") list = list.filter(i => i.idle_days >= 30);
    return list;
  }, [items, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const onlineCount = items.filter(i => i.status === "active").length;

  return (
    <div className="glass-panel micro-border rounded overflow-hidden">
      <div className="p-4 border-b border-outline-variant flex flex-wrap items-center gap-3">
        <Input
          placeholder="搜索 IP、主机名或负责人..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-32 h-9 px-2 rounded border border-white/10 bg-transparent text-sm text-on-surface-variant focus:outline-none focus:border-primary/50"
        >
          <option value="all" className="bg-[#131315]">全部</option>
          <option value="active" className="bg-[#131315]">在线</option>
          <option value="inactive" className="bg-[#131315]">离线</option>
          <option value="idle" className="bg-[#131315]">闲置30天以上</option>
        </select>
        <div className="flex items-center gap-4 text-label-md text-on-surface-variant ml-auto">
          <span className="tabular-nums">共 {filtered.length} 台</span>
          <span className="tabular-nums text-primary">{onlineCount} 在线</span>
        </div>
      </div>
      {loading ? (
        <div className="p-8 text-center text-sm text-on-surface-variant">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-sm text-on-surface-variant">{search || statusFilter !== "all" ? "未匹配到设备" : "暂无设备数据"}</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-primary/[0.06] border-b border-primary/10">
                <tr>
                  <th className="px-4 py-3 text-label-md text-on-surface-variant font-semibold tracking-wider uppercase text-[10px]">主机名</th>
                  <th className="px-4 py-3 text-label-md text-on-surface-variant font-semibold tracking-wider uppercase text-[10px]">IP</th>
                  <th className="px-4 py-3 text-label-md text-on-surface-variant font-semibold tracking-wider uppercase text-[10px]">负责人</th>
                  <th className="px-4 py-3 text-label-md text-on-surface-variant font-semibold tracking-wider uppercase text-[10px]">电话</th>
                  <th className="px-4 py-3 text-label-md text-on-surface-variant font-semibold tracking-wider uppercase text-[10px]">闲置天数</th>
                  <th className="px-4 py-3 text-label-md text-on-surface-variant font-semibold tracking-wider uppercase text-[10px]">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] min-h-[555px]">
                {paged.map((item) => (
                  <tr key={item.ip} className="hover:bg-primary/[0.03] transition-all duration-200 border-l-2 border-l-transparent hover:border-l-primary/30">
                    <td className="px-4 py-3">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${item.status === "active" ? "bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]" : "bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.4)]"}`} />
                    </td>
                    <td className="px-4 py-3 font-medium">{item.hostname ?? "--"}</td>
                    <td className="px-4 py-3 font-mono tabular-nums">{item.ip}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{item.owner ?? "--"}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{item.phone ?? "--"}</td>
                    <td className="px-4 py-3">
                      {item.idle_days >= 0 ? (
                        <span className={`tabular-nums ${item.idle_days >= 60 ? "text-error" : item.idle_days >= 30 ? "text-tertiary" : ""}`}>
                          {item.idle_days} 天
                        </span>
                      ) : (
                        <span className="text-on-surface-variant">--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-white/[0.06] bg-white/[0.02] flex justify-between items-center text-sm text-on-surface-variant">
            <span>第 {page}/{totalPages} 页</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
