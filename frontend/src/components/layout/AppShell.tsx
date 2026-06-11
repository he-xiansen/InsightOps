import type { CSSProperties, ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";

export type AppNavItem = {
  to: string;
  label: string;
  description: string;
};

type AppShellProps = {
  navItems: AppNavItem[];
  children?: ReactNode;
};

const shellStyle: CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  gridTemplateColumns: "280px minmax(0, 1fr)",
  backgroundColor: "rgba(9, 9, 11, 0.82)",
};

const sidebarStyle: CSSProperties = {
  borderRight: "1px solid rgba(244, 244, 245, 0.08)",
  padding: "32px 20px",
  backdropFilter: "blur(14px)",
};

const brandStyle: CSSProperties = {
  margin: 0,
  fontSize: "1.5rem",
  fontWeight: 700,
};

const subtitleStyle: CSSProperties = {
  marginTop: 12,
  marginBottom: 0,
  color: "#a1a1aa",
  fontSize: "0.95rem",
  lineHeight: 1.5,
};

const navStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  marginTop: 28,
};

const mainStyle: CSSProperties = {
  padding: "32px",
};

const headerCardStyle: CSSProperties = {
  border: "1px solid rgba(244, 244, 245, 0.08)",
  borderRadius: 24,
  padding: 24,
  background: "linear-gradient(135deg, rgba(24, 24, 27, 0.96), rgba(23, 37, 84, 0.7))",
  boxShadow: "0 20px 45px rgba(0, 0, 0, 0.25)",
};

const contentStyle: CSSProperties = {
  marginTop: 24,
};

function getNavItemStyle(isActive: boolean): CSSProperties {
  return {
    display: "block",
    padding: "14px 16px",
    borderRadius: 18,
    border: isActive ? "1px solid rgba(96, 165, 250, 0.6)" : "1px solid rgba(244, 244, 245, 0.08)",
    background: isActive ? "rgba(30, 64, 175, 0.32)" : "rgba(24, 24, 27, 0.68)",
    color: "#fafafa",
    transition: "all 150ms ease",
  };
}

const navTitleStyle: CSSProperties = {
  fontSize: "0.98rem",
  fontWeight: 600,
};

const navDescriptionStyle: CSSProperties = {
  marginTop: 6,
  color: "#a1a1aa",
  fontSize: "0.88rem",
  lineHeight: 1.4,
};

export function AppShell({ navItems, children }: AppShellProps) {
  return (
    <div style={shellStyle}>
      <aside style={sidebarStyle}>
        <h1 style={brandStyle}>InsightOps</h1>
        <p style={subtitleStyle}>面向运维资产分析的一期前端骨架，先提供统一导航、空态页面和 API 接入位。</p>
        <nav aria-label="主导航" style={navStyle}>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} style={({ isActive }) => getNavItemStyle(isActive)}>
              <div style={navTitleStyle}>{item.label}</div>
              <div style={navDescriptionStyle}>{item.description}</div>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main style={mainStyle}>
        <section style={headerCardStyle}>
          <div
            style={{
              color: "#93c5fd",
              fontSize: "0.8rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            shadcn style skeleton
          </div>
          <h2 style={{ margin: "12px 0 8px", fontSize: "1.9rem" }}>统一布局与页面容器</h2>
          <p style={{ margin: 0, color: "#d4d4d8", lineHeight: 1.6 }}>
            当前阶段只搭建可扩展的页面骨架，后续趋势图、明细表格和筛选表单可以直接挂接到对应路由。
          </p>
        </section>
        <section style={contentStyle}>{children ?? <Outlet />}</section>
      </main>
    </div>
  );
}
