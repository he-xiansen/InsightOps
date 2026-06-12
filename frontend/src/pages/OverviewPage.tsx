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
  label, value, icon, progress, sub,
}: {
  label: string; value: string; icon: string; progress: number; sub?: string;
}) {
  return (
    <div className="glass-panel micro-border p-5 rounded flex flex-col justify-between h-32 transition-all duration-300 hover:border-primary/30 hover:bg-white/[0.02]">
      <div className="flex justify-between items-start">
        <span className="text-label-md text-on-surface-variant">{label}</span>
        <span className="material-symbols-outlined text-primary text-xl">{icon}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-display tabular-nums">{value}</span>
        {sub && <span className="text-label-md text-on-surface-variant">{sub}</span>}
      </div>
      <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${Math.min(progress, 100)}%` }} />
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
        <KpiCard label="虚机总数" value={String(d.vmTotal)} icon="memory" progress={d.vmTotal > 0 ? (d.idleTotal / d.vmTotal) * 100 : 0} sub={`闲置 ${d.idleTotal}`} />
        <KpiCard label="闲置资源" value={String(d.idleTotal)} icon="developer_board" progress={d.vmTotal > 0 ? (d.idleTotal / d.vmTotal) * 100 : 0} sub={d.vmTotal > 0 ? `${Math.round((d.idleTotal / d.vmTotal) * 100)}%` : "0%"} />
        <KpiCard label="今日 RDP 登录" value={String(d.todayRdp)} icon="swap_calls" progress={d.todayRdp > 0 ? 45 : 0} sub="最近24小时" />
        <KpiCard label="系统状态" value={d.healthOk ? "正常" : "异常"} icon={d.healthOk ? "health_and_safety" : "warning"} progress={d.healthOk ? 100 : 0} />
      </section>

      {/* Trend Chart */}
      <section className="glass-panel micro-border rounded p-6 transition-all duration-300 hover:border-primary/20">
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
                    <stop offset="0%" stopColor="rgba(173, 198, 255, 0.15)" />
                    <stop offset="100%" stopColor="rgba(173, 198, 255, 0)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsla(217, 32%, 60%, 0.06)" />
                <XAxis dataKey="bucket" tick={{ fontSize: 12, fill: "#c2c6d6" }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#c2c6d6" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#201f22", border: "0.5px solid hsla(217, 32%, 60%, 0.08)", borderRadius: "0.5rem" }} />
                <Area type="monotone" dataKey="login_count" stroke="#adc6ff" strokeWidth={2} fill="url(#chartGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Bottom Panels */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alerts Panel */}
        <div className="glass-panel micro-border rounded overflow-hidden transition-all duration-300 hover:border-primary/20">
          <div className="p-4 border-b border-outline-variant flex justify-between items-center">
            <h3 className="text-headline-md flex items-center gap-2">
              <span className="material-symbols-outlined text-error">campaign</span>
              最新告警
            </h3>
            <span className="text-label-md text-on-surface-variant tabular-nums">{d.alerts.length} 条</span>
          </div>
          <div className="divide-y divide-outline-variant">
            {d.alerts.length === 0 && (
              <div className="p-6 text-center text-sm text-on-surface-variant">暂无告警</div>
            )}
            {d.alerts.map((alert) => (
              <div key={alert.ip} className="p-4 flex items-center gap-4 hover:bg-white/[0.04] transition-colors duration-200">
                <div className={`w-2 h-2 rounded-full shrink-0 ${alert.recycle_level === "high" ? "bg-error" : "bg-tertiary"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-body-md font-medium truncate">{alert.ip} 已闲置 {alert.idle_days} 天</p>
                  <p className="text-label-md text-on-surface-variant truncate">{alert.department ?? "--"} · {alert.owner ?? "--"}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                  alert.recycle_level === "high"
                    ? "bg-error/10 text-error border border-error/20"
                    : "bg-tertiary-container/10 text-tertiary border border-tertiary/20"
                }`}>
                  {alert.recycle_level === "high" ? "Critical" : "Warning"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Device Status Panel */}
        <div className="glass-panel micro-border rounded overflow-hidden transition-all duration-300 hover:border-primary/20">
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
                  <tr key={dev.ip} className="hover:bg-white/[0.04] transition-colors duration-200">
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
