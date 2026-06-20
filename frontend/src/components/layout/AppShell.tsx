import type { ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

import { getHealth } from "@/lib/api";

export type AppNavItem = {
  to: string;
  label: string;
  icon: string;
  requireAdmin?: boolean;
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

function useAvatar() {
  const [avatarUrl, setAvatarUrl] = useState("");
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const load = async () => {
      try {
        const res = await fetch("/api/v1/auth/me", { headers: { Authorization: `Bearer ${token}` } });
        if (res.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("username");
          window.location.href = "/login";
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (data.avatar) {
            setAvatarUrl(data.avatar);
            return;
          }
        }
      } catch {}
      const cached = localStorage.getItem("avatar");
      if (cached) setAvatarUrl(cached);
    };
    load();
  }, []);
  return avatarUrl;
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

function isAdmin() {
  return localStorage.getItem("is_admin") === "true";
}

export function AppShell({ navItems }: AppShellProps) {
  const navigate = useNavigate();
  const healthStatus = useHealth();
  const avatarUrl = useAvatar();
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const [showAboutDetail, setShowAboutDetail] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Toggle popover on click
  const togglePopover = (name: string) => {
    setActivePopover(prev => prev === name ? null : name);
  };

  // Show on hover
  const showPopover = (name: string) => {
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
    setActivePopover(name);
  };

  // Hide on mouse leave (with delay)
  const scheduleHide = () => {
    hoverTimerRef.current = setTimeout(() => {
      setActivePopover(null);
    }, 200);
  };

  const cancelHide = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const closePopover = () => setActivePopover(null);

  // Click outside to close
  useEffect(() => {
    if (!activePopover) return;
    const handler = (e: MouseEvent) => {
      // Don't close if clicking on a popover trigger button
      const target = e.target as HTMLElement;
      if (target.closest('[data-popover-trigger]') || target.closest('[data-popover-content]')) return;
      closePopover();
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [activePopover]);

  return (
    <div className="min-h-screen bg-background/80">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface border-r border-outline-variant flex flex-col z-[60]">
        {/* Brand Header */}
        <div className="px-6 py-8">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded flex items-center justify-center ${healthStatus === "良好" ? "bg-green-500 animate-pulse shadow-[0_0_12px_rgba(74,222,128,0.7)]" : "bg-red-500 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.7)]"}`}>
              <span className="material-symbols-outlined text-white text-xl">insights</span>
            </div>
            <div>
              <h1 className="text-headline-md font-bold text-on-surface leading-tight">InsightOps</h1>
              <p className="text-label-md text-on-surface-variant opacity-70">Infrastructure Monitoring</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1">
          {navItems
            .filter(item => !item.requireAdmin || isAdmin())
            .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded transition-colors duration-200 ${
                  isActive
                    ? "bg-primary-container text-on-primary-container border-l-4 border-primary transition-opacity active:opacity-85"
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
          {/* 帮助中心 */}
          <div className="relative" onMouseEnter={() => showPopover("help")} onMouseLeave={scheduleHide}>
            <button
              onClick={() => togglePopover("help")}
              data-popover-trigger
              className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:bg-white/[0.04] transition-colors rounded w-full text-left"
            >
              <span className="material-symbols-outlined">help</span>
              <span className="text-label-md">帮助中心</span>
            </button>
            <div data-popover-content onMouseEnter={cancelHide} onMouseLeave={scheduleHide} className={`absolute left-4 bottom-full mb-2 w-44 bg-surface-container-high border border-outline-variant rounded-xl shadow-2xl transition-all duration-200 z-50 overflow-hidden ${activePopover === "help" ? "opacity-100 visible" : "opacity-0 invisible"}`}>
              <div className="p-2">
                <div className="px-3 py-2 flex items-center gap-2 text-primary font-medium text-label-md">
                  <span className="material-symbols-outlined text-lg">help</span>
                  帮助中心
                </div>
                <div className="mt-1 space-y-0.5">
                  <div
                    onClick={() => { navigate("/help"); closePopover(); }}
                    className="px-3 py-2 flex items-center gap-2 hover:bg-white/[0.06] rounded-lg cursor-pointer transition-colors text-on-surface-variant"
                  >
                    <span className="material-symbols-outlined text-sm text-primary">menu_book</span>
                    <span className="text-label-md">使用文档</span>
                  </div>
                  <div
                    onClick={() => setShowAboutDetail(prev => !prev)}
                    className={`px-3 py-2 flex items-center gap-2 hover:bg-white/[0.06] rounded-lg cursor-pointer transition-colors ${showAboutDetail ? "text-primary bg-white/[0.06]" : "text-on-surface-variant"}`}
                  >
                    <span className="material-symbols-outlined text-sm text-on-surface-variant">info</span>
                    <span className="text-label-md">关于</span>
                  </div>
                </div>
              </div>
              {showAboutDetail && (
                <div className="border-t border-outline-variant px-3 py-2.5">
                  <div className="px-3 py-2 -mx-2">
                    <p className="text-label-md text-on-surface">InsightOps v2.1.0</p>
                    <p className="text-label-sm text-on-surface-variant text-xs">Build 2026.06</p>
                  </div>
                </div>
              )}
            </div>
          </div>
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
            {/* 通知中心 */}
            <div className="relative" onMouseEnter={() => showPopover("notifications")} onMouseLeave={scheduleHide}>
              <button
                onClick={() => togglePopover("notifications")}
                data-popover-trigger
                className="p-2 rounded-lg hover:bg-white/[0.06] transition-all text-on-surface-variant relative"
              >
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border-2 border-surface" />
              </button>
              <div data-popover-content onMouseEnter={cancelHide} onMouseLeave={scheduleHide} className={`absolute right-0 top-full mt-2 w-80 bg-surface-container-high border border-outline-variant rounded-xl shadow-2xl transition-all duration-200 z-50 overflow-hidden ${activePopover === "notifications" ? "opacity-100 visible" : "opacity-0 invisible"}`}>
                <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between">
                  <h3 className="text-label-lg font-semibold text-on-surface">通知</h3>
                  <span className="text-xs bg-primary-container text-on-primary-container px-2 py-0.5 rounded-full font-medium">3 条未读</span>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  <div className="px-4 py-3 border-b border-outline-variant/40 hover:bg-white/[0.04] cursor-pointer transition-colors">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-error text-lg mt-0.5">error</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-label-md text-on-surface truncate">CPU 使用率超过阈值</p>
                        <p className="text-label-sm text-on-surface-variant text-xs mt-0.5">主机 prod-web-01 的 CPU 使用率达到 92%</p>
                        <p className="text-xs text-outline mt-1">2 分钟前</p>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-error flex-shrink-0 mt-1.5" />
                    </div>
                  </div>
                  <div className="px-4 py-3 border-b border-outline-variant/40 hover:bg-white/[0.04] cursor-pointer transition-colors">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-tertiary text-lg mt-0.5">warning</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-label-md text-on-surface truncate">磁盘空间不足</p>
                        <p className="text-label-sm text-on-surface-variant text-xs mt-0.5">主机 db-master-03 磁盘使用率 85%</p>
                        <p className="text-xs text-outline mt-1">15 分钟前</p>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-tertiary flex-shrink-0 mt-1.5" />
                    </div>
                  </div>
                  <div className="px-4 py-3 hover:bg-white/[0.04] cursor-pointer transition-colors">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-green-400 text-lg mt-0.5">check_circle</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-label-md text-on-surface truncate">系统更新完成</p>
                        <p className="text-label-sm text-on-surface-variant text-xs mt-0.5">InsightOps 已成功更新至 v2.1.0</p>
                        <p className="text-xs text-outline mt-1">1 小时前</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-t border-outline-variant px-4 py-2.5">
                  <a href="/alerts" className="text-label-md text-primary hover:underline text-center block">
                    查看全部通知 →
                  </a>
                </div>
              </div>
            </div>

            {/* 应用菜单 */}
            <div className="relative" onMouseEnter={() => showPopover("apps")} onMouseLeave={scheduleHide}>
              <button
                onClick={() => togglePopover("apps")}
                data-popover-trigger
                className="p-2 rounded-lg hover:bg-white/[0.06] transition-all text-on-surface-variant"
              >
                <span className="material-symbols-outlined">apps</span>
              </button>
              <div data-popover-content onMouseEnter={cancelHide} onMouseLeave={scheduleHide} className={`absolute right-0 top-full mt-2 w-64 bg-surface-container-high border border-outline-variant rounded-xl shadow-2xl transition-all duration-200 z-50 overflow-hidden ${activePopover === "apps" ? "opacity-100 visible" : "opacity-0 invisible"}`}>
                <div className="p-3 grid grid-cols-3 gap-2">
                  <a href="/dashboard" className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-white/[0.06] transition-colors">
                    <span className="material-symbols-outlined text-2xl text-primary">dashboard</span>
                    <span className="text-xs text-on-surface-variant">仪表盘</span>
                  </a>
                  {isAdmin() && (
                    <a href="/devices" className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-white/[0.06] transition-colors">
                      <span className="material-symbols-outlined text-2xl text-primary">router</span>
                      <span className="text-xs text-on-surface-variant">设备管理</span>
                    </a>
                  )}
                  <a href="/alerts" className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-white/[0.06] transition-colors">
                    <span className="material-symbols-outlined text-2xl text-error">notifications_active</span>
                    <span className="text-xs text-on-surface-variant">告警中心</span>
                  </a>
                  <a href="/logs" className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-white/[0.06] transition-colors">
                    <span className="material-symbols-outlined text-2xl text-primary">analytics</span>
                    <span className="text-xs text-on-surface-variant">日志分析</span>
                  </a>
                  {isAdmin() && (
                    <a href="/settings" className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-white/[0.06] transition-colors">
                      <span className="material-symbols-outlined text-2xl text-primary">settings</span>
                      <span className="text-xs text-on-surface-variant">系统设置</span>
                    </a>
                  )}
                  <a href="/profile" className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-white/[0.06] transition-colors">
                    <span className="material-symbols-outlined text-2xl text-primary">person</span>
                    <span className="text-xs text-on-surface-variant">个人中心</span>
                  </a>
                </div>
                <div className="border-t border-outline-variant px-4 py-2.5">
                  <button className="flex items-center gap-2 text-label-sm text-on-surface-variant hover:text-on-surface transition-colors w-full">
                    <span className="material-symbols-outlined text-sm">grid_view</span>
                    查看更多应用
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 pl-2 border-l border-outline-variant">
            {localStorage.getItem("token") ? (
              <div className="relative group">
                <div className="flex items-center gap-2 cursor-pointer">
                  <span className="text-label-md font-bold text-primary">{localStorage.getItem("username") || "用户"}</span>
                  <div className="w-8 h-8 rounded-full bg-primary-container border border-primary/20 flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLElement).style.display = "none"; }} />
                    ) : (
                      <span className="material-symbols-outlined text-sm text-on-primary-container">person</span>
                    )}
                  </div>
                </div>
                <div className="absolute right-0 top-full mt-1 w-40 bg-surface border border-outline-variant rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="py-1">
                    <a href="/profile" className="block px-4 py-2 text-label-md text-on-surface-variant hover:bg-white/[0.04] flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">person</span>
                      个人中心
                    </a>
                    {isAdmin() && (
                      <a href="/settings" className="block px-4 py-2 text-label-md text-on-surface-variant hover:bg-white/[0.04] flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">settings</span>
                        系统设置
                      </a>
                    )}
                    <hr className="border-outline-variant my-1" />
                    <button
                      onClick={() => { localStorage.clear(); window.location.href = "/login"; }}
                      className="w-full text-left px-4 py-2 text-label-md text-error hover:bg-white/[0.04] flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">logout</span>
                      退出登录
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <a href="/login" className="text-label-md text-primary hover:underline font-semibold">登录 / 注册</a>
            )}
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
