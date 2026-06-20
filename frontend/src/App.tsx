import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell, type AppNavItem } from "./components/layout/AppShell";
import { AlertsCenterPage } from "./pages/AlertsCenterPage";
import { DeviceManagementPage } from "./pages/DeviceManagementPage";
import { LogAnalysisPage } from "./pages/LogAnalysisPage";
import { HostDetailPage } from "./pages/HostDetailPage";
import { LoginPage } from "./pages/LoginPage";
import { OverviewPage } from "./pages/OverviewPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SystemSettingsPage } from "./pages/SystemSettingsPage";
import { HelpPage } from "./pages/HelpPage";

const navItems: AppNavItem[] = [
  { to: "/dashboard", label: "仪表盘", icon: "dashboard" },
  { to: "/devices", label: "设备管理", icon: "router", requireAdmin: true },
  { to: "/alerts", label: "告警中心", icon: "notifications_active" },
  { to: "/logs", label: "日志分析", icon: "analytics" },
  { to: "/settings", label: "系统设置", icon: "settings", requireAdmin: true },
];

function isAuthenticated() {
  return !!localStorage.getItem("token");
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAdmin = localStorage.getItem("is_admin") === "true";
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppShell navItems={navItems} />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<OverviewPage />} />
        <Route
          path="/devices"
          element={<AdminRoute><DeviceManagementPage /></AdminRoute>}
        />
        <Route path="/alerts" element={<AlertsCenterPage />} />
        <Route path="/logs" element={<LogAnalysisPage />} />
        <Route
          path="/settings"
          element={<AdminRoute><SystemSettingsPage /></AdminRoute>}
        />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/host/:ip" element={<HostDetailPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
