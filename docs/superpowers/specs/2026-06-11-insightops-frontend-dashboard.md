# InsightOps 前端看板接入实现设计方案

## 1. 背景与目标

### 1.1 项目背景

InsightOps 一期已完成后端数据底座建设（FastAPI + MySQL + Zabbix 只读接入 + RDP 接入 + 闲置分析），前端已搭建 React + Vite + shadcn/ui 骨架与 4 个空态页面。二期在此基础上为 4 个页面接入真实后端数据，补齐图表可视化与数据表格。

### 1.2 二期范围

- 扩充 API 客户端，覆盖所有后端查询接口
- 总览看板：展示资产总数、闲置数、今日 RDP 登录数、系统状态 4 个指标卡片
- RDP 登录趋势：recharts 折线图 + 日/周/月粒度切换
- 闲置资源清单：shadcn/ui 表格展示 + CSV 导出按钮
- 虚机基础信息：可搜索的 shadcn/ui 表格
- 新增 shadcn/ui 组件：table、input、select
- 新增 recharts 图表库

### 1.3 范围外事项

- 服务端分页查询（数据量小，一期客户端过滤足够）
- 复杂筛选组合（后续按需扩展）
- UI 主题定制与高保真视觉打磨

## 2. 后端接口依赖

| 接口 | 方法 | 用途 | 页面 |
|------|------|------|------|
| `/health` | GET | 系统健康状态 | 总览看板 |
| `/api/assets` | GET | 虚机资产列表 | 总览看板（计数）、虚机资产页 |
| `/api/v1/idle` | GET | 闲置快照列表 | 总览看板（计数）、闲置清单页 |
| `/api/v1/rdp/trends?granularity=day|week|month` | GET | RDP 趋势数据 | 总览看板（当日计数）、RDP 趋势页 |
| `/api/v1/idle/export` | GET | CSV 文件下载 | 闲置清单页 |

## 3. 前端架构设计

### 3.1 API 客户端扩充

在现有 `apiFetch` 基础上新增类型定义与接口函数：

- `getHealth()` → `{ status: string }`
- `getVmAssets()` → `{ items: VmAsset[] }`
- `getIdleSnapshots()` → `{ items: IdleSnapshot[] }`
- `getRdpTrends(granularity)` → `{ code: 0, data: { granularity, series: [{date, count}] } }`

所有接口复用统一的 `apiFetch<T>` 泛型方法，错误统一处理。

### 3.2 页面设计

#### 总览看板 (OverviewPage)

4 个指标卡片横向排列，使用 shadcn/ui Card 组件：

| 卡片 | 数据来源 | 计算方式 |
|------|----------|----------|
| 虚机资产 | `/api/assets` | `items.length` |
| 闲置资源 | `/api/v1/idle` | `items.length` |
| 今日 RDP 登录 | `/api/v1/rdp/trends?granularity=day` | `series[last].count` |
| 系统状态 | `/health` | `status === "ok"` |

#### RDP 登录趋势 (RdpTrendPage)

- 顶部粒度切换按钮组（日/周/月）
- 主体为 recharts `LineChart`，纵轴为登录次数，横轴为日期
- 切换粒度时重新请求接口
- 数据为空时显示空态提示

#### 闲置资源清单 (IdleAssetsPage)

- shadcn/ui `Table` 展示，列：IP、所属部门、负责人、闲置天数、回收等级、最后登录时间
- 右上角 CSV 导出按钮，直接链向 `/api/v1/idle/export`
- 空数据时显示空态提示

#### 虚机基础信息 (VmAssetsPage)

- 顶部搜索输入框（按 IP 或主机名客户端过滤）
- shadcn/ui `Table` 展示，列：IP、主机名、部门、负责人、操作系统、状态、最后活跃时间
- 搜索时实时过滤表格行

### 3.3 新增依赖

```json
{
  "dependencies": {
    "recharts": "^2.15.0"
  }
}
```

以及 shadcn/ui 组件：`table`、`input`、`select`。

## 4. 错误处理

- 网络请求失败时页面显示友好错误提示，不崩溃
- 使用 React 状态管理 loading/error/success 三态
- 每个页面独立加载，互不影响

## 5. 文件变更清单

### 修改文件

- `frontend/src/lib/api.ts` — 扩充 API 客户端
- `frontend/src/pages/OverviewPage.tsx` — 接入数据 + 指标卡片
- `frontend/src/pages/RdpTrendPage.tsx` — 接入数据 + recharts 折线图
- `frontend/src/pages/IdleAssetsPage.tsx` — 接入数据 + 表格 + 导出
- `frontend/src/pages/VmAssetsPage.tsx` — 接入数据 + 搜索 + 表格
- `frontend/src/App.tsx` — 可选更新
- `frontend/package.json` — 新增 recharts 依赖

### 新增文件

- `frontend/src/types/api.ts` — 可选的类型定义文件（或内联在 api.ts 中）

## 6. 验证标准

- `npm run build` 通过，无 TypeScript 错误
- 4 个页面均能加载并显示数据（或正确的空态/错误态）
- RDP 趋势图支持日/周/月切换
- 闲置清单 CSV 导出可下载
- 虚机资产搜索可实时过滤
