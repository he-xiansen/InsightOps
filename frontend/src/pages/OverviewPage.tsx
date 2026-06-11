import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getHealth,
  getIdleSnapshots,
  getRdpTrends,
  getVmAssets,
} from "@/lib/api";

type MetricCard = {
  label: string;
  value: string;
  hint: string;
};

function useMetrics() {
  const [cards, setCards] = useState<MetricCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [healthRes, assetsRes, idleRes, trendRes] = await Promise.all([
          getHealth(),
          getVmAssets(),
          getIdleSnapshots(),
          getRdpTrends("day"),
        ]);

        if (cancelled) return;

        const todayCount =
          trendRes.data.series.length > 0
            ? trendRes.data.series[trendRes.data.series.length - 1].login_count
            : 0;

        setCards([
          { label: "虚机资产", value: String(assetsRes.items.length), hint: "资产总数" },
          { label: "闲置资源", value: String(idleRes.items.length), hint: "待回收建议" },
          { label: "今日 RDP 登录", value: String(todayCount), hint: "最近 24 小时" },
          { label: "系统状态", value: healthRes.status === "ok" ? "正常" : "异常", hint: "服务健康" },
        ]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { cards, loading, error };
}

export function OverviewPage() {
  const { cards, loading, error } = useMetrics();

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <Badge variant="outline">总览看板</Badge>
        <div>
          <h3 className="text-3xl font-semibold">总览看板</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            关键指标一览
          </p>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">数据加载失败: {error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="gap-3 pb-3">
                  <Badge className="w-fit" variant="secondary">加载中...</Badge>
                  <CardTitle className="text-3xl">--</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-6 text-slate-300">加载中</CardDescription>
                </CardContent>
              </Card>
            ))
          : cards.map((card) => (
              <Card key={card.label}>
                <CardHeader className="gap-3 pb-3">
                  <Badge className="w-fit" variant="secondary">
                    {card.label}
                  </Badge>
                  <CardTitle className="text-3xl">{card.value}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-6 text-slate-300">
                    {card.hint}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
      </div>
    </section>
  );
}
