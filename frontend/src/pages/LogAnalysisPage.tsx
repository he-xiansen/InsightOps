import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LogAnalysisPage() {
  return (
    <Card className="glass-panel micro-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">analytics</span>
          日志分析
        </CardTitle>
        <CardDescription className="mt-2 leading-6">日志分析功能即将上线</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
          该功能正在开发中，敬请期待
        </div>
      </CardContent>
    </Card>
  );
}
