import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const metricCards = [
  { label: "数据同步", value: "待接入", hint: "后续接后端健康检查和同步时间", variant: "outline" as const },
  { label: "趋势分析", value: "空态", hint: "预留图表区和时间筛选", variant: "secondary" as const },
  { label: "资源治理", value: "空态", hint: "预留闲置清单和导出操作", variant: "secondary" as const },
];

export function OverviewPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <Badge variant="outline">空态首页</Badge>
        <div>
          <h3 className="text-3xl font-semibold">总览看板</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          一期仅展示导航和空态模块，确认整体布局、路由结构与视觉基调可用。
          </p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {metricCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="gap-3 pb-3">
              <Badge className="w-fit" variant={card.variant}>
                {card.label}
              </Badge>
              <CardTitle className="text-3xl">{card.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="leading-6 text-slate-300">{card.hint}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">下一步接入建议</CardTitle>
          <CardDescription className="leading-6">
            已完成 shadcn/ui 最小基座接入，后续可以直接扩展图表筛选器、数据表格和交互按钮。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button disabled>等待后端联调</Button>
          <Button variant="outline" disabled>
            筛选器待实现
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
