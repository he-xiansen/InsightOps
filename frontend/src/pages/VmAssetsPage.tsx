import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getVmAssets, type VmAssetItem } from "@/lib/api";

export function VmAssetsPage() {
  const [items, setItems] = useState<VmAssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await getVmAssets();
        if (!cancelled) setItems(res.items);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter(
      (item) =>
        item.ip.toLowerCase().includes(q) ||
        (item.hostname ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader className="gap-3">
          <Badge className="w-fit" variant="secondary">虚机基础信息</Badge>
          <div>
            <CardTitle>虚机基础信息</CardTitle>
            <CardDescription className="mt-2 leading-6">
              展示资产属性、所属人和同步状态
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <Input
              placeholder="搜索 IP 或主机名..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">数据加载失败: {error}</p>
          )}

          {loading && (
            <p className="text-sm text-muted-foreground">加载中...</p>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
              {search ? "未匹配到虚机" : "暂无虚机数据"}
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP</TableHead>
                  <TableHead>主机名</TableHead>
                  <TableHead>部门</TableHead>
                  <TableHead>负责人</TableHead>
                  <TableHead>操作系统</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>最后活跃</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.ip}>
                    <TableCell className="font-mono">{item.ip}</TableCell>
                    <TableCell>{item.hostname ?? "--"}</TableCell>
                    <TableCell>{item.department ?? "--"}</TableCell>
                    <TableCell>{item.owner ?? "--"}</TableCell>
                    <TableCell>{item.os_type ?? "--"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={item.status === "active" ? "default" : "secondary"}
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.last_rdp_login_at ?? "--"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
