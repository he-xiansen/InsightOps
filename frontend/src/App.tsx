import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell, type AppNavItem } from "./components/layout/AppShell";
import { IdleAssetsPage } from "./pages/IdleAssetsPage";
import { OverviewPage } from "./pages/OverviewPage";
import { RdpTrendPage } from "./pages/RdpTrendPage";
import { VmAssetsPage } from "./pages/VmAssetsPage";

const navItems: AppNavItem[] = [
  {
    to: "/overview",
    label: "总览看板",
    description: "展示关键指标、健康检查和后续模块入口。",
  },
  {
    to: "/rdp-trend",
    label: "RDP 登录趋势",
    description: "预留趋势图、筛选器和时间粒度切换区域。",
  },
  {
    to: "/idle-assets",
    label: "闲置资源清单",
    description: "承接闲置识别、导出和回收建议的表格页。",
  },
  {
    to: "/vm-assets",
    label: "虚机基础信息",
    description: "展示资产属性、所属人和同步状态的占位页面。",
  },
];

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell navItems={navItems} />}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/rdp-trend" element={<RdpTrendPage />} />
        <Route path="/idle-assets" element={<IdleAssetsPage />} />
        <Route path="/vm-assets" element={<VmAssetsPage />} />
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Route>
    </Routes>
  );
}
