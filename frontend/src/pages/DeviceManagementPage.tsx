import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getVmAssets } from "@/lib/api";

export function DeviceManagementPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    getVmAssets().then((res) => { if (!cancelled) setItems(res.items); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter(
      (item: any) =>
        item.ip.toLowerCase().includes(q) ||
        (item.hostname ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  return (
    <div className="glass-panel micro-border rounded overflow-hidden">
      <div className="p-4 border-b border-outline-variant flex justify-between items-center gap-4">
        <Input
          placeholder="搜索 IP 或主机名..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-label-md text-on-surface-variant tabular-nums">{filtered.length} 台在线</span>
      </div>
      {loading ? (
        <div className="p-8 text-center text-sm text-on-surface-variant">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-sm text-on-surface-variant">{search ? "未匹配到设备" : "暂无设备数据"}</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>设备 ID</TableHead>
                <TableHead>主机名</TableHead>
                <TableHead>地理位置</TableHead>
                <TableHead>操作系统</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item: any) => (
                <TableRow key={item.ip}>
                  <TableCell className="font-mono tabular-nums">{item.ip}</TableCell>
                  <TableCell>{item.hostname ?? "--"}</TableCell>
                  <TableCell className="text-on-surface-variant">{item.department ?? "--"} · {item.lab ?? "--"}</TableCell>
                  <TableCell>{item.os_type ?? "--"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${item.status === "active" ? "bg-primary" : "bg-outline"}`} />
                      <Badge variant={item.status === "active" ? "default" : "secondary"}>{item.status}</Badge>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
