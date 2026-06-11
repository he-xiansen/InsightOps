# InsightOps 内网部署手册

## 适用范围

本文档用于在内网环境以 Docker Compose 方式启动 InsightOps 一期的最小可用版本，包含以下组件：

- `insightops-mysql`：项目业务库，仅在容器内部网络可见。
- `insightops-db-init`：一次性数据库初始化任务，用于空库建表。
- `insightops-api`：FastAPI 接口服务。
- `insightops-collector`：采集任务容器，默认以待命方式启动，便于后续手工触发同步任务。
- `insightops-frontend`：前端静态页面与 API 反向代理入口。

## 前置条件

- 已安装 Docker Engine 24+。
- 已安装 Docker Compose V2。
- 部署机可访问外部或内网镜像源，以拉取 `python:3.11-slim`、`node:20-alpine`、`nginxinc/nginx-unprivileged:1.27-alpine`、`mysql:8.0`。
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
- 业务 MySQL 默认不映射宿主机端口；如需访问，请通过 `docker compose exec insightops-mysql ...` 在容器内执行。

## 变量配置

至少需要在 `deploy/.env` 中确认以下配置：

- `MYSQL_ROOT_PASSWORD`：项目 MySQL 的 root 密码。
- `PROJECT_DB_USER`、`PROJECT_DB_PASSWORD`、`PROJECT_DB_NAME`：InsightOps 自身业务库账号。
- `ZABBIX_DB_HOST`、`ZABBIX_DB_PORT`、`ZABBIX_DB_USER`、`ZABBIX_DB_PASSWORD`、`ZABBIX_DB_NAME`：Zabbix 只读数据源。
- `API_PORT`、`FRONTEND_PORT`：对外暴露端口。

如果 Zabbix 数据库与 Compose 不在同一网络，请将 `ZABBIX_DB_HOST` 配置为实际内网地址。

## 数据库初始化

首次部署建议分三步执行：

```bash
cd /opt/trae/InsightOps
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d insightops-mysql
docker compose --env-file deploy/.env -f deploy/docker-compose.yml run --rm insightops-db-init
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d --build insightops-api insightops-collector insightops-frontend
```

说明：

- `insightops-db-init` 会调用 SQLAlchemy 的 `create_all()`，为 `vm_assets`、`vm_rdp_logins`、`idle_vm_snapshots`、`zabbix_host_mapping`、`sync_jobs`、`api_keys` 等核心表建表。
- 后续直接执行 `docker compose ... up -d --build` 时，`insightops-api` 与 `insightops-collector` 也会等待初始化任务完成后再启动。

## API Key 初始化

系统鉴权依赖 `api_keys` 表。建议首次部署时生成一段原始 Token，并仅把哈希写入数据库。

### 1. 生成原始 Token 与 SHA-256 哈希

```bash
python - <<'PY'
import hashlib
import secrets

token = secrets.token_urlsafe(32)
token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
print(f"API_KEY={token}")
print(f"API_KEY_SHA256={token_hash}")
PY
```

保存输出的 `API_KEY`，后续调用接口时通过 `X-API-Key` 传入。数据库只保存 `API_KEY_SHA256`。

### 2. 将哈希写入 `api_keys` 表

```bash
docker compose --env-file deploy/.env -f deploy/docker-compose.yml exec insightops-mysql \
  sh -lc 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$PROJECT_DB_NAME" <<"SQL"
INSERT INTO api_keys (key_name, key_hash, enabled, expires_at, last_used_at)
VALUES ("default-sync", "替换为上一步输出的 API_KEY_SHA256", 1, NULL, NULL)
ON DUPLICATE KEY UPDATE
  key_hash = VALUES(key_hash),
  enabled = VALUES(enabled),
  expires_at = VALUES(expires_at),
  last_used_at = VALUES(last_used_at);
SQL'
```

### 3. 验证写入结果

```bash
docker compose --env-file deploy/.env -f deploy/docker-compose.yml exec insightops-mysql \
  sh -lc 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$PROJECT_DB_NAME" -e "SELECT key_name, enabled, expires_at FROM api_keys;"'
```

## Zabbix 连通性验证

启动业务容器后，建议先验证到 Zabbix 数据源的网络与账号是否可用：

```bash
docker compose --env-file deploy/.env -f deploy/docker-compose.yml exec insightops-collector \
  sh -lc 'python - <<"PY"
import os
import pymysql

connection = pymysql.connect(
    host=os.environ["zabbix_db_host"],
    port=int(os.environ["zabbix_db_port"]),
    user=os.environ["zabbix_db_user"],
    password=os.environ["zabbix_db_password"],
    database=os.environ["zabbix_db_name"],
    connect_timeout=5,
)
print("zabbix connectivity ok")
connection.close()
PY'
```

如果需要进一步确认库表权限，可改为执行 `SELECT 1;` 或读取一张已知只读表。

## 启动后检查

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

## 升级步骤

1. 拉取最新代码，并对比 `deploy/.env.example`、`backend/.env.example` 是否新增变量。
2. 备份业务库数据，例如在 `insightops-mysql` 容器内执行 `mysqldump` 导出 `PROJECT_DB_NAME`。
3. 先运行 `docker compose -f deploy/docker-compose.yml config` 校验编排。
4. 执行 `docker compose --env-file deploy/.env -f deploy/docker-compose.yml run --rm insightops-db-init`，补齐新增表结构。
5. 执行 `docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d --build` 更新服务。
6. 重新执行健康检查、接口调用与 Zabbix 连通性验证。

## 常见排查

- API 无法启动：检查 `PROJECT_DB_*` 是否指向可用的 MySQL，确认密码与库名一致，并确认 `insightops-db-init` 已成功执行。
- 前端页面空白：先查看 `docker compose ... logs insightops-frontend`，再确认浏览器访问的是 `http://<host>:${FRONTEND_PORT:-8080}`。
- Zabbix 同步失败：确认 `ZABBIX_DB_*` 为只读账号且部署机到 Zabbix MySQL 网络可达，并执行上文连通性验证。
- Compose 校验失败：优先执行 `docker compose -f deploy/docker-compose.yml config` 检查 YAML 结构，再补充 `--env-file deploy/.env` 验证最终变量展开结果。
