# Zabbix 6 官方 MySQL 手动初始化重建计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 停掉当前所有 Zabbix 相关容器并重新部署一套基于官方 MySQL 镜像、通过手动导入官方初始化 SQL 的 Zabbix 6。

**架构：** 保留 `mysql:8.0`、`zabbix-server-mysql` 和 `zabbix-web-nginx-mysql` 官方镜像。先只启动 `mysql`，等待数据库健康后，使用官方 Zabbix Server 镜像内置的 `create.sql.gz` 手动导入全量初始化 SQL，再启动 `zabbix-server` 和 `zabbix-web`，避免自动初始化只生成表结构而没有默认数据。

**技术栈：** Docker Compose v2、MySQL 8.0、Zabbix 6.0 官方 Docker 镜像

---

### 任务 1：准备计划与说明

**文件：**
- 创建：`/opt/trae/InsightOps/docs/superpowers/plans/2026-06-10-zabbix6-mysql-manual-bootstrap.md`
- 修改：`/opt/trae/InsightOps/zabbix6/README.md`

- [ ] **步骤 1：编写重建计划**

```markdown
记录停服、清理、单独启动 MySQL、手动导入 SQL、再启动 Zabbix 服务的步骤。
```

- [ ] **步骤 2：更新说明文档**

```markdown
增加“官方 MySQL 手动初始化”章节，说明先启动 `mysql`，再导入
`/usr/share/doc/zabbix-server-mysql/create.sql.gz`，最后启动
`zabbix-server` 和 `zabbix-web`。
```

### 任务 2：停止并清理旧环境

**文件：**
- 使用：`/opt/trae/InsightOps/zabbix6/docker-compose.yml`

- [ ] **步骤 1：停止当前 Compose 项目**

运行：`docker compose down -v --remove-orphans`
预期：当前 Zabbix Compose 容器、网络和卷被删除

- [ ] **步骤 2：清理残留 Zabbix 容器**

运行：`docker ps -a --format '{{.Names}}' | grep zabbix`
预期：无残留容器；如有残留则 `docker rm -f <name>`

### 任务 3：启动 MySQL 并手动导入官方 SQL

**文件：**
- 使用：`/opt/trae/InsightOps/zabbix6/docker-compose.yml`

- [ ] **步骤 1：只启动 MySQL 服务**

运行：`docker compose up -d mysql`
预期：`zabbix6-mysql` 启动并转为 `healthy`

- [ ] **步骤 2：等待数据库健康**

运行：`docker compose ps`
预期：`mysql` 状态为 `healthy`

- [ ] **步骤 3：导入官方初始化 SQL**

运行：

```bash
docker run --rm --network zabbix6_zabbix6-net \
  -v /opt/trae/InsightOps/zabbix6:/workspace \
  --entrypoint sh zabbix/zabbix-server-mysql:ubuntu-6.0-latest \
  -lc "gzip -dc /usr/share/doc/zabbix-server-mysql/create.sql.gz" \
| docker exec -i zabbix6-mysql mysql -uzabbix -p'${MYSQL_PASSWORD}' zabbix
```

预期：SQL 导入完成且无语法错误

### 任务 4：启动 Zabbix 服务并验证

**文件：**
- 使用：`/opt/trae/InsightOps/zabbix6/docker-compose.yml`

- [ ] **步骤 1：启动 Zabbix Server 和 Web**

运行：`docker compose up -d zabbix-server zabbix-web`
预期：`zabbix-server` 和 `zabbix-web` 启动成功

- [ ] **步骤 2：验证基础数据已存在**

运行：

```bash
docker exec zabbix6-mysql mysql -uzabbix -p'${MYSQL_PASSWORD}' -D zabbix \
  -e "SELECT COUNT(*) AS users_rows FROM users; SELECT COUNT(*) AS config_rows FROM config;"
```

预期：`users_rows > 0` 且 `config_rows > 0`

- [ ] **步骤 3：验证容器状态**

运行：`docker compose ps`
预期：`mysql` 为 `healthy`，`zabbix-server`、`zabbix-web` 为 `Up`

- [ ] **步骤 4：验证 Web 可访问**

运行：`curl -I --max-time 10 http://127.0.0.1:8080`
预期：返回 `HTTP/1.1 200 OK`

- [ ] **步骤 5：检查关键日志**

运行：`docker compose logs --tail=80 mysql zabbix-server zabbix-web`
预期：无 `users table is empty` 错误
