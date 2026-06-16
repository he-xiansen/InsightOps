# InsightOps v2 增强计划：性能分析 + ECharts 仪表盘 + AI 回收建议

## 背景

InsightOps 一期已完成数据底座、前端 Stitch UI 和基础资产/RDP/闲置分析功能。二期围绕三个方向增强：
1. 用 ECharts 替换 Recharts 并丰富仪表盘图表
2. 基于 Zabbix 监控数据综合判断主机闲置与性能冗余
3. 接入大模型（兼容 OpenAI API 格式）生成回收建议

## 一、后端增强

### 1.1 系统设置 API

**新增表**: `system_settings`（键值对存储 LLM 配置）

| 字段 | 类型 | 说明 |
|------|------|------|
| `key` | VARCHAR(128) PK | 配置键 |
| `value` | TEXT | JSON 值 |
| `updated_at` | DATETIME | 更新时间 |

**配置项**:
- `llm_endpoint`: API 地址（默认 https://api.deepseek.com）
- `llm_api_key`: API Key
- `llm_model`: 模型名（默认 deepseek-chat）

**新增接口**:
- `GET /api/v1/settings` — 获取所有设置（屏蔽 API Key 明文）
- `PUT /api/v1/settings` — 更新设置（需要 X-API-Key 鉴权）

### 1.2 主机性能聚合 API

从 Zabbix 数据库查询各主机的监控数据：

- `GET /api/v1/assets/perf` — 返回各主机的性能汇总
  - 从 `zabbix_host_mapping` 获取所有主机
  - 从 Zabbix `history` 表聚合 CPU/内存/网络指标
  - 从 `vm_rdp_logins` 获取最近登录时间
- 若无 Zabbix 趋势数据，降级为仅返回 RDP + 资产状态

### 1.3 AI 回收建议 API

- `POST /api/v1/ai/advice` — 传入主机数据，调用 LLM 生成建议
  - 请求体包含当前主机的闲置/性能数据
  - 调用 `system_settings` 中的 LLM 配置
  - 返回 markdown 格式的建议文本

## 二、前端增强

### 2.1 安装 ECharts
替换 recharts，使用 `echarts` + `echarts-for-react`

### 2.2 仪表盘重写
- 4 个 KPI 卡片保留（stich 风格不变）
- RDP 趋势区域图用 ECharts 重写
- 新增：**闲置等级分布环形图**（high/medium/low）
- 新增：**AI 回收建议卡片**（底部或右侧）
- 新增：**主机状态总览饼图**

### 2.3 设备管理页增强
- 增加闲置天数列
- 增加推荐操作列（保留/回收/关注）

### 2.4 系统设置页
- LLM 配置表单（Endpoint / API Key / Model）
- 测试连接按钮

## 三、文件变更清单

### 后端
- `backend/app/models/system_settings.py` — 新增模型
- `backend/app/repositories/system_settings_repository.py` — 新增
- `backend/app/services/system_settings_service.py` — 新增
- `backend/app/api/routes/settings.py` — 新增路由
- `backend/app/api/routes/ai.py` — 新增 AI 建议路由
- `backend/app/api/routes/assets.py` — 新增 perf 端点
- `backend/app/bootstrap/init_project_db.py` — 更新建表
- `backend/app/services/ai_advice_service.py` — LLM 调用服务
- `backend/app/core/database.py` — 新增 model import

### 前端
- `frontend/package.json` — echarts + echarts-for-react
- `frontend/src/lib/api.ts` — 新增接口
- `frontend/src/pages/OverviewPage.tsx` — ECharts 重写
- `frontend/src/pages/DeviceManagementPage.tsx` — 增强
- `frontend/src/pages/SystemSettingsPage.tsx` — 重写
- `frontend/src/pages/AlertsCenterPage.tsx` — 可选增强
