import type { CSSProperties } from "react";

const wrapperStyle: CSSProperties = {
  borderRadius: 20,
  border: "1px solid rgba(244, 244, 245, 0.08)",
  background: "rgba(24, 24, 27, 0.82)",
  padding: 24,
};

const listStyle: CSSProperties = {
  margin: "18px 0 0",
  paddingLeft: 18,
  color: "#d4d4d8",
  lineHeight: 1.8,
};

export function VmAssetsPage() {
  return (
    <section style={wrapperStyle}>
      <h3 style={{ marginTop: 0, marginBottom: 10, fontSize: "1.6rem" }}>虚机基础信息</h3>
      <p style={{ margin: 0, color: "#a1a1aa", lineHeight: 1.6 }}>
        该页面预留虚机名称、IP、所属人、规格和同步状态等基础字段展示，当前保持轻量空态骨架。
      </p>
      <ul style={listStyle}>
        <li>资产清单表格占位</li>
        <li>搜索与筛选栏占位</li>
        <li>同步状态标签占位</li>
      </ul>
    </section>
  );
}
