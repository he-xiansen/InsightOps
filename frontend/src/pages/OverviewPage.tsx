import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { LineChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

import { Button } from "@/components/ui/button";
import {
  getHealth,
  getIdleSnapshots,
  getRdpTrends,
  getVmAssets,
  getVmAssetsWithPerf,
  getAiAdvice, getPerfOverview,
  type AdviceItem,
  type VmAssetPerfItem,
  type PerfHostItem,
} from "@/lib/api";

echarts.use([
  LineChart, PieChart,
  GridComponent, TooltipComponent, TitleComponent, LegendComponent,
  CanvasRenderer,
]);

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
  const [perfItems, setPerfItems] = useState<VmAssetPerfItem[]>([]);
  const [series, setSeries] = useState<{ bucket: string; login_count: number }[]>([]);
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");
  const [loading, setLoading] = useState(true);
  const [advice, setAdvice] = useState<AdviceItem[]>([]);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [deviceSearch, setDeviceSearch] = useState("");
  const [devicePage, setDevicePage] = useState(1);
  const [perfOverview, setPerfOverview] = useState<PerfHostItem[]>([]);
  const [perfLoading, setPerfLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [h, a, perf, i, t] = await Promise.all([
          getHealth(), getVmAssets(), getVmAssetsWithPerf(), getIdleSnapshots(), getRdpTrends("day"),
        ]);
        if (cancelled) return;
        setHealthOk(h.status === "ok");
        setVmTotal(a.items.length);
        setIdleTotal(i.items.length);
        setPerfItems(perf.items as VmAssetPerfItem[]);
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
    // 自动刷新：60 秒轮询（仅页面可见时）
    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        load();
      }
    }, 60000);
    return () => { cancelled = true; clearInterval(intervalId); };
  }, []);

  // 加载所有主机的性能总览
  useEffect(() => {
    let cancelled = false;
    setPerfLoading(true);
    getPerfOverview().then(res => {
      if (cancelled) return;
      setPerfOverview(res.hosts.filter(h => h.cpu != null || h.mem != null));
    }).catch(() => {}).finally(() => {
      if (!cancelled) setPerfLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const loadTrends = async (g: "day" | "week" | "month") => {
    setGranularity(g);
    const t = await getRdpTrends(g);
    setSeries(t.data.series);
  };

  const loadAdvice = useCallback(async () => {
    if (adviceLoading) return;
    setAdviceLoading(true);
    try {
      const sorted = [...perfItems].sort((a, b) => (b.idle_days ?? 0) - (a.idle_days ?? 0));
      const result = await getAiAdvice(
        sorted.slice(0, 10).map(item => ({
          ip: item.ip,
          hostname: item.hostname,
          idle_days: item.idle_days,
          cpu_avg: item.cpu_avg,
          mem_avg: item.mem_avg,
          last_rdp_login: item.last_rdp_login_at,
          os_type: item.os_type,
        }))
      );
      setAdvice(result.items);
    } catch {
      // ignore
    } finally {
      setAdviceLoading(false);
    }
  }, [perfItems, adviceLoading]);

  const DEVICE_PAGE_SIZE = 20;
  const deviceFiltered = useMemo(() => {
    const q = deviceSearch.trim().toLowerCase();
    if (!q) return perfItems;
    return perfItems.filter(item =>
      item.ip.toLowerCase().includes(q) ||
      (item.hostname ?? "").toLowerCase().includes(q) ||
      (item.owner ?? "").toLowerCase().includes(q)
    );
  }, [perfItems, deviceSearch]);

  const deviceTotalPages = Math.max(1, Math.ceil(deviceFiltered.length / DEVICE_PAGE_SIZE));
  const devicePaged = deviceFiltered.slice((devicePage - 1) * DEVICE_PAGE_SIZE, devicePage * DEVICE_PAGE_SIZE);

  useEffect(() => { setDevicePage(1); }, [deviceSearch]);

  const handleDevicePage = (e: React.MouseEvent) => {
    const action = (e.currentTarget as HTMLElement).getAttribute("data-action");
    if (action === "prev") setDevicePage(p => Math.max(1, p - 1));
    if (action === "next") setDevicePage(p => Math.min(deviceTotalPages, p + 1));
  };

  return { vmTotal, idleTotal, todayRdp, healthOk, alerts, devices, perfItems, series, granularity, loading, advice, adviceLoading, perfOverview, perfLoading, loadTrends, loadAdvice, deviceSearch, setDeviceSearch, deviceFiltered, devicePage, deviceTotalPages, devicePaged, setDevicePage: handleDevicePage };
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
  const [chartKey, setChartKey] = useState(0);
  const GRANULARITY_OPTIONS = [
    { value: "day" as const, label: "日" },
    { value: "week" as const, label: "周" },
    { value: "month" as const, label: "月" },
  ];

  // 闲置等级分布
  const idleLevels = d.alerts.reduce(
    (acc, item) => {
      if (item.recycle_level === "high") acc.high++;
      else if (item.recycle_level === "medium") acc.medium++;
      return acc;
    },
    { high: 0, medium: 0 },
  );
  const lowCount = d.vmTotal - d.idleTotal;

  const idlePieOption = {
    tooltip: { trigger: "item" as const, backgroundColor: "#201f22", borderColor: "hsla(217,32%,60%,0.08)" },
    legend: { bottom: 0, textStyle: { color: "#c2c6d6" } },
    series: [{
      type: "pie",
      radius: ["45%", "70%"],
      center: ["50%", "45%"],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 4, borderColor: "#09090b", borderWidth: 2 },
      label: { show: false },
      data: [
        { value: lowCount, name: "正常", itemStyle: { color: "#adc6ff" } },
        { value: idleLevels.medium, name: "低优先级闲置", itemStyle: { color: "#ffb786" } },
        { value: idleLevels.high, name: "高优先级闲置", itemStyle: { color: "#ffb4ab" } },
      ],
    }],
  };

  // RDP 趋势 ECharts option
  const trendOption = {
    tooltip: {
      trigger: "axis",
      backgroundColor: "#201f22",
      borderColor: "hsla(217,32%,60%,0.08)",
      textStyle: { color: "#e5e1e4" },
    },
    grid: { left: 40, right: 20, top: 10, bottom: 30 },
    xAxis: {
      type: "category",
      data: d.series.map(s => {
        const d2 = s.bucket.substring(5);
        return d2;
      }),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "#c2c6d6", fontSize: 11 },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "hsla(217,32%,60%,0.06)" } },
      axisLabel: { color: "#c2c6d6", fontSize: 11 },
    },
    series: [{
      type: "line",
      smooth: true,
      symbol: "circle",
      symbolSize: 6,
      lineStyle: { color: "#adc6ff", width: 2 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: "rgba(173, 198, 255, 0.25)" },
          { offset: 1, color: "rgba(173, 198, 255, 0)" },
        ]),
      },
      data: d.series.map(s => s.login_count),
    }],
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="虚机总数" value={String(d.vmTotal)} icon="memory" progress={d.vmTotal > 0 ? (d.idleTotal / d.vmTotal) * 100 : 0} sub={`闲置 ${d.idleTotal}`} />
        <KpiCard label="闲置资源" value={String(d.idleTotal)} icon="developer_board" progress={d.vmTotal > 0 ? (d.idleTotal / d.vmTotal) * 100 : 0} sub={d.vmTotal > 0 ? `${Math.round((d.idleTotal / d.vmTotal) * 100)}%` : "0%"} />
        <KpiCard label="今日 RDP 登录" value={String(d.todayRdp)} icon="swap_calls" progress={d.todayRdp > 0 ? 45 : 0} sub="最近24小时" />
        <KpiCard label="系统状态" value={d.healthOk ? "正常" : "异常"} icon={d.healthOk ? "health_and_safety" : "warning"} progress={d.healthOk ? 100 : 0} />
      </section>

      {/* Charts Row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend Chart (spans 2 cols) */}
        <div className="lg:col-span-2 glass-panel micro-border rounded p-5 transition-all duration-300 hover:border-primary/20">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-headline-md">RDP 登录趋势</h2>
            <div className="flex gap-1">
              {GRANULARITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { d.loadTrends(opt.value); setChartKey(k => k + 1); }}
                  className={`text-xs h-7 px-3 rounded transition-all ${
                    d.granularity === opt.value
                      ? "bg-primary text-primary-foreground font-medium shadow-sm"
                      : "bg-transparent border border-white/10 text-on-surface-variant hover:border-white/30"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {d.series.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-on-surface-variant">暂无可穿戴数据，请先推送 RDP 事件</div>
          ) : (
            <ReactEChartsCore
              key={chartKey}
              echarts={echarts}
              option={trendOption}
              style={{ height: 260 }}
              notMerge
            />
          )}
        </div>

        {/* Idle Distribution Pie */}
        <div className="glass-panel micro-border rounded p-5 transition-all duration-300 hover:border-primary/20">
          <h2 className="text-headline-md mb-2">闲置等级分布</h2>
          <ReactEChartsCore
            echarts={echarts}
            option={idlePieOption}
            style={{ height: 260 }}
            notMerge
          />
        </div>
      </section>

      {/* CPU & Memory Overview Row */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CPU & Memory Distribution Pie */}
        <div className="glass-panel micro-border rounded p-5 transition-all duration-300 hover:border-primary/20">
          <h2 className="text-headline-md mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">monitoring</span>
            CPU & 内存使用分布
          </h2>
          {(() => {
            const hosts = d.perfOverview.filter((h: any) => h.cpu != null || h.mem != null);
            if (hosts.length === 0) return <div className="h-48 flex items-center justify-center text-sm text-on-surface-variant">{d.perfLoading ? "加载中..." : "暂无可监控的主机数据"}</div>;
            const cpuHigh = hosts.filter((h: any) => h.cpu != null && h.cpu >= 60).length;
            const cpuMid = hosts.filter((h: any) => h.cpu != null && h.cpu >= 30 && h.cpu < 60).length;
            const cpuLow = hosts.filter((h: any) => h.cpu != null && h.cpu < 30).length;
            const memHigh = hosts.filter((h: any) => h.mem != null && h.mem >= 70).length;
            const memMid = hosts.filter((h: any) => h.mem != null && h.mem >= 40 && h.mem < 70).length;
            const memLow = hosts.filter((h: any) => h.mem != null && h.mem < 40).length;
            return <>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-xs text-on-surface-variant mb-1">CPU 使用率</p>
                  <ReactEChartsCore
                    echarts={echarts}
                    option={{
                      tooltip: { trigger: "item", backgroundColor: "#201f22", borderColor: "hsla(217,32%,60%,0.08)", textStyle: { color: "#e5e1e4" }, formatter: "{b}: {c}台" },
                      series: [{
                        type: "pie", radius: ["30%", "70%"], center: ["50%", "50%"], label: { show: true, formatter: function(p: any) { return p.name.split(" ")[0] + "\n" + p.value; }, fontSize: 11, fontWeight: "bold", color: "#e5e1e4", lineHeight: 16 },
                        data: [
                          { value: cpuHigh, name: "高占用 (>=60%)", itemStyle: { color: "#ffb4ab" } },
                          { value: cpuMid, name: "中等 (30-60%)", itemStyle: { color: "#ffb786" } },
                          { value: cpuLow, name: "低占用 (<30%)", itemStyle: { color: "#adc6ff" } },
                        ],
                      }],
                    }}
                    style={{ height: 200 }}
                    notMerge
                  />
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant mb-1">内存使用率</p>
                  <ReactEChartsCore
                    echarts={echarts}
                    option={{
                      tooltip: { trigger: "item", backgroundColor: "#201f22", borderColor: "hsla(217,32%,60%,0.08)", textStyle: { color: "#e5e1e4" }, formatter: "{b}: {c}台" },
                      series: [{
                        type: "pie", radius: ["30%", "70%"], center: ["50%", "50%"], label: { show: true, formatter: function(p: any) { return p.name.split(" ")[0] + "\n" + p.value; }, fontSize: 11, fontWeight: "bold", color: "#e5e1e4", lineHeight: 16 },
                        data: [
                          { value: memHigh, name: "高占用 (>=70%)", itemStyle: { color: "#ffb4ab" } },
                          { value: memMid, name: "中等 (40-70%)", itemStyle: { color: "#ffb786" } },
                          { value: memLow, name: "低占用 (<40%)", itemStyle: { color: "#adc6ff" } },
                        ],
                      }],
                    }}
                    style={{ height: 200 }}
                    notMerge
                  />
                </div>
              </div>
            </>;
          })()}
        </div>

        {/* Bar: Host Ranking */}
        <div className="glass-panel micro-border rounded p-5 transition-all duration-300 hover:border-primary/20">
          <h2 className="text-headline-md mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary text-xl">sort</span>
            主机使用率排行
          </h2>
          {(() => {
            const hosts = [...d.perfOverview].filter((h: any) => h.cpu != null || h.mem != null).reverse();
            if (hosts.length === 0) return <div className="h-48 flex items-center justify-center text-sm text-on-surface-variant">{d.perfLoading ? "加载中..." : "暂无可监控的主机数据"}</div>;
            return (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {hosts.map((h: any) => (
                  <div key={h.ip} className="flex items-center gap-3 text-sm">
                    <span className="w-24 font-mono text-on-surface-variant truncate shrink-0">{h.ip}</span>
                    <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-7 text-right tabular-nums text-xs text-primary shrink-0">CPU</span>
                        <span className="w-8 text-right tabular-nums text-primary shrink-0">{(h.cpu ?? 0).toFixed(0)}%</span>
                        <div className="flex-1 h-4 bg-gray-800 rounded-sm" style={{ position: "relative" }}>
                          <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: Math.min(h.cpu ?? 0, 100) + "%", backgroundColor: "#adc6ff", borderRadius: "2px", transition: "width 0.3s" }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-7 text-right tabular-nums text-xs text-error shrink-0">MEM</span>
                        <span className="w-8 text-right tabular-nums text-error shrink-0">{(h.mem ?? 0).toFixed(0)}%</span>
                        <div className="flex-1 h-4 bg-gray-800 rounded-sm" style={{ position: "relative" }}>
                          <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: Math.min(h.mem ?? 0, 100) + "%", backgroundColor: "#ffb4ab", borderRadius: "2px", transition: "width 0.3s" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
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
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 animate-pulse ${alert.recycle_level === "high" ? "bg-error shadow-[0_0_8px_rgba(239,68,68,0.6)]" : "bg-tertiary shadow-[0_0_8px_rgba(168,130,255,0.6)]"}`} />
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

        {/* AI Advice Panel */}
        <div className="glass-panel micro-border rounded overflow-hidden transition-all duration-300 hover:border-primary/20">
          <div className="p-4 border-b border-outline-variant flex justify-between items-center">
            <h3 className="text-headline-md flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary">auto_awesome</span>
              AI 回收建议
            </h3>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={d.loadAdvice} disabled={d.adviceLoading}>
              <span className="material-symbols-outlined text-sm mr-1">refresh</span>
              {d.adviceLoading ? "分析中..." : "分析"}
            </Button>
          </div>
          <div className="divide-y divide-outline-variant max-h-80 overflow-y-auto">
            {d.advice.length === 0 ? (
              <div className="p-6 text-center text-sm text-on-surface-variant">
                <p>点击"分析"按钮，AI 将基于闲置数据</p>
                <p className="mt-1">为当前主机生成回收建议</p>
                <p className="mt-3 text-xs opacity-60">需要先在系统设置中配置 LLM API Key</p>
              </div>
            ) : (
              d.advice.map((item) => (
                <div key={item.ip} className="p-4 hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm tabular-nums text-primary">{item.ip}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                      item.rating === "high"
                        ? "bg-error/10 text-error border border-error/20"
                        : item.rating === "medium"
                        ? "bg-tertiary-container/10 text-tertiary border border-tertiary/20"
                        : "bg-primary/10 text-primary border border-primary/20"
                    }`}>
                      {item.rating === "high" ? "建议回收" : item.rating === "medium" ? "建议关注" : "正常"}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant mb-1">{item.summary}</p>
                  {item.details.length > 0 && (
                    <ul className="text-xs text-on-surface-variant/70 space-y-0.5 ml-4 list-disc">
                      {item.details.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Quick Device Status */}
      <section className="glass-panel micro-border rounded overflow-hidden transition-all duration-300 hover:border-primary/20">
        <div className="p-4 border-b border-white/[0.06] bg-white/[0.02] flex flex-wrap items-center gap-3">
          <h3 className="text-headline-md flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">hub</span>
            设备连接状态
          </h3>
          <input
            type="text"
            placeholder="搜索 IP、主机名、负责人..."
            value={d.deviceSearch}
            onChange={(e) => d.setDeviceSearch(e.target.value)}
            className="ml-auto max-w-xs h-9 px-3 rounded-lg border border-white/[0.08] bg-white/[0.03] text-sm text-on-surface-variant placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-all duration-200"
          />
          <span className="text-label-md text-on-surface-variant tabular-nums">{d.deviceFiltered.length} 台 / {d.devices.length} 在线</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-center">
            <thead className="bg-primary/[0.06] border-b border-primary/10">
              <tr>
                <th className="px-4 py-3 text-label-md text-on-surface-variant font-semibold tracking-wider uppercase text-[10px]">状态</th>
                <th className="px-4 py-3 text-label-md text-on-surface-variant font-semibold tracking-wider uppercase text-[10px]">主机名</th>
                <th className="px-4 py-3 text-label-md text-on-surface-variant font-semibold tracking-wider uppercase text-[10px]">IP</th>
                <th className="px-4 py-3 text-label-md text-on-surface-variant font-semibold tracking-wider uppercase text-[10px]">负责人</th>
                <th className="px-4 py-3 text-label-md text-on-surface-variant font-semibold tracking-wider uppercase text-[10px]">电话</th>
                <th className="px-4 py-3 text-label-md text-on-surface-variant font-semibold tracking-wider uppercase text-[10px]">闲置天数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] min-h-[740px]">
              {d.devicePaged.map((dev: any) => (
                <tr key={dev.ip} className="hover:bg-primary/[0.03] transition-all duration-200 border-l-2 border-l-transparent hover:border-l-primary/30">
                  <td className="px-4 py-3">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${dev.status === "active" ? "bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]" : "bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.4)]"}`} />
                  </td>
                  <td className="px-4 py-3 font-medium text-center">{dev.hostname ?? "--"}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-center">{dev.ip}</td>
                  <td className="px-4 py-3 text-on-surface-variant text-center">{dev.owner ?? "--"}</td>
                  <td className="px-4 py-3 text-on-surface-variant text-center">{dev.phone ?? "--"}</td>
                  <td className="px-4 py-3">
                    {dev.idle_days >= 0 ? (
                      <span className={`tabular-nums ${dev.idle_days >= 60 ? "text-error" : dev.idle_days >= 30 ? "text-tertiary" : ""}`}>
                        {dev.idle_days} 天
                      </span>
                    ) : (
                      <span className="text-on-surface-variant">--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-white/[0.06] bg-white/[0.02] flex justify-between items-center text-sm text-on-surface-variant">
          <span>第 {d.devicePage}/{d.deviceTotalPages} 页</span>
          <div className="flex gap-2">
            <button
              className="text-xs h-7 px-3 rounded border border-white/10 text-on-surface-variant hover:border-white/30 disabled:opacity-30 transition-all"
              disabled={d.devicePage <= 1}
              onClick={d.setDevicePage}
              data-action="prev"
            >上一页</button>
            <button
              className="text-xs h-7 px-3 rounded border border-white/10 text-on-surface-variant hover:border-white/30 disabled:opacity-30 transition-all"
              disabled={d.devicePage >= d.deviceTotalPages}
              onClick={d.setDevicePage}
              data-action="next"
            >下一页</button>
          </div>
        </div>
      </section>
    </div>
  );
}
