import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent, TitleComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { toBeijingTime } from "@/lib/utils";

echarts.use([LineChart, GridComponent, TooltipComponent, TitleComponent, CanvasRenderer]);

type HostDetail = {
  asset: {
    ip: string;
    hostname: string | null;
    department: string | null;
    owner: string | null;
    phone: string | null;
    mobile: string | null;
    os_type: string | null;
    status: string;
    last_rdp_login_at: string | null;
    idle_days: number;
  } | null;
  latest_perf: { cpu: number | null; mem: number | null; collected_at: string | null };
  perf_trend: { clock: number; cpu_avg: number | null; mem_avg: number | null }[];
  rdp_logins: { id: number; login_at: string; username: string | null }[];
};

export function HostDetailPage() {
  const { ip } = useParams<{ ip: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<HostDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ip) return;
    setLoading(true);
    fetch(`/api/v1/perf/host/${encodeURIComponent(ip)}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ip]);

  if (loading) {
    return <div className="p-8 text-center text-sm text-on-surface-variant">加载中...</div>;
  }
  if (!data) {
    return <div className="p-8 text-center text-sm text-on-surface-variant">未找到主机数据</div>;
  }

  const a = data.asset;
  const trendOption = {
    tooltip: {
      trigger: "axis",
      backgroundColor: "#201f22",
      borderColor: "hsla(217,32%,60%,0.08)",
      textStyle: { color: "#e5e1e4" },
    },
    legend: { data: ["CPU %", "MEM %"], textStyle: { color: "#c2c6d6" } },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: "time",
      axisLine: { lineStyle: { color: "hsla(217,32%,60%,0.12)" } },
      axisLabel: { color: "#c2c6d6", fontSize: 11 },
    },
    yAxis: {
      type: "value",
      max: 100,
      splitLine: { lineStyle: { color: "hsla(217,32%,60%,0.06)" } },
      axisLabel: { color: "#c2c6d6", fontSize: 11, formatter: "{value}%" },
    },
    series: [
      {
        name: "CPU %",
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 4,
        lineStyle: { color: "#adc6ff", width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(173, 198, 255, 0.25)" },
            { offset: 1, color: "rgba(173, 198, 255, 0)" },
          ]),
        },
        data: data.perf_trend.map((p) => [p.clock * 1000, p.cpu_avg]),
      },
      {
        name: "MEM %",
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 4,
        lineStyle: { color: "#ffb4ab", width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(255, 180, 171, 0.25)" },
            { offset: 1, color: "rgba(255, 180, 171, 0)" },
          ]),
        },
        data: data.perf_trend.map((p) => [p.clock * 1000, p.mem_avg]),
      },
    ],
  };

  return (
    <div className="space-y-4">
      {/* 返回按钮 */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors"
      >
        <span className="material-symbols-outlined text-base">arrow_back</span>
        返回
      </button>

      {/* 基本信息卡片 */}
      <div className="glass-panel micro-border rounded p-5">
        <h2 className="text-headline-md mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">dns</span>
          {a?.hostname ?? ip}
          {a?.status === "active"
            ? <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)] ml-2" />
            : <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.4)] ml-2" />
          }
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-label-md text-on-surface-variant">IP</p>
            <p className="font-mono tabular-nums">{a?.ip ?? "--"}</p>
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant">主机名</p>
            <p>{a?.hostname ?? "--"}</p>
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant">负责人</p>
            <p>{a?.owner ?? "--"}</p>
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant">电话</p>
            <p>{a?.phone ?? "--"}</p>
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant">部门</p>
            <p>{a?.department ?? "--"}</p>
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant">手机</p>
            <p>{a?.mobile ?? "--"}</p>
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant">状态</p>
            <p>{a?.status === "active" ? "在线" : "离线"}</p>
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant">闲置天数</p>
            <p className={a && a.idle_days >= 30 ? "text-error" : ""}>
              {a ? `${a.idle_days} 天` : "--"}
            </p>
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant">操作系统</p>
            <p>{a?.os_type ?? "--"}</p>
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant">最近 RDP 登录</p>
            <p>{a?.last_rdp_login_at ? toBeijingTime(a.last_rdp_login_at) : "--"}</p>
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant">CPU（最新）</p>
            <p className="tabular-nums">{data.latest_perf.cpu != null ? `${data.latest_perf.cpu.toFixed(1)}%` : "--"}</p>
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant">内存（最新）</p>
            <p className="tabular-nums">{data.latest_perf.mem != null ? `${data.latest_perf.mem.toFixed(1)}%` : "--"}</p>
          </div>
        </div>
      </div>

      {/* CPU & 内存趋势图 */}
      <div className="glass-panel micro-border rounded p-5">
        <h2 className="text-headline-md mb-4">CPU & 内存使用趋势</h2>
        {data.perf_trend.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-on-surface-variant">暂无趋势数据</div>
        ) : (
          <ReactEChartsCore echarts={echarts} option={trendOption} style={{ height: 300 }} notMerge />
        )}
      </div>

      {/* RDP 登录记录 */}
      <div className="glass-panel micro-border rounded overflow-hidden">
        <div className="p-4 border-b border-white/[0.06]">
          <h3 className="text-headline-md flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary">login</span>
            RDP 登录记录
            <span className="text-label-md text-on-surface-variant tabular-nums ml-auto">{data.rdp_logins.length} 条</span>
          </h3>
        </div>
        {data.rdp_logins.length === 0 ? (
          <div className="p-6 text-center text-sm text-on-surface-variant">暂无 RDP 登录记录</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-center">
              <thead className="bg-primary/[0.06] border-b border-primary/10">
                <tr>
                  <th className="px-4 py-3 text-label-md text-on-surface-variant font-semibold tracking-wider uppercase text-[10px]">登录时间</th>
                  <th className="px-4 py-3 text-label-md text-on-surface-variant font-semibold tracking-wider uppercase text-[10px]">用户名</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {data.rdp_logins.map((r) => (
                  <tr key={r.id} className="hover:bg-primary/[0.03] transition-all duration-200">
                    <td className="px-4 py-3 font-mono tabular-nums">{toBeijingTime(r.login_at)}</td>
                    <td className="px-4 py-3">{r.username ?? "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
