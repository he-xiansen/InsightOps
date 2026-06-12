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
