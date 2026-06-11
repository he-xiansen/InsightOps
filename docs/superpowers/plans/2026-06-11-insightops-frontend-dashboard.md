# InsightOps 前端看板接入实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 为 4 个前端空态页面（总览看板、RDP 趋势、闲置清单、虚机资产）接入真实后端数据，补齐 recharts 图表可视化和数据表格。

**架构：** 扩充现有 `apiFetch` 客户端覆盖所有后端查询接口；每个页面独立管理 loading/error/success 三态；RDP 趋势页使用 recharts `LineChart` 折线图；闲置清单和虚机资产页使用 shadcn/ui `Table` 组件；虚机资产页增加客户端搜索过滤。

**技术栈：** React 18、Vite、TypeScript、shadcn/ui（table/input/select）、recharts、TailwindCSS

---

## 文件结构

- 修改：`frontend/package.json`，新增 recharts 依赖
- 修改：`frontend/src/lib/api.ts`，扩充类型定义与 API 函数
- 重写：`frontend/src/pages/OverviewPage.tsx`，指标卡片接入数据
- 重写：`frontend/src/pages/RdpTrendPage.tsx`，recharts 折线图
- 重写：`frontend/src/pages/IdleAssetsPage.tsx`，数据表格 + CSV 导出
- 重写：`frontend/src/pages/VmAssetsPage.tsx`，搜索 + 数据表格

### 后端接口响应格式

| 接口 | 成功响应结构 |
|------|-------------|
| `GET /health` | `{"status": "ok"}` |
| `GET /api/assets` | `{"items": [{"ip","hostname","department","lab","owner","os_type","status","last_rdp_login_at"}]}` |
| `GET /api/v1/idle` | `{"items": [{"snapshot_date","ip","idle_days","owner","department","lab","recycle_level","reason","last_rdp_login_at"}]}` |
| `GET /api/v1/rdp/trends?granularity=day` | `{"code":0,"message":"success","data":{"granularity":"day","series":[{"bucket":"2026-06-01","login_count":5}]}}` |
| `GET /api/v1/idle/export` | CSV 文件流 |

---

### 任务 1：添加 shadcn/ui 组件（table/input/select）和 recharts

- [ ] **步骤 1：安装 shadcn/ui 组件**

运行：
```bash
cd /opt/trae/InsightOps/frontend
npx shadcn@latest add @shadcn/table @shadcn/input @shadcn/select
```

预期：`src/components/ui/` 下新增 `table.tsx`、`input.tsx`、`select.tsx`

- [ ] **步骤 2：安装 recharts**

运行：
```bash
cd /opt/trae/InsightOps/frontend
npm install recharts
```

预期：`package.json` 中新增 `recharts` 依赖

- [ ] **步骤 3：验证构建通过**

运行：
```bash
cd /opt/trae/InsightOps/frontend && npm run build
```

预期：构建成功，无 TypeScript 错误

---

### 任务 2：扩充 API 客户端

**文件：**
- 修改：`frontend/src/lib/api.ts`

- [ ] **步骤 1：编写类型定义和 API 函数**

```typescript
// 类型定义
export type HealthResponse = { status: string };

export type VmAssetItem = {
  ip: string;
  hostname: string | null;
  department: string | null;
  lab: string | null;
  owner: string | null;
  os_type: string | null;
  status: string;
  last_rdp_login_at: string | null;
};

export type VmAssetListResponse = { items: VmAssetItem[] };

export type IdleSnapshotItem = {
  snapshot_date: string;
  ip: string;
  idle_days: number;
  owner: string | null;
  department: string | null;
  lab: string | null;
  recycle_level: string;
  reason: string | null;
  last_rdp_login_at: string | null;
};

export type IdleSnapshotListResponse = { items: IdleSnapshotItem[] };

export type RdpTrendPoint = { bucket: string; login_count: number };
export type TrendGranularity = "day" | "week" | "month";
export type RdpTrendResponse = {
  code: number;
  message: string;
  data: { granularity: string; series: RdpTrendPoint[] };
};

// apiFetch 泛型基础方法（已有）
const JSON_HEADERS = { Accept: "application/json" };

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { ...JSON_HEADERS, ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as T;
}

// 导出接口函数
export async function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/health");
}

export async function getVmAssets(): Promise<VmAssetListResponse> {
  return apiFetch<VmAssetListResponse>("/api/assets");
}

export async function getIdleSnapshots(): Promise<IdleSnapshotListResponse> {
  return apiFetch<IdleSnapshotListResponse>("/api/v1/idle");
}

export async function getRdpTrends(
  granularity: TrendGranularity = "day",
): Promise<RdpTrendResponse> {
  return apiFetch<RdpTrendResponse>(
    `/api/v1/rdp/trends?granularity=${granularity}`,
  );
}

export function getIdleExportUrl(): string {
  return "/api/v1/idle/export";
}
```

- [ ] **步骤 2：验证构建通过**

运行：
```bash
cd /opt/trae/InsightOps/frontend && npm run build
```

预期：构建成功

- [ ] **步骤 3：Commit**

```bash
git add frontend/src/lib/api.ts frontend/package.json frontend/package-lock.json frontend/src/components/ui/
git commit -m "feat: add shadcn ui components, recharts, and api client"
```

---

### 任务 3：重写总览看板 (OverviewPage)

**文件：**
- 重写：`frontend/src/pages/OverviewPage.tsx`

- [ ] **步骤 1：编写组件代码**

```tsx
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getHealth,
  getIdleSnapshots,
  getRdpTrends,
  getVmAssets,
  type HealthResponse,
  type IdleSnapshotListResponse,
  type RdpTrendResponse,
  type VmAssetListResponse,
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
```

- [ ] **步骤 2：验证构建通过**

运行：
```bash
cd /opt/trae/InsightOps/frontend && npm run build
```

预期：构建成功，OverviewPage 无 TS 错误

---

### 任务 4：重写 RDP 登录趋势 (RdpTrendPage)

**文件：**
- 重写：`frontend/src/pages/RdpTrendPage.tsx`

- [ ] **步骤 1：编写组件代码**

```tsx
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
```

- [ ] **步骤 2：验证构建通过**

运行：
```bash
cd /opt/trae/InsightOps/frontend && npm run build
```

预期：构建成功

---

### 任务 5：重写闲置资源清单 (IdleAssetsPage)

**文件：**
- 重写：`frontend/src/pages/IdleAssetsPage.tsx`

- [ ] **步骤 1：编写组件代码**

```tsx
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
```

- [ ] **步骤 2：验证构建通过**

运行：
```bash
cd /opt/trae/InsightOps/frontend && npm run build
```

预期：构建成功

---

### 任务 6：重写虚机基础信息 (VmAssetsPage)

**文件：**
- 重写：`frontend/src/pages/VmAssetsPage.tsx`

- [ ] **步骤 1：编写组件代码**

```tsx
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
```

- [ ] **步骤 2：验证构建通过**

运行：
```bash
cd /opt/trae/InsightOps/frontend && npm run build
```

预期：构建成功

- [ ] **步骤 3：Commit**

```bash
git add frontend/src/pages/ frontend/src/lib/api.ts
git commit -m "feat: implement frontend dashboard with data integration"
```
