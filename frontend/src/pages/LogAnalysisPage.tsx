import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { toBeijingTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getRdpLogins, type RdpLoginItem } from "@/lib/api";

const PAGE_SIZE = 20;

export function LogAnalysisPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<RdpLoginItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<{ total: number; today: number; unique_ips: number; top_users: { username: string; count: number }[] }>({ total: 0, today: 0, unique_ips: 0, top_users: [] });

  useEffect(() => {
    let cancelled = false;
    // 加载统计
    fetch("/api/v1/rdp/log-stats?days=30").then(r => r.json()).then(d => {
      if (!cancelled) setStats(d);
    }).catch(() => {});
    // 加载列表
    getRdpLogins(200, 0).then((res) => {
      if (cancelled) return;
      setItems(res.items);
      setTotal(res.total);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      i => i.ip.toLowerCase().includes(q) || (i.username ?? "").toLowerCase().includes(q)
    );
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-headline-md flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">analytics</span>
            日志分析
          </h2>
          <p className="text-label-md text-on-surface-variant">RDP 登录流水 · 共 {total} 条</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-panel micro-border rounded p-3 text-center">
          <p className="text-headline-sm text-primary">{stats.total}</p>
          <p className="text-label-sm text-on-surface-variant">总记录</p>
        </div>
        <div className="glass-panel micro-border rounded p-3 text-center">
          <p className="text-headline-sm text-primary">{stats.today}</p>
          <p className="text-label-sm text-on-surface-variant">今日登录</p>
        </div>
        <div className="glass-panel micro-border rounded p-3 text-center">
          <p className="text-headline-sm text-primary">{stats.unique_ips}</p>
          <p className="text-label-sm text-on-surface-variant">来源 IP</p>
        </div>
        <div className="glass-panel micro-border rounded p-3 text-center">
          <p className="text-headline-sm text-primary">{stats.top_users?.[0]?.username ?? "--"}</p>
          <p className="text-label-sm text-on-surface-variant">最活跃用户</p>
        </div>
      </div>

      {/* 搜索 & Top用户 */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="搜索 IP 或用户名..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-2 flex-wrap ml-auto">
          {stats.top_users?.slice(0, 5).map(u => (
            <span key={u.username} className="text-xs px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">
              {u.username}: {u.count}
            </span>
          ))}
        </div>
      </div>

      {/* 表格 */}
      <div className="glass-panel micro-border rounded overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-on-surface-variant">加载中...</div>
        ) : paged.length === 0 ? (
          <div className="p-8 text-center text-sm text-on-surface-variant">{search ? "未匹配到记录" : "暂无登录记录"}</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP</TableHead>
                  <TableHead>用户名</TableHead>
                  <TableHead>登录时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono tabular-nums">
                      <button className="underline underline-offset-4 hover:text-primary transition-colors" onClick={() => navigate(`/host/${item.ip}`)}>
                        {item.ip}
                      </button>
                    </TableCell>
                    <TableCell>{item.username ?? "--"}</TableCell>
                    <TableCell className="text-on-surface-variant">{toBeijingTime(item.login_at)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setSearch(item.ip)}>筛选同IP</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
