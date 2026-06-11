import type { CSSProperties } from "react";

const panelStyle: CSSProperties = {
  borderRadius: 20,
  border: "1px solid rgba(244, 244, 245, 0.08)",
  background: "rgba(24, 24, 27, 0.82)",
  padding: 24,
};

export function RdpTrendPage() {
  return (
    <section style={panelStyle}>
      <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: "1.6rem" }}>RDP 登录趋势</h3>
      <p style={{ marginTop: 0, color: "#a1a1aa", lineHeight: 1.6 }}>
        这里预留趋势图、日期范围选择与粒度切换。当前版本只展示空态，等后端查询接口接入后再补真实图表。
      </p>
      <div style={{ marginTop: 20, padding: 24, borderRadius: 16, background: "rgba(63, 63, 70, 0.28)", color: "#d4d4d8" }}>
        暂无趋势数据，请先完成 RDP 查询接口联调。
      </div>
    </section>
  );
}
