import { useCallback, useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getRdpTrends,
  type RdpTrendPoint,
  type TrendGranularity,
} from "@/lib/api";

const GRANULARITY_OPTIONS: { value: TrendGranularity; label: string }[] = [
  { value: "day", label: "日" },
  { value: "week", label: "周" },
  { value: "month", label: "月" },
];

export function RdpTrendPage() {
  const [granularity, setGranularity] = useState<TrendGranularity>("day");
  const [series, setSeries] = useState<RdpTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrends = useCallback(async (g: TrendGranularity) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRdpTrends(g);
      setSeries(res.data.series);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrends(granularity);
  }, [granularity, loadTrends]);

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader className="gap-3">
          <Badge className="w-fit" variant="secondary">RDP 登录趋势</Badge>
          <div>
            <CardTitle>RDP 登录趋势</CardTitle>
            <CardDescription className="mt-2 leading-6">
              按日 / 周 / 月粒度查看登录次数变化
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            {GRANULARITY_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={granularity === opt.value ? "default" : "outline"}
                size="sm"
                onClick={() => setGranularity(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          {error && (
            <p className="text-sm text-destructive">数据加载失败: {error}</p>
          )}

          {loading && (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
              加载中...
            </div>
          )}

          {!loading && !error && series.length === 0 && (
            <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
              暂无趋势数据
            </div>
          )}

          {!loading && !error && series.length > 0 && (
            <div className={cn("rounded-xl border p-4")}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="bucket"
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="login_count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "hsl(var(--primary))" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
