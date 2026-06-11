# InsightOps Stitch UI 重构设计方案

## 1. 背景与目标

### 1.1 项目背景

InsightOps 前端已完成二期数据接入（4 个页面的数据表格与图表），但 UI 视觉仍是一期骨架风格。通过 stitch 工具产出了一套完整的"Obsidian Metric"设计系统，包含 OLED 优化的暗色主题、玻璃质感卡片、微边框层次和高密度数据呈现范式。

### 1.2 目标

- 将现有前端 UI 全面升级为 stitch "Obsidian Metric" 设计系统
- 按照 stitch 的页面结构重新组织导航：仪表盘、设备管理、告警中心、日志分析、系统设置
- 保留现有后端数据能力，以新的视觉语义呈现

## 2. 设计系统

### 2.1 颜色系统

采用 Obsidian Metric 暗色主题（OLED 优化），基于 Material Design 3 色板：

- `surface` / `background`: `#131315`（深灰，非纯黑）
- `surface-container`: `#201f22` → equivalent `hsl(224 44% 11%)`
- `surface-container-low`: `#1c1b1d`
- `surface-container-high`: `#2a2a2c`
- `surface-container-highest`: `#353437`
- `primary`: `#3b82f6` → Material 色板 `#adc6ff`
- `primary-container`: `#4d8eff`
- `secondary`: `#b7c8e1`
- `tertiary`: `#ffb786`（橙色强调）
- `error`: `#ffb4ab`
- `on-surface`: `#e5e1e4`
- `on-surface-variant`: `#c2c6d6`
- `outline`: `#8c909f`
- `outline-variant`: `#424754`

### 2.2 排版

- 全局字体：Inter（fallback: system-ui, sans-serif）
- data-mono：JetBrains Mono（设备 ID、IP 等数据展示）
- display：36px/700/1.2/-0.02em
- headline-lg：28px/600/1.3
- headline-md：20px/600/1.4
- body-lg：16px/400/1.7
- body-md：14px/400/1.6
- label-md：12px/500/1.5/0.01em
- data-mono：14px/400/1.6

### 2.3 间距

- 基准单位：4px
- 容器内边距：24px
- gutter：16px
- stack-lg：32px
- stack-md：16px
- stack-sm：8px

### 2.4 层次与质感

- 层级 0（背景）：`#09090b`，全局背景
- 层级 1（卡片/面板）：`hsl(224 44% 11%)`，0.5px `hsla(217, 32%, 60%, 0.08)` 微边框
- 层级 2（模态/提示）：同上 + `backdrop-blur-xl` + 更亮边框
- 不采用传统阴影，改用微边框和色调分层来表达层次

## 3. 布局结构

### 3.1 整体布局

```
┌──────────┬───────────────────────────────────────────┐
│          │  TopNavBar（h-16）                          │
│  Sidebar │  健康状态标签 │ 分隔线 │ 实时时钟 │ 通知 │ 用户 │
│  w-64    ├───────────────────────────────────────────┤
│  固定     │                                           │
│          │        Main Content Area                   │
│  Brand   │        p-container-padding                 │
│  导航链接 │        space-y-gutter                     │
│  帮助     │                                           │
│  个人中心 │                                           │
└──────────┴───────────────────────────────────────────┘
```

### 3.2 Sidebar（左侧导航）

- 宽度：w-64（256px）
- 品牌区：圆形图标 + InsightOps 标题 + "Infrastructure Monitoring" 副标题
- 导航链接：5 个条目
  - 仪表盘（dashboard 图标）— active 时高亮 primary-container 背景 + 左边框
  - 设备管理（router 图标）
  - 告警中心（notifications_active 图标）
  - 日志分析（analytics 图标）
  - 系统设置（settings 图标）
- 底部：帮助中心、个人中心

### 3.3 TopNavBar

- 高度：h-16（64px）
- 左侧：健康状态标签（health_and_safety 图标 + "系统健康状况: 良好"），分隔线，实时时钟
- 右侧：通知按钮（未读红点）、应用网格按钮、用户头像 + "Admin" 标签

## 4. 页面设计

### 4.1 仪表盘（OverviewPage）

三区布局：

**区域 1：KPI 指标卡（4 列 grid）**

| 卡片 | 数据来源 | 显示 | 进度条 |
|------|----------|------|--------|
| 虚机总数 | `GET /api/assets` → items.length | 数字 | 闲置占比 = 闲置数/总数 |
| 闲置资源 | `GET /api/v1/idle` → items.length | 数字 | 占已用比 |
| 今日 RDP 登录 | `GET /api/v1/rdp/trends?granularity=day` → 末点 login_count | 数字 | 占参考阈值比 |
| 系统状态 | `GET /health` | "正常"/"异常" | 100% 或 0% |

卡片样式：glass-panel（hsl(224 44% 11%) + 0.5px 微边框 + 圆角）、图标右上角、数字 display 字号、百分比 progress bar。

**区域 2：系统资源趋势（折线面积图）**

- recharts `AreaChart`，渐变填充（`#adc6ff` 10% → transparent）
- X 轴：日期（bucket），Y 轴：登录次数（login_count）
- 右上角粒度切换按钮组：日 / 周 / 月
- 数据来源：`GET /api/v1/rdp/trends?granularity=...`

**区域 3：底部双栏（2 列 grid）**

左栏 — **最新告警**：
- 标题栏："campaign" 图标 + "最新告警" + "查看全部" 链接
- 列表项：圆点指示器（error=红、tertiary=橙）+ 标题 + 描述 + 等级标签标签
- 数据来源：`GET /api/v1/idle`，high 为 Critical，medium 为 Warning
- mock 一条系统级健康提示

右栏 — **设备连接状态**：
- 标题栏："hub" 图标 + "设备连接状态" + "X 在线" 计数
- 表格：设备 ID(IP) / 地理位置(部门·实验室) / 延迟(最后活跃) / 状态(active=Connected/green)
- 数据来源：`GET /api/assets`

### 4.2 设备管理（DeviceManagementPage）

- 搜索框（按 IP/主机名过滤）+ 操作按钮区
- shadcn/ui Table 展示：IP / 主机名 / 部门·实验室 / 操作系统 / 状态(带圆点) / 最后活跃
- 底部在线计数

### 4.3 告警中心（AlertsCenterPage）

- 顶部筛选按钮组：全部 / 严重 / 警告
- 告警列表：等级圆点 + 标题 + 描述信息 + 时间
- 右下 CSV 导出按钮
- 数据来源：`GET /api/v1/idle`，按 recycle_level 筛选

### 4.4 日志分析（LogAnalysisPage）

- 占位页面，提示"日志分析功能即将上线"
- 保持 stitch 视觉风格

### 4.5 系统设置（SystemSettingsPage）

- 占位页面，提示"系统设置功能即将上线"
- 保持 stitch 视觉风格

## 5. 导航与路由映射

| 导航 | 路由 | 数据来源 |
|------|------|----------|
| 仪表盘 | /dashboard | `/api/assets`, `/api/v1/idle`, `/api/v1/rdp/trends`, `/health` |
| 设备管理 | /devices | `/api/assets` |
| 告警中心 | /alerts | `/api/v1/idle`, `/api/v1/idle/export` |
| 日志分析 | /logs | 占位 |
| 系统设置 | /settings | 占位 |

## 6. 文件变更清单

### 修改文件

- `frontend/src/index.css` — 更新颜色变量、新增 glass/micro-border 样式、Material Symbols 字体
- `frontend/src/App.tsx` — 更新路由结构
- `frontend/src/components/layout/AppShell.tsx` — 重构为 Sidebar + TopNavBar 布局
- `frontend/src/pages/OverviewPage.tsx` — 完全重写为 stitch 仪表盘风格
- `frontend/src/lib/api.ts` — 可选扩展已有函数

### 新建文件

- `frontend/src/pages/DeviceManagementPage.tsx` — 设备管理页
- `frontend/src/pages/AlertsCenterPage.tsx` — 告警中心页
- `frontend/src/pages/LogAnalysisPage.tsx` — 日志分析占位页
- `frontend/src/pages/SystemSettingsPage.tsx` — 系统设置占位页

### 删除/归档

- `frontend/src/pages/RdpTrendPage.tsx` — 功能合并到仪表盘
- `frontend/src/pages/IdleAssetsPage.tsx` — 功能迁移到告警中心
- `frontend/src/pages/VmAssetsPage.tsx` — 功能迁移到设备管理

## 7. 验证标准

- `npm run build` 通过，无 TypeScript 错误
- Sidebar 导航 5 个条目可点击，路由正确
- 仪表盘 4 个 KPI 卡片加载后端数据并显示
- 趋势折线图正常渲染，粒度切换有效
- 告警中心和设备管理页面展示正确数据
- 响应式布局在 768px 和 480px 断点正常
