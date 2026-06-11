import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function VmAssetsPage() {
  return (
    <section>
      <Card>
        <CardHeader className="gap-3">
          <Badge className="w-fit" variant="secondary">
            资产空态
          </Badge>
          <div>
            <CardTitle>虚机基础信息</CardTitle>
            <CardDescription className="mt-2 leading-6">
              该页面预留虚机名称、IP、所属人、规格和同步状态等基础字段展示，当前保持轻量空态骨架。
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-slate-300">
            <li>资产清单表格占位</li>
            <li>搜索与筛选栏占位</li>
            <li>同步状态标签占位</li>
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
