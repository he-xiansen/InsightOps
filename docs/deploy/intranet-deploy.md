# InsightOps 内网部署手册

## 适用范围

本文档用于在内网环境以 Docker Compose 方式启动 InsightOps 一期的最小可用版本，包含以下组件：

- `insightops-mysql`：项目业务库。
- `insightops-api`：FastAPI 接口服务。
- `insightops-collector`：采集任务容器，默认以待命方式启动，便于后续手工触发同步任务。
- `insightops-frontend`：前端静态页面与 API 反向代理入口。

## 前置条件

- 已安装 Docker Engine 24+。
- 已安装 Docker Compose V2。
- 部署机可访问外部或内网镜像源，以拉取 `python:3.11-slim`、`node:20-alpine`、`nginx:1.27-alpine`、`mysql:8.0`。
- 已获取 Zabbix 只读账号与数据库连通信息。

## 目录准备

在仓库根目录执行：

```bash
cd /opt/trae/InsightOps
cp deploy/.env.example deploy/.env
cp backend/.env.example backend/.env
```

说明：

- `deploy/.env` 用于容器化部署时覆盖默认变量。
- `backend/.env` 用于需要在宿主机直接调试 FastAPI 时加载本地环境变量。

## 变量配置

至少需要在 `deploy/.env` 中确认以下配置：

- `MYSQL_ROOT_PASSWORD`：项目 MySQL 的 root 密码。
- `PROJECT_DB_USER`、`PROJECT_DB_PASSWORD`、`PROJECT_DB_NAME`：InsightOps 自身业务库账号。
- `ZABBIX_DB_HOST`、`ZABBIX_DB_PORT`、`ZABBIX_DB_USER`、`ZABBIX_DB_PASSWORD`、`ZABBIX_DB_NAME`：Zabbix 只读数据源。
- `API_PORT`、`FRONTEND_PORT`：对外暴露端口。

如果 Zabbix 数据库与 Compose 不在同一网络，请将 `ZABBIX_DB_HOST` 配置为实际内网地址。

## 启动步骤

```bash
cd /opt/trae/InsightOps
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d --build
```

建议启动后依次执行：

```bash
docker compose --env-file deploy/.env -f deploy/docker-compose.yml ps
docker compose --env-file deploy/.env -f deploy/docker-compose.yml logs insightops-api
docker compose --env-file deploy/.env -f deploy/docker-compose.yml logs insightops-frontend
curl http://127.0.0.1:${API_PORT:-8000}/health
curl http://127.0.0.1:${FRONTEND_PORT:-8080}/health
```

预期结果：

- API 返回 `{"status":"ok"}`。
- 前端的 `/health` 会被 Nginx 反代到 API，便于内网统一探活。

## 采集容器使用方式

`insightops-collector` 默认保持运行但不自动执行周期任务，适合一期环境下手工触发。可以在容器内执行临时脚本，例如：

```bash
docker compose --env-file deploy/.env -f deploy/docker-compose.yml exec insightops-collector python -c "print('collector ready')"
```

后续若要接入定时任务，可在该容器中增加 cron、Celery beat 或独立任务入口，而无需调整 API 与前端部署方式。

## 常见排查

- API 无法启动：检查 `PROJECT_DB_*` 是否指向可用的 MySQL，确认密码与库名一致。
- 前端页面空白：先查看 `docker compose ... logs insightops-frontend`，再确认浏览器访问的是 `http://<host>:${FRONTEND_PORT:-8080}`。
- Zabbix 同步失败：确认 `ZABBIX_DB_*` 为只读账号且部署机到 Zabbix MySQL 网络可达。
- Compose 校验失败：优先执行 `docker compose -f deploy/docker-compose.yml config` 检查 YAML 结构，再补充 `--env-file deploy/.env` 验证最终变量展开结果。
