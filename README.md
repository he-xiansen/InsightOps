# InsightOps — 基础设施运维监控平台

InsightOps 是一个面向 IT 基础设施的运维监控平台，集成 **Zabbix 性能数据采集**、**Windows RDP 登录审计**、**闲置资源回收分析** 和 **AI 辅助决策** 等功能，帮助运维团队实时掌握资产状态，发现并回收闲置资源。

## 功能特性

- **仪表盘总览** — 虚机总数、闲置资源、RDP 登录趋势、系统状态一目了然
- **设备管理** — 主机资产清单管理，支持搜索、筛选、分页
- **RDP 登录审计** — 采集 Windows 远程桌面登录事件，追踪闲置天数
- **性能监控** — 从 Zabbix 数据库同步 CPU / 内存数据，支持趋势图、分布饼图、使用率排行
- **闲置资源分析** — 自动计算闲置等级（高 / 中 / 低），支持 AI 生成回收建议
- **告警中心** — 闲置超期告警，按等级归类展示
- **系统设置** — LLM API Key / Endpoint / Model 配置，Zabbix 采集 IP 段过滤

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS + ECharts |
| 后端 | Python 3.11 + FastAPI + SQLAlchemy 2.0 + Pydantic |
| 数据库 | MySQL 8.0 |
| 监控源 | Zabbix 6 (trends 表) |
| 部署 | Docker Compose |

## 项目结构

```
InsightOps/
├── backend/                  # FastAPI 后端
│   └── app/
│       ├── api/routes/       # API 路由
│       ├── bootstrap/        # 数据库初始化
│       ├── collector/        # Zabbix 采集逻辑
│       ├── core/             # 配置、数据库连接、安全
│       ├── models/           # SQLAlchemy 模型
│       ├── repositories/     # 数据仓储层
│       ├── schemas/          # Pydantic 数据模型
│       ├── services/         # 业务逻辑
│       └── tasks/            # 定时任务（闲置分析、性能采集）
├── frontend/                 # React 前端
│   └── src/
│       ├── lib/              # API 封装、工具函数
│       └── pages/            # 页面组件
├── deploy/                   # 部署文件
│   ├── docker-compose.yml    # 主 Docker Compose
│   ├── Dockerfile.api        # 后端镜像
│   ├── Dockerfile.frontend   # 前端镜像
│   ├── Dockerfile.collector  # 采集器镜像
│   ├── setup_rdp_collector.bat     # Windows RDP 采集安装脚本
│   └── neone-rdp-collector.ps1     # RDP 采集 PowerShell 脚本
└── zabbix6/                  # Zabbix Docker 部署（可选）
    └── docker-compose.yml
```

## 快速部署

### 前置条件

- Docker + Docker Compose
- Zabbix 6 数据库（可选，不配置则无法使用性能监控功能）

### 1. 克隆仓库

```bash
git clone https://github.com/he-xiansen/InsightOps.git
cd InsightOps
```

### 2. 配置环境变量

```bash
# 后端 API 端口（默认 8000）
export API_PORT=8000

# 前端端口（默认 8080）
export FRONTEND_PORT=8080

# 项目数据库
export PROJECT_DB_HOST=insightops-mysql
export PROJECT_DB_USER=insightops
export PROJECT_DB_PASSWORD=insightops
export PROJECT_DB_NAME=insightops

# Zabbix 数据库（如不配置则跳过性能采集）
export ZABBIX_DB_HOST=zabbix-mysql
export ZABBIX_DB_PORT=3306
export ZABBIX_DB_USER=readonly
export ZABBIX_DB_PASSWORD=readonly
export ZABBIX_DB_NAME=zabbix
```

### 3. 启动服务

```bash
cd deploy
docker compose up -d
```

首次启动会自动初始化数据库表结构。

### 4. 访问

- 前端页面: `http://localhost:8080`
- API 文档: `http://localhost:8000/docs`

### 5. 初始化数据

启动后可通过 API 导入主机资产数据：

```bash
curl -X POST http://localhost:8000/api/assets/bulk-upsert \
  -H "Content-Type: application/json" \
  -d '{ "items": [ { "ip": "192.168.1.1", "hostname": "server-01", "owner": "张三", "department": "技术部" } ] }'
```

## Windows RDP 采集

在需要审计远程桌面登录的 Windows 主机上执行：

```bash
# 以管理员身份运行
deploy\setup_rdp_collector.bat
```

脚本会自动安装计划任务，每 5 分钟采集一次 RDP 登录事件并上报至平台 API。

## 采集任务

collector 容器支持以下定时任务（通过 `COLLECTOR_TASK` 环境变量切换）：

| 任务名 | 说明 | 默认间隔 |
|---|---|---|
| `idle_analysis` | 闲置资源分析 | 每 30 分钟 |
| `perf_collect` | 从 Zabbix 同步 CPU/内存数据 | 每 10 分钟 |
| `zabbix_host_sync` | 同步 Zabbix 主机映射 | 每 30 分钟 |

## 系统设置

在 Web 界面 `系统设置` 页面可以配置：

- **LLM API Key / Endpoint / Model** — 用于 AI 回收建议功能
- **性能采集 IP 段过滤** — 限定从 Zabbix 采集哪些 IP 段的数据

## License

MIT
