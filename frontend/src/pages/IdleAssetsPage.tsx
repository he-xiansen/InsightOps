import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function IdleAssetsPage() {
  return (
    <section className="grid gap-4">
      <Card>
        <CardHeader className="gap-3">
          <Badge className="w-fit" variant="outline">
            治理空态
          </Badge>
          <div>
            <CardTitle>闲置资源清单</CardTitle>
            <CardDescription className="mt-2 leading-6">
              后续会在此展示闲置天数、负责人、回收等级和 CSV 导出入口。当前先提供页面占位和说明文案。
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">空态说明</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="max-w-2xl text-sm leading-6 text-slate-300">
            暂无闲置资源样本，待接入后端筛选与导出接口后展示表格内容。
          </p>
          <Button variant="outline" disabled>
            CSV 导出待启用
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
