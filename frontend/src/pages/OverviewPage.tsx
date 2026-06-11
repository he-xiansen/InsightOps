import type { CSSProperties } from "react";

const metricCards = [
  { label: "数据同步", value: "待接入", hint: "后续接后端健康检查和同步时间" },
  { label: "趋势分析", value: "空态", hint: "预留图表区和时间筛选" },
  { label: "资源治理", value: "空态", hint: "预留闲置清单和导出操作" },
];

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 18,
};

const cardStyle: CSSProperties = {
  padding: 20,
  borderRadius: 20,
  border: "1px solid rgba(244, 244, 245, 0.08)",
  background: "rgba(24, 24, 27, 0.82)",
};

export function OverviewPage() {
  return (
    <section>
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 8, fontSize: "1.6rem" }}>总览看板</h3>
        <p style={{ margin: 0, color: "#a1a1aa", lineHeight: 1.6 }}>
          一期仅展示导航和空态模块，确认整体布局、路由结构与视觉基调可用。
        </p>
      </div>
      <div style={gridStyle}>
        {metricCards.map((card) => (
          <article key={card.label} style={cardStyle}>
            <div style={{ color: "#a1a1aa", fontSize: "0.92rem" }}>{card.label}</div>
            <div style={{ marginTop: 12, fontSize: "1.9rem", fontWeight: 700 }}>{card.value}</div>
            <p style={{ marginTop: 10, marginBottom: 0, color: "#d4d4d8", lineHeight: 1.5 }}>{card.hint}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
