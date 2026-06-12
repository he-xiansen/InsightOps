import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";

import { getHealth } from "@/lib/api";

export type AppNavItem = {
  to: string;
  label: string;
  icon: string;
};

type AppShellProps = {
  navItems: AppNavItem[];
};

function useHealth() {
  const [status, setStatus] = useState<string>("检查中");
  useEffect(() => {
    getHealth()
      .then((res) => setStatus(res.status === "ok" ? "良好" : "异常"))
      .catch(() => setStatus("异常"));
  }, []);
  return status;
}

function Clock() {
  const [time, setTime] = useState(new Date().toISOString().replace("T", " ").substring(0, 19));
  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toISOString().replace("T", " ").substring(0, 19));
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-data-mono text-data-mono tabular-nums">{time}</span>;
}

export function AppShell({ navItems }: AppShellProps) {
  const healthStatus = useHealth();

  return (
    <div className="min-h-screen bg-background/80">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface border-r border-outline-variant flex flex-col z-[60]">
        {/* Brand Header */}
        <div className="px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-xl">insights</span>
            </div>
            <div>
              <h1 className="text-headline-md font-bold text-on-surface leading-tight">InsightOps</h1>
              <p className="text-label-md text-on-surface-variant opacity-70">Infrastructure Monitoring</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded transition-colors ${
                  isActive
                    ? "bg-primary-container text-on-primary-container border-l-4 border-primary"
                    : "text-on-surface-variant hover:bg-white/[0.04]"
                }`
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-body-md">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-6 border-t border-outline-variant space-y-1">
          <a className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:bg-white/[0.04] transition-colors rounded" href="#">
            <span className="material-symbols-outlined">help</span>
            <span className="text-label-md">帮助中心</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:bg-white/[0.04] transition-colors rounded" href="#">
            <span className="material-symbols-outlined">account_circle</span>
            <span className="text-label-md">个人中心</span>
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 min-h-screen flex flex-col">
        {/* TopNavBar */}
        <header className="sticky top-0 z-50 h-16 bg-surface border-b border-outline-variant flex justify-between items-center px-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-surface-container px-3 py-1.5 rounded micro-border gap-2">
              <span className="material-symbols-outlined text-sm text-primary">health_and_safety</span>
              <span className="text-label-md text-primary">系统健康状况: {healthStatus}</span>
            </div>
            <div className="h-4 w-px bg-outline-variant" />
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-lg">schedule</span>
              <Clock />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button className="p-2 rounded hover:bg-white/[0.04] transition-all text-on-surface-variant">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border border-surface" />
            </div>
            <button className="p-2 rounded hover:bg-white/[0.04] transition-all text-on-surface-variant">
              <span className="material-symbols-outlined">apps</span>
            </button>
            <div className="flex items-center gap-3 pl-2 border-l border-outline-variant">
              <span className="text-label-md font-bold text-primary">Admin</span>
              <div className="w-8 h-8 rounded-full bg-primary-container border border-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-sm text-on-primary-container">person</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6 space-y-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
