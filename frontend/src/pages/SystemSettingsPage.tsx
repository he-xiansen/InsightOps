import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getHealth, getVmAssets } from "@/lib/api";

export function SystemSettingsPage() {
  const [healthStatus, setHealthStatus] = useState("检查中");
  const [vmCount, setVmCount] = useState(0);

  useEffect(() => {
    getHealth().then((r) => setHealthStatus(r.status === "ok" ? "正常" : "异常")).catch(() => setHealthStatus("异常"));
    getVmAssets().then((r) => setVmCount(r.items.length)).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-headline-md flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">settings</span>
        系统设置
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="glass-panel micro-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-body-md">
              <span className="material-symbols-outlined text-primary">info</span>
              系统信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-body-md">
              <span className="text-on-surface-variant">应用名称</span>
              <span>InsightOps</span>
            </div>
            <div className="flex justify-between text-body-md">
              <span className="text-on-surface-variant">API 状态</span>
              <Badge variant={healthStatus === "正常" ? "default" : "destructive"}>{healthStatus}</Badge>
            </div>
            <div className="flex justify-between text-body-md">
              <span className="text-on-surface-variant">虚机总数</span>
              <span className="tabular-nums">{vmCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel micro-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-body-md">
              <span className="material-symbols-outlined text-primary">api</span>
              API 接口
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-body-md">
              <span className="text-on-surface-variant">健康检查</span>
              <code className="font-data-mono text-xs">GET /health</code>
            </div>
            <div className="flex justify-between text-body-md">
              <span className="text-on-surface-variant">资产同步</span>
              <code className="font-data-mono text-xs">POST /api/v1/sync/vm-assets</code>
            </div>
            <div className="flex justify-between text-body-md">
              <span className="text-on-surface-variant">RDP 趋势</span>
              <code className="font-data-mono text-xs">GET /api/v1/rdp/trends</code>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
