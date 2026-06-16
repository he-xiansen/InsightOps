# Zabbix 6 容器化安装计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在当前 Ubuntu 主机上以 Docker Compose 方式部署一套可访问的 Zabbix 6。

**架构：** 使用 PostgreSQL 存储 Zabbix 数据，`zabbix-server` 负责核心服务，`zabbix-web-nginx` 提供 Web 控制台。容器通过独立网络互联，仅将 Web 端口和 Zabbix Server 监听端口暴露到宿主机。

**技术栈：** Docker 28、Docker Compose v2、PostgreSQL 15、官方 Zabbix 6.0 镜像

---

### 任务 1：检查运行前提

**文件：**
- 无文件改动

- [ ] **步骤 1：确认 Docker 可用**

运行：`docker --version`
预期：输出 Docker 版本信息

- [ ] **步骤 2：确认 Compose 可用**

运行：`docker compose version`
预期：输出 Docker Compose 版本信息

- [ ] **步骤 3：确认目标端口未被占用**

运行：`ss -ltn '( sport = :8080 or sport = :10051 )'`
预期：无监听结果

### 任务 2：准备 Compose 配置

**文件：**
- 创建：`zabbix6/docker-compose.yml`
- 创建：`zabbix6/.env`
- 创建：`zabbix6/README.md`

- [ ] **步骤 1：编写容器编排文件**

```yaml
services:
  postgres:
    image: postgres:15-alpine
  zabbix-server:
    image: zabbix/zabbix-server-pgsql:ubuntu-6.0-latest
  zabbix-web:
    image: zabbix/zabbix-web-nginx-pgsql:ubuntu-6.0-latest
```

- [ ] **步骤 2：编写环境变量文件**

```dotenv
POSTGRES_DB=zabbix
POSTGRES_USER=zabbix
POSTGRES_PASSWORD=<random>
ZABBIX_DB_PASSWORD=<random>
```

- [ ] **步骤 3：记录使用说明**

```markdown
使用 `docker compose up -d` 启动
访问 `http://<host>:8080`
默认账号 `Admin` / `zabbix`
```

### 任务 3：启动并验证服务

**文件：**
- 使用：`zabbix6/docker-compose.yml`

- [ ] **步骤 1：拉起容器**

运行：`docker compose up -d`
预期：镜像拉取成功且容器进入运行态

- [ ] **步骤 2：检查容器状态**

运行：`docker compose ps`
预期：`postgres`、`zabbix-server`、`zabbix-web` 为 `running`

- [ ] **步骤 3：检查 Web 页面**

运行：`curl -I http://127.0.0.1:8080`
预期：返回 `HTTP/1.1 200 OK` 或重定向状态

### 任务 4：交付访问信息

**文件：**
- 更新：`zabbix6/README.md`

- [ ] **步骤 1：记录服务信息**

```markdown
URL: http://<host>:8080
用户名: Admin
密码: zabbix
```

- [ ] **步骤 2：记录常用维护命令**

```bash
docker compose logs -f zabbix-server
docker compose down
docker compose restart
```
