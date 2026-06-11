import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function RdpTrendPage() {
  return (
    <section className="space-y-4">
      <Card>
        <CardHeader className="gap-3">
          <Badge className="w-fit" variant="secondary">
            空态趋势页
          </Badge>
          <div>
            <CardTitle>RDP 登录趋势</CardTitle>
            <CardDescription className="mt-2 leading-6">
              这里预留趋势图、日期范围选择与粒度切换。当前版本只展示空态，等后端查询接口接入后再补真实图表。
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-dashed border-border bg-background/40 px-5 py-8 text-sm text-slate-300">
            暂无趋势数据，请先完成 RDP 查询接口联调。
          </div>
          <Button disabled>趋势查询待启用</Button>
        </CardContent>
      </Card>
    </section>
  );
}
