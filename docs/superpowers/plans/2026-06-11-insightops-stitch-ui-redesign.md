# InsightOps Stitch UI 重构实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 InsightOps 前端升级为 stitch "Obsidian Metric" 设计系统，包含 OLED 优化暗色主题、玻璃质感卡片、Sidebar + TopNavBar 布局，以及按 stitch 页面结构重新组织的 5 个页面。

**架构：** 先更新设计系统（颜色/字体/图标），再重写布局组件（AppShell → Sidebar + TopNavBar），然后逐个重写/创建页面组件（仪表盘、设备管理、告警中心、日志分析、系统设置），最后更新路由并删除旧页面。

**技术栈：** React 18、Vite、TypeScript、TailwindCSS、shadcn/ui、recharts、Material Symbols

---

## 文件结构

- 修改：`frontend/index.html` — 添加 Inter + JetBrains Mono + Material Symbols 字体链接
- 重写：`frontend/src/index.css` — 替换为 Obsidian Metric 颜色系统
- 重写：`frontend/src/components/layout/AppShell.tsx` — Sidebar + TopNavBar 布局
- 重写：`frontend/src/pages/OverviewPage.tsx` — 仪表盘（KPI 卡片 + 趋势图 + 告警+设备面板）
- 创建：`frontend/src/pages/DeviceManagementPage.tsx` — 设备管理表格页
- 创建：`frontend/src/pages/AlertsCenterPage.tsx` — 告警中心页
- 创建：`frontend/src/pages/LogAnalysisPage.tsx` — 日志分析占位页
- 创建：`frontend/src/pages/SystemSettingsPage.tsx` — 系统设置占位页
- 修改：`frontend/src/App.tsx` — 更新路由和导航
- 删除：`frontend/src/pages/RdpTrendPage.tsx` — 功能合并到仪表盘
- 删除：`frontend/src/pages/IdleAssetsPage.tsx` — 功能迁移到告警中心
- 删除：`frontend/src/pages/VmAssetsPage.tsx` — 功能迁移到设备管理

---

### 任务 1：更新设计系统（字体 + 颜色 + 基础样式）

**文件：**
- 修改：`frontend/index.html`
- 重写：`frontend/src/index.css`

- [ ] **步骤 1：更新 index.html 添加字体链接**

在 `<head>` 中添加 Google Fonts + Material Symbols 链接：

```html
<!doctype html>
<html class="dark" lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>InsightOps</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **步骤 2：重写 index.css 替换为 Obsidian Metric 颜色系统**

将 `frontend/src/index.css` 完全替换为：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    color-scheme: dark;
    font-family: Inter, system-ui, -apple-system, sans-serif;
    --background: #131315;
    --foreground: #e5e1e4;
    --card: #201f22;
    --card-foreground: #e5e1e4;
    --popover: #201f22;
    --popover-foreground: #e5e1e4;
    --primary: #adc6ff;
    --primary-foreground: #002e6a;
    --primary-container: #4d8eff;
    --secondary: #b7c8e1;
    --secondary-foreground: #213145;
    --muted: #353437;
    --muted-foreground: #c2c6d6;
    --accent: #4d8eff;
    --accent-foreground: #00285d;
    --destructive: #ffb4ab;
    --destructive-foreground: #690005;
    --border: #424754;
    --input: #424754;
    --ring: #adc6ff;
    --radius: 0.5rem;

    /* Obsidian Metric specific */
    --surface: #131315;
    --surface-container: #201f22;
    --surface-container-low: #1c1b1d;
    --surface-container-high: #2a2a2c;
    --surface-container-highest: #353437;
    --on-surface-variant: #c2c6d6;
    --outline: #8c909f;
    --outline-variant: #424754;
    --tertiary: #ffb786;
    --tertiary-container: #df7412;
    --error: #ffb4ab;
    --error-container: #93000a;
  }

  * {
    @apply border-border;
  }

  html, body, #root {
    min-height: 100%;
  }

  body {
    @apply bg-background text-foreground antialiased;
    margin: 0;
    background-color: #09090b;
    overflow-x: hidden;
  }

  a {
    @apply text-inherit no-underline;
  }

  .material-symbols-outlined {
    font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
    vertical-align: middle;
  }

  .micro-border {
    border: 0.5px solid hsla(217, 32%, 60%, 0.08);
  }

  .glass-panel {
    background-color: hsl(224 44% 11%);
    backdrop-filter: blur(20px);
  }

  .tabular-nums {
    font-variant-numeric: tabular-nums;
  }

  ::-webkit-scrollbar {
    width: 4px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: #353437;
    border-radius: 2px;
  }
}
```

- [ ] **步骤 3：验证构建通过**

运行：
```bash
cd /opt/trae/InsightOps/frontend && npm run build
```

预期：构建成功，无错误

---

### 任务 2：重写 AppShell（Sidebar + TopNavBar 布局）

**文件：**
- 重写：`frontend/src/components/layout/AppShell.tsx`

- [ ] **步骤 1：编写 AppShell 组件**

```tsx
import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";

import { getHealth } from "@/lib/api";

export type AppNavItem = {
  to: string;
  label: string;
  icon: string;
};

type AppShellProps = {
  navItems: AppNavItem[];
};

function useHealth() {
  const [status, setStatus] = useState<string>("检查中");
  useEffect(() => {
    getHealth()
      .then((res) => setStatus(res.status === "ok" ? "良好" : "异常"))
      .catch(() => setStatus("异常"));
  }, []);
  return status;
}

function Clock() {
  const [time, setTime] = useState(new Date().toISOString().replace("T", " ").substring(0, 19));
  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toISOString().replace("T", " ").substring(0, 19));
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-data-mono text-data-mono tabular-nums">{time}</span>;
}

export function AppShell({ navItems }: AppShellProps) {
  const healthStatus = useHealth();

  return (
    <div className="min-h-screen bg-background/80">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface border-r border-outline-variant flex flex-col z-[60]">
        {/* Brand Header */}
        <div className="px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-xl">insights</span>
            </div>
            <div>
              <h1 className="text-headline-md font-bold text-on-surface leading-tight">InsightOps</h1>
              <p className="text-label-md text-on-surface-variant opacity-70">Infrastructure Monitoring</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded transition-colors ${
                  isActive
                    ? "bg-primary-container text-on-primary-container border-l-4 border-primary"
                    : "text-on-surface-variant hover:bg-white/[0.04]"
                }`
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-body-md">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-6 border-t border-outline-variant space-y-1">
          <a className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:bg-white/[0.04] transition-colors rounded" href="#">
            <span className="material-symbols-outlined">help</span>
            <span className="text-label-md">帮助中心</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:bg-white/[0.04] transition-colors rounded" href="#">
            <span className="material-symbols-outlined">account_circle</span>
            <span className="text-label-md">个人中心</span>
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 min-h-screen flex flex-col">
        {/* TopNavBar */}
        <header className="sticky top-0 z-50 h-16 bg-surface border-b border-outline-variant flex justify-between items-center px-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-surface-container px-3 py-1.5 rounded micro-border gap-2">
              <span className="material-symbols-outlined text-sm text-primary">health_and_safety</span>
              <span className="text-label-md text-primary">系统健康状况: {healthStatus}</span>
            </div>
            <div className="h-4 w-px bg-outline-variant" />
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-lg">schedule</span>
              <Clock />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button className="p-2 rounded hover:bg-white/[0.04] transition-all text-on-surface-variant">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border border-surface" />
            </div>
            <button className="p-2 rounded hover:bg-white/[0.04] transition-all text-on-surface-variant">
              <span className="material-symbols-outlined">apps</span>
            </button>
            <div className="flex items-center gap-3 pl-2 border-l border-outline-variant">
              <span className="text-label-md font-bold text-primary">Admin</span>
              <div className="w-8 h-8 rounded-full bg-primary-container border border-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-sm text-on-primary-container">person</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6 space-y-4">
          <Outlet />
        </div>
      </main>
    </div>
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

### 任务 3：重写仪表盘（OverviewPage）

**文件：**
- 重写：`frontend/src/pages/OverviewPage.tsx`

- [ ] **步骤 1：编写仪表盘组件**

```tsx
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getHealth, getIdleSnapshots, getRdpTrends, getVmAssets } from "@/lib/api";

/* ─── Types ─── */
type IdleItem = {
  ip: string;
  idle_days: number;
  owner: string | null;
  department: string | null;
  recycle_level: string;
  last_rdp_login_at: string | null;
};

type VmItem = {
  ip: string;
  hostname: string | null;
  department: string | null;
  lab: string | null;
  status: string;
  last_rdp_login_at: string | null;
};

/* ─── Dashboard Data Hook ─── */
function useDashboard() {
  const [vmTotal, setVmTotal] = useState(0);
  const [idleTotal, setIdleTotal] = useState(0);
  const [todayRdp, setTodayRdp] = useState(0);
  const [healthOk, setHealthOk] = useState(true);
  const [alerts, setAlerts] = useState<IdleItem[]>([]);
  const [devices, setDevices] = useState<VmItem[]>([]);
  const [series, setSeries] = useState<{ bucket: string; login_count: number }[]>([]);
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [h, a, i, t] = await Promise.all([
          getHealth(), getVmAssets(), getIdleSnapshots(), getRdpTrends("day"),
        ]);
        if (cancelled) return;
        setHealthOk(h.status === "ok");
        setVmTotal(a.items.length);
        setIdleTotal(i.items.length);
        setDevices(a.items as VmItem[]);
        const highAlerts = (i.items as IdleItem[]).filter((x) => x.recycle_level === "high");
        const medAlerts = (i.items as IdleItem[]).filter((x) => x.recycle_level === "medium");
        setAlerts([...highAlerts, ...medAlerts].slice(0, 5));
        setTodayRdp(
          t.data.series.length > 0
            ? t.data.series[t.data.series.length - 1].login_count
            : 0,
        );
        setSeries(t.data.series);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const loadTrends = async (g: "day" | "week" | "month") => {
    setGranularity(g);
    const t = await getRdpTrends(g);
    setSeries(t.data.series);
  };

  return { vmTotal, idleTotal, todayRdp, healthOk, alerts, devices, series, granularity, loading, loadTrends };
}

/* ─── KPI Card ─── */
function KpiCard({
  label,
  value,
  trend,
  icon,
  color,
  progress,
}: {
  label: string;
  value: string;
  trend?: string;
  icon: string;
  color: string;
  progress: number;
}) {
  return (
    <div className="glass-panel micro-border p-5 rounded flex flex-col justify-between h-32">
      <div className="flex justify-between items-start">
        <span className="text-label-md text-on-surface-variant">{label}</span>
        <span className={`material-symbols-outlined text-${color} text-xl`}>{icon}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-display tabular-nums">{value}</span>
        {trend && <span className={`text-label-md text-${color}`}>{trend}</span>}
      </div>
      <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
        <div className={`h-full bg-${color}`} style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export function OverviewPage() {
  const d = useDashboard();
  const GRANULARITY_OPTIONS = [
    { value: "day" as const, label: "日" },
    { value: "week" as const, label: "周" },
    { value: "month" as const, label: "月" },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="虚机总数" value={String(d.vmTotal)} icon="memory" color="primary" progress={d.vmTotal > 0 ? (d.idleTotal / d.vmTotal) * 100 : 0} />
        <KpiCard label="闲置资源" value={String(d.idleTotal)} icon="developer_board" color={d.idleTotal > 0 ? "tertiary" : "secondary"} progress={d.vmTotal > 0 ? (d.idleTotal / d.vmTotal) * 100 : 0} />
        <KpiCard label="今日 RDP 登录" value={String(d.todayRdp)} icon="swap_calls" color="secondary" progress={d.todayRdp > 0 ? 45 : 0} />
        <KpiCard label="系统状态" value={d.healthOk ? "正常" : "异常"} icon={d.healthOk ? "health_and_safety" : "warning"} color={d.healthOk ? "primary" : "error"} progress={d.healthOk ? 100 : 0} />
      </section>

      {/* Trend Chart */}
      <section className="glass-panel micro-border rounded p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-headline-md">系统资源趋势</h2>
            <p className="text-label-md text-on-surface-variant">RDP 登录次数变化</p>
          </div>
          <div className="flex gap-2">
            {GRANULARITY_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={d.granularity === opt.value ? "default" : "outline"}
                size="sm"
                onClick={() => d.loadTrends(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="h-[320px]">
          {d.loading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">加载中...</div>
          ) : d.series.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">暂无趋势数据</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.series}>
                <defs>
                  <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(173, 198, 255, 0.1)" />
                    <stop offset="100%" stopColor="rgba(173, 198, 255, 0)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsla(217, 32%, 60%, 0.06)" />
                <XAxis dataKey="bucket" tick={{ fontSize: 12, fill: "#c2c6d6" }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#c2c6d6" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#201f22",
                    border: "0.5px solid hsla(217, 32%, 60%, 0.08)",
                    borderRadius: "0.5rem",
                  }}
                />
                <Area type="monotone" dataKey="login_count" stroke="#adc6ff" strokeWidth={2} fill="url(#chartGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Bottom Panels */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alerts Panel */}
        <div className="glass-panel micro-border rounded overflow-hidden">
          <div className="p-4 border-b border-outline-variant flex justify-between items-center">
            <h3 className="text-headline-md flex items-center gap-2">
              <span className="material-symbols-outlined text-error">campaign</span>
              最新告警
            </h3>
          </div>
          <div className="divide-y divide-outline-variant">
            {d.alerts.length === 0 && (
              <div className="p-6 text-center text-sm text-on-surface-variant">暂无告警</div>
            )}
            {d.alerts.map((alert) => (
              <div key={alert.ip} className="p-4 flex items-center gap-4 hover:bg-white/[0.04] transition-colors">
                <div className={`w-2 h-2 rounded-full shrink-0 ${alert.recycle_level === "high" ? "bg-error" : "bg-tertiary"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-body-md font-medium truncate">{alert.ip} 已闲置 {alert.idle_days} 天</p>
                  <p className="text-label-md text-on-surface-variant truncate">{alert.department ?? "--"} · {alert.owner ?? "--"}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                  alert.recycle_level === "high"
                    ? "bg-error/10 text-error-container border border-error/20"
                    : "bg-tertiary-container/10 text-tertiary-fixed-dim border border-tertiary/20"
                }`}>
                  {alert.recycle_level === "high" ? "Critical" : "Warning"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Device Status Panel */}
        <div className="glass-panel micro-border rounded overflow-hidden">
          <div className="p-4 border-b border-outline-variant flex justify-between items-center">
            <h3 className="text-headline-md flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">hub</span>
              设备连接状态
            </h3>
            <span className="text-label-md text-on-surface-variant tabular-nums">{d.devices.length} 在线</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/[0.02] border-b border-outline-variant">
                <tr>
                  <th className="px-4 py-3 text-label-md text-on-surface-variant">设备 ID</th>
                  <th className="px-4 py-3 text-label-md text-on-surface-variant">地理位置</th>
                  <th className="px-4 py-3 text-label-md text-on-surface-variant">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 font-data-mono text-data-mono">
                {d.devices.slice(0, 5).map((dev) => (
                  <tr key={dev.ip} className="hover:bg-white/[0.04] transition-colors">
                    <td className="px-4 py-3 tabular-nums">{dev.ip}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{dev.department ?? "--"} · {dev.lab ?? "--"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${dev.status === "active" ? "bg-primary" : "bg-outline"}`} />
                        <span className="text-label-md">{dev.status === "active" ? "Connected" : "Offline"}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
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

### 任务 4：创建设备管理页面（DeviceManagementPage）

**文件：**
- 创建：`frontend/src/pages/DeviceManagementPage.tsx`

- [ ] **步骤 1：创建设备管理页面**

```tsx
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getVmAssets } from "@/lib/api";

export function DeviceManagementPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    getVmAssets().then((res) => { if (!cancelled) setItems(res.items); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter(
      (item: any) =>
        item.ip.toLowerCase().includes(q) ||
        (item.hostname ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  return (
    <div className="glass-panel micro-border rounded overflow-hidden">
      <div className="p-4 border-b border-outline-variant flex justify-between items-center gap-4">
        <Input
          placeholder="搜索 IP 或主机名..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-label-md text-on-surface-variant tabular-nums">{filtered.length} 台在线</span>
      </div>
      {loading ? (
        <div className="p-8 text-center text-sm text-on-surface-variant">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-sm text-on-surface-variant">{search ? "未匹配到设备" : "暂无设备数据"}</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>设备 ID</TableHead>
                <TableHead>主机名</TableHead>
                <TableHead>地理位置</TableHead>
                <TableHead>操作系统</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item: any) => (
                <TableRow key={item.ip}>
                  <TableCell className="font-mono tabular-nums">{item.ip}</TableCell>
                  <TableCell>{item.hostname ?? "--"}</TableCell>
                  <TableCell className="text-on-surface-variant">{item.department ?? "--"} · {item.lab ?? "--"}</TableCell>
                  <TableCell>{item.os_type ?? "--"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${item.status === "active" ? "bg-primary" : "bg-outline"}`} />
                      <Badge variant={item.status === "active" ? "default" : "secondary"}>{item.status}</Badge>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
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

### 任务 5：创建告警中心页面（AlertsCenterPage）

**文件：**
- 创建：`frontend/src/pages/AlertsCenterPage.tsx`

- [ ] **步骤 1：创建告警中心页面**

```tsx
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getIdleExportUrl, getIdleSnapshots } from "@/lib/api";

type AlertItem = {
  ip: string;
  idle_days: number;
  owner: string | null;
  department: string | null;
  lab: string | null;
  recycle_level: string;
  last_rdp_login_at: string | null;
};

const LEVELS = ["all", "high", "medium"] as const;
type LevelFilter = (typeof LEVELS)[number];

const LEVEL_LABELS: Record<LevelFilter, string> = { all: "全部", high: "严重", medium: "警告" };

export function AlertsCenterPage() {
  const [items, setItems] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LevelFilter>("all");

  useEffect(() => {
    let cancelled = false;
    getIdleSnapshots().then((res) => { if (!cancelled) setItems(res.items as AlertItem[]); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.recycle_level === filter)),
    [items, filter],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {LEVELS.map((level) => (
            <Button
              key={level}
              variant={filter === level ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(level)}
            >
              {LEVEL_LABELS[level]}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={getIdleExportUrl()} download>CSV 导出</a>
        </Button>
      </div>

      <div className="glass-panel micro-border rounded overflow-hidden divide-y divide-outline-variant">
        {loading ? (
          <div className="p-8 text-center text-sm text-on-surface-variant">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-on-surface-variant">暂无告警</div>
        ) : (
          filtered.map((item) => (
            <div key={item.ip} className="p-4 flex items-center gap-4 hover:bg-white/[0.04] transition-colors">
              <div className={`w-2 h-2 rounded-full shrink-0 ${item.recycle_level === "high" ? "bg-error" : "bg-tertiary"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-body-md font-medium truncate">
                  {item.ip} 已闲置 {item.idle_days} 天
                  {item.recycle_level === "high" ? "（高优先级回收）" : "（低优先级回收）"}
                </p>
                <p className="text-label-md text-on-surface-variant truncate">
                  {item.department ?? "--"} · {item.owner ?? "--"} · 最后登录: {item.last_rdp_login_at ?? "从未登录"}
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                item.recycle_level === "high"
                  ? "bg-error/10 text-error-container border border-error/20"
                  : "bg-tertiary-container/10 text-tertiary-fixed-dim border border-tertiary/20"
              }`}>
                {item.recycle_level === "high" ? "Critical" : "Warning"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
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

### 任务 6：创建占位页面 + 更新路由

**文件：**
- 创建：`frontend/src/pages/LogAnalysisPage.tsx`
- 创建：`frontend/src/pages/SystemSettingsPage.tsx`
- 修改：`frontend/src/App.tsx`
- 删除：`frontend/src/pages/RdpTrendPage.tsx`
- 删除：`frontend/src/pages/IdleAssetsPage.tsx`
- 删除：`frontend/src/pages/VmAssetsPage.tsx`

- [ ] **步骤 1：创建日志分析占位页**

```tsx
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
```

- [ ] **步骤 2：创建系统设置占位页**

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SystemSettingsPage() {
  return (
    <Card className="glass-panel micro-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">settings</span>
          系统设置
        </CardTitle>
        <CardDescription className="mt-2 leading-6">系统设置功能即将上线</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
          该功能正在开发中，敬请期待
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **步骤 3：更新 App.tsx**

将 `frontend/src/App.tsx` 完全替换为：

```tsx
import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell, type AppNavItem } from "./components/layout/AppShell";
import { AlertsCenterPage } from "./pages/AlertsCenterPage";
import { DeviceManagementPage } from "./pages/DeviceManagementPage";
import { LogAnalysisPage } from "./pages/LogAnalysisPage";
import { OverviewPage } from "./pages/OverviewPage";
import { SystemSettingsPage } from "./pages/SystemSettingsPage";

const navItems: AppNavItem[] = [
  { to: "/dashboard", label: "仪表盘", icon: "dashboard" },
  { to: "/devices", label: "设备管理", icon: "router" },
  { to: "/alerts", label: "告警中心", icon: "notifications_active" },
  { to: "/logs", label: "日志分析", icon: "analytics" },
  { to: "/settings", label: "系统设置", icon: "settings" },
];

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell navItems={navItems} />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<OverviewPage />} />
        <Route path="/devices" element={<DeviceManagementPage />} />
        <Route path="/alerts" element={<AlertsCenterPage />} />
        <Route path="/logs" element={<LogAnalysisPage />} />
        <Route path="/settings" element={<SystemSettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
```

- [ ] **步骤 4：删除旧页面文件**

运行：
```bash
cd /opt/trae/InsightOps
git rm frontend/src/pages/RdpTrendPage.tsx frontend/src/pages/IdleAssetsPage.tsx frontend/src/pages/VmAssetsPage.tsx
```

- [ ] **步骤 5：验证构建通过**

运行：
```bash
cd /opt/trae/InsightOps/frontend && npm run build
```

预期：构建成功，无 TypeScript 错误

- [ ] **步骤 6：Commit**

```bash
cd /opt/trae/InsightOps
git add frontend/
git commit -m "feat: redesign ui with obsidian metric design system"
```
