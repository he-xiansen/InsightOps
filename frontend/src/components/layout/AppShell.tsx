import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type AppNavItem = {
  to: string;
  label: string;
  description: string;
};

type AppShellProps = {
  navItems: AppNavItem[];
  children?: ReactNode;
};

export function AppShell({ navItems, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background/80">
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-border/70 bg-background/30 p-5 backdrop-blur lg:border-b-0 lg:border-r">
          <Card className="border-primary/20 bg-card/70">
            <CardHeader className="space-y-3">
              <Badge className="w-fit" variant="secondary">
                shadcn/ui minimal stack
              </Badge>
              <CardTitle className="text-3xl">InsightOps</CardTitle>
              <CardDescription className="text-sm leading-6">
                面向运维资产分析的一期前端骨架，保留统一导航、空态页面和 API 接入位。
              </CardDescription>
            </CardHeader>
          </Card>
          <nav aria-label="主导航" className="mt-6 grid gap-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "block rounded-2xl border px-4 py-3 transition-colors",
                  isActive
                    ? "border-primary/50 bg-primary/15 shadow-shell"
                    : "border-border/80 bg-card/60 hover:border-primary/30 hover:bg-accent/10",
                )
              }
            >
              <div className="text-sm font-semibold text-foreground">{item.label}</div>
              <div className="mt-1 text-sm leading-5 text-muted-foreground">{item.description}</div>
            </NavLink>
          ))}
          </nav>
        </aside>
        <main className="p-5 md:p-8">
          <Card className="border-primary/20 bg-gradient-to-br from-card via-card to-primary/10">
            <CardHeader className="gap-4">
              <Badge className="w-fit" variant="outline">
                shadcn/ui ready
              </Badge>
              <div>
                <CardTitle>统一布局与页面容器</CardTitle>
                <CardDescription className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                  当前阶段只搭建可扩展的页面骨架，后续趋势图、明细表格和筛选表单可以直接挂接到对应路由。
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 pt-0 text-sm text-muted-foreground md:grid-cols-3">
              <div>四个导航入口保留</div>
              <div>空态页面继续可访问</div>
              <div>后续可直接增量添加更多 shadcn 组件</div>
            </CardContent>
          </Card>
          <section className="mt-6">{children ?? <Outlet />}</section>
        </main>
      </div>
    </div>
  );
}
