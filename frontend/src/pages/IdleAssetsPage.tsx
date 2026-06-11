import type { CSSProperties } from "react";

const sectionStyle: CSSProperties = {
  display: "grid",
  gap: 18,
};

const cardStyle: CSSProperties = {
  borderRadius: 20,
  border: "1px solid rgba(244, 244, 245, 0.08)",
  background: "rgba(24, 24, 27, 0.82)",
  padding: 24,
};

export function IdleAssetsPage() {
  return (
    <section style={sectionStyle}>
      <article style={cardStyle}>
        <h3 style={{ marginTop: 0, marginBottom: 10, fontSize: "1.6rem" }}>闲置资源清单</h3>
        <p style={{ margin: 0, color: "#a1a1aa", lineHeight: 1.6 }}>
          后续会在此展示闲置天数、负责人、回收等级和 CSV 导出入口。当前先提供页面占位和说明文案。
        </p>
      </article>
      <article style={cardStyle}>
        <div style={{ color: "#e4e4e7", fontWeight: 600 }}>空态说明</div>
        <p style={{ marginBottom: 0, color: "#d4d4d8", lineHeight: 1.6 }}>
          暂无闲置资源样本，待接入后端筛选与导出接口后展示表格内容。
        </p>
      </article>
    </section>
  );
}
