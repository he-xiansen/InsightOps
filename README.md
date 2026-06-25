# InsightOps — 基础设施运维监控平台

集成 Zabbix 性能数据、RDP 登录审计、闲置资源回收分析和 AI 辅助决策的运维监控平台。

## 功能

- **仪表盘** — 主机总数、闲置分布、CPU/内存排行、RDP 登录趋势
- **设备管理** — 主机资产清单，支持搜索、筛选、导入导出
- **性能监控** — 从 Zabbix 同步 CPU/内存数据
- **闲置分析** — 自动计算闲置等级，AI 生成回收建议
- **告警中心** — 闲置超期告警
- **系统设置** — LLM 配置、Zabbix 数据库连接、采集间隔
- **日志分析** — RDP 登录日志查询

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS + ECharts |
| 后端 | Python 3.11 + FastAPI + SQLAlchemy 2.0 |
| 数据库 | MySQL 8.0 |
| 监控源 | Zabbix 6（从 trends 表读 CPU/内存） |

## 项目结构

```
InsightOps/
├── backend/app/
│   ├── api/routes/       # API 路由
│   ├── bootstrap/        # 数据库初始化
│   ├── core/             # 配置、数据库连接
│   ├── models/           # SQLAlchemy 模型
│   ├── services/         # 业务逻辑
│   └── tasks/            # 定时任务（闲置分析、采集）
├── frontend/src/
│   ├── lib/              # API 封装
│   └── pages/            # 页面组件
├── deploy/
│   ├── Dockerfile.app              # 整合镜像
│   ├── docker-compose.offline.yml  # 离线部署（含外部网络）
│   ├── docker-compose.standalone.yml # 离线部署（无外部网络）
│   ├── setup_rdp_collector.bat     # Windows RDP 采集安装脚本
│   └── neone-rdp-collector.ps1     # RDP 采集 PowerShell 脚本
└── docs/
    └── deploy/offline-deploy.md    # 离线部署手册
```

## 部署

### 在线环境

```bash
cd deploy
# 编辑 .env.example → .env，配置 Zabbix 连接信息
docker compose --env-file .env up -d
```

访问 `http://localhost:8080`。

### 离线环境

参见 `docs/deploy/offline-deploy.md`。

## Windows RDP 采集

在 Windows 主机上：

1. 拷贝 `deploy/setup_rdp_collector.bat` 和 `deploy/neone-rdp-collector.ps1` 到同一目录
2. 管理员身份运行 `setup_rdp_collector.bat`
3. 输入 InsightOps API 地址

每 5 分钟自动上报 RDP 登录事件和心跳。

## 系统设置

在 Web 界面配置：

- LLM API Key / Endpoint / Model — AI 回收建议
- Zabbix 数据库连接 — 性能数据采集
- 采集间隔 — 闲置分析、性能采集、主机同步频率

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `APP_PORT` | `8080` | 对外端口 |
| `PROJECT_DB_USER` | `insightops` | 业务库用户 |
| `PROJECT_DB_PASSWORD` | `insightops` | 业务库密码 |
| `PROJECT_DB_NAME` | `insightops` | 业务库名 |
| `MYSQL_ROOT_PASSWORD` | `root` | MySQL root 密码 |
| `ZABBIX_DB_HOST` | - | Zabbix 数据库 IP |
| `ZABBIX_DB_PASSWORD` | - | Zabbix 数据库密码 |
