import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getIdleExportUrl,
  getIdleSnapshots,
  type IdleSnapshotItem,
} from "@/lib/api";

export function IdleAssetsPage() {
  const [items, setItems] = useState<IdleSnapshotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await getIdleSnapshots();
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

  return (
    <section className="grid gap-4">
      <Card>
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between">
            <div>
              <Badge className="w-fit" variant="outline">闲置资源清单</Badge>
              <CardTitle className="mt-2">闲置资源清单</CardTitle>
              <CardDescription className="mt-2 leading-6">
                按默认 30 天阈值识别的候选闲置虚机
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <a href={getIdleExportUrl()} download>CSV 导出</a>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {error && (
            <p className="text-sm text-destructive">数据加载失败: {error}</p>
          )}

          {loading && (
            <p className="text-sm text-muted-foreground">加载中...</p>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
              暂无闲置资源
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP</TableHead>
                  <TableHead>所属部门</TableHead>
                  <TableHead>负责人</TableHead>
                  <TableHead>闲置天数</TableHead>
                  <TableHead>回收等级</TableHead>
                  <TableHead>最后登录时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.ip}>
                    <TableCell className="font-mono">{item.ip}</TableCell>
                    <TableCell>{item.department ?? "--"}</TableCell>
                    <TableCell>{item.owner ?? "--"}</TableCell>
                    <TableCell>{item.idle_days}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.recycle_level === "high"
                            ? "destructive"
                            : item.recycle_level === "medium"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {item.recycle_level}
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
