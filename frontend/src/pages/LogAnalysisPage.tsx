import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getRdpLogins, type RdpLoginItem } from "@/lib/api";

export function LogAnalysisPage() {
  const [items, setItems] = useState<RdpLoginItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getRdpLogins(100, 0).then((res) => {
      if (cancelled) return;
      setItems(res.items);
      setTotal(res.total);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-headline-md flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">analytics</span>
            日志分析
          </h2>
          <p className="text-label-md text-on-surface-variant">RDP 登录流水记录 · 共 {total} 条</p>
        </div>
      </div>

      <div className="glass-panel micro-border rounded overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-on-surface-variant">加载中...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-on-surface-variant">暂无登录记录</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP</TableHead>
                  <TableHead>用户名</TableHead>
                  <TableHead>登录时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono tabular-nums">{item.ip}</TableCell>
                    <TableCell>{item.username ?? "--"}</TableCell>
                    <TableCell className="text-on-surface-variant">{item.login_at}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
