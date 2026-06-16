# Zabbix 6 MySQL 重建计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将当前 `zabbix6` 目录下的 Zabbix 6 部署从 PostgreSQL 版切换为 MySQL 版，并直接重建一套全新环境。

**架构：** 保持单个 `docker compose` 项目不变，用 `mysql:8.0` 替换 PostgreSQL，`zabbix-server` 和 `zabbix-web` 改用官方 MySQL 镜像。通过 `docker compose down -v` 删除旧数据卷后重新初始化，避免做跨库迁移。

**技术栈：** Docker Compose v2、MySQL 8.0、Zabbix 6.0 官方 MySQL 镜像

---

### 任务 1：更新编排与环境变量

**文件：**
- 修改：`/opt/trae/InsightOps/zabbix6/docker-compose.yml`
- 修改：`/opt/trae/InsightOps/zabbix6/.env`
- 修改：`/opt/trae/InsightOps/zabbix6/README.md`

- [ ] **步骤 1：将数据库服务改为 MySQL**

```yaml
  mysql:
    image: mysql:8.0
    container_name: zabbix6-mysql
    command:
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_bin
      - --default-authentication-plugin=mysql_native_password
```

- [ ] **步骤 2：将 Zabbix 镜像和环境变量切为 MySQL 版**

```yaml
  zabbix-server:
    image: zabbix/zabbix-server-mysql:ubuntu-6.0-latest
    environment:
      DB_SERVER_HOST: mysql
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}

  zabbix-web:
    image: zabbix/zabbix-web-nginx-mysql:ubuntu-6.0-latest
```

- [ ] **步骤 3：更新环境变量文件**

```dotenv
MYSQL_DATABASE=zabbix
MYSQL_USER=zabbix
MYSQL_PASSWORD=<random>
MYSQL_ROOT_PASSWORD=<random>
PHP_TZ=Asia/Shanghai
```

- [ ] **步骤 4：更新说明文档**

```markdown
当前部署使用 MySQL 8
重建命令会删除旧 PostgreSQL / MySQL 数据卷
```

### 任务 2：验证配置可解析

**文件：**
- 使用：`/opt/trae/InsightOps/zabbix6/docker-compose.yml`

- [ ] **步骤 1：校验 Compose 配置**

运行：`docker compose config -q`
预期：退出码 `0`

### 任务 3：删除旧栈并重建

**文件：**
- 使用：`/opt/trae/InsightOps/zabbix6/docker-compose.yml`

- [ ] **步骤 1：删除旧 PostgreSQL 版容器与卷**

运行：`docker compose down -v`
预期：当前 `zabbix6` 项目容器、网络和卷被删除

- [ ] **步骤 2：拉起 MySQL 版服务**

运行：`docker compose up -d`
预期：`mysql`、`zabbix-server`、`zabbix-web` 创建成功

### 任务 4：验证运行结果

**文件：**
- 使用：`/opt/trae/InsightOps/zabbix6/docker-compose.yml`

- [ ] **步骤 1：检查容器状态**

运行：`docker compose ps`
预期：`mysql` 为 `healthy`，`zabbix-server`、`zabbix-web` 为 `Up`

- [ ] **步骤 2：检查 Web 可用性**

运行：`curl -I --max-time 10 http://127.0.0.1:8080`
预期：返回 `HTTP/1.1 200 OK` 或重定向状态

- [ ] **步骤 3：检查关键服务日志**

运行：`docker compose logs --tail=40 mysql zabbix-server zabbix-web`
预期：没有数据库认证失败或初始化中断错误
