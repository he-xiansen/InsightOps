# Zabbix 6 宿主机监控接入实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 为当前 `zabbix6` 容器化部署补充官方 `zabbix-agent2` 容器，使默认的 `Zabbix server` 主机能够监控当前 Linux 宿主机。

**架构：** 在现有 `docker compose` 编排中增加一个 `zabbix-agent2` 服务，挂载宿主机的 `/`、`/proc`、`/sys` 供 agent 采集整机指标。保留默认主机 `Zabbix server`，将其 Agent 接口从 `127.0.0.1:10050` 切换为 `zabbix-agent2:10050`，让 `zabbix-server` 通过同一 Docker 网络拉取宿主机指标。

**技术栈：** Docker Compose v2、Zabbix 6 官方镜像、MySQL 8、SQL 校验查询

---

### 任务 1：记录失败基线与运行计划

**文件：**
- 创建：`/opt/trae/InsightOps/docs/superpowers/plans/2026-06-10-zabbix6-host-monitoring-agent2.md`
- 修改：`/opt/trae/InsightOps/zabbix6/README.md`

- [ ] **步骤 1：验证当前失败状态**

运行：

```bash
docker compose logs --tail=120 zabbix-server | grep -E "interface unavailable|network error" | tail -n 10
```

预期：输出包含 `Zabbix agent item ... failed` 或 `interface unavailable`

- [ ] **步骤 2：记录当前主机接口配置**

运行：

```bash
docker exec zabbix6-mysql mysql -uroot -p'CD308IaewxktbFh0Zntp4b6u' -D zabbix -e \
  "SELECT hostid,host,name,status FROM hosts WHERE host='Zabbix server';
   SELECT interfaceid,hostid,ip,dns,port,useip,main,type FROM interface
   WHERE hostid IN (SELECT hostid FROM hosts WHERE host='Zabbix server');"
```

预期：接口为 `127.0.0.1:10050`

- [ ] **步骤 3：更新说明文档**

```markdown
增加 `zabbix-agent2` 服务说明、宿主机监控依赖的挂载点，以及主机接口切换步骤。
```

### 任务 2：新增官方 agent2 容器

**文件：**
- 修改：`/opt/trae/InsightOps/zabbix6/docker-compose.yml`

- [ ] **步骤 1：为 Compose 添加 `zabbix-agent2` 服务**

```yaml
  zabbix-agent2:
    image: zabbix/zabbix-agent2:ubuntu-6.0-latest
    container_name: zabbix6-agent2
    restart: unless-stopped
    environment:
      ZBX_SERVER_HOST: zabbix-server
      ZBX_HOSTNAME: Zabbix server
      ZBX_PASSIVE_ALLOW: "true"
      ZBX_ACTIVE_ALLOW: "false"
    pid: host
    privileged: true
    volumes:
      - /:/hostfs:ro
      - /proc:/hostfs/proc:ro
      - /sys:/hostfs/sys:ro
      - /dev:/hostfs/dev:ro
    networks:
      - zabbix6-net
```

- [ ] **步骤 2：验证 Compose 配置有效**

运行：`docker compose config -q`
预期：退出码 `0`

- [ ] **步骤 3：启动 agent2**

运行：`docker compose up -d zabbix-agent2`
预期：`zabbix6-agent2` 为 `Up`

### 任务 3：切换默认主机接口到 agent2

**文件：**
- 使用：`/opt/trae/InsightOps/zabbix6/docker-compose.yml`

- [ ] **步骤 1：更新数据库中的 Agent 接口**

运行：

```bash
docker exec zabbix6-mysql mysql -uroot -p'CD308IaewxktbFh0Zntp4b6u' -D zabbix -e \
  "UPDATE interface i
   JOIN hosts h ON h.hostid=i.hostid
   SET i.useip=0, i.ip='', i.dns='zabbix-agent2', i.port='10050'
   WHERE h.host='Zabbix server' AND i.type=1;"
```

预期：更新成功，无 SQL 错误

- [ ] **步骤 2：强制刷新配置缓存**

运行：

```bash
docker exec zabbix6-mysql mysql -uroot -p'CD308IaewxktbFh0Zntp4b6u' -D zabbix -e \
  "UPDATE settings SET value_int=1 WHERE name='cache_update_frequency';"
```

预期：语句执行成功

- [ ] **步骤 3：重启 Zabbix Server**

运行：`docker compose restart zabbix-server`
预期：`zabbix6-server` 重启后恢复 `Up`

### 任务 4：验证宿主机监控恢复

**文件：**
- 测试：`/opt/trae/InsightOps/zabbix6/docker-compose.yml`

- [ ] **步骤 1：验证 agent2 容器日志**

运行：`docker compose logs --tail=80 zabbix-agent2`
预期：无启动致命错误，监听 `10050`

- [ ] **步骤 2：验证主机接口已切换**

运行：

```bash
docker exec zabbix6-mysql mysql -uroot -p'CD308IaewxktbFh0Zntp4b6u' -D zabbix -e \
  "SELECT i.ip,i.dns,i.port,i.useip
   FROM interface i
   JOIN hosts h ON h.hostid=i.hostid
   WHERE h.host='Zabbix server' AND i.type=1;"
```

预期：`dns='zabbix-agent2'` 且 `useip=0`

- [ ] **步骤 3：验证 Server 不再报接口不可用**

运行：

```bash
docker compose logs --tail=120 zabbix-server | grep -E "interface unavailable|network error" || true
```

预期：不再出现新的 `interface unavailable`

- [ ] **步骤 4：验证关键指标已入库**

运行：

```bash
docker exec zabbix6-mysql mysql -uroot -p'CD308IaewxktbFh0Zntp4b6u' -D zabbix -e \
  "SELECT i.key_, COUNT(*) AS rows_count
   FROM history_uint hst
   JOIN items i ON i.itemid=hst.itemid
   JOIN hosts h ON h.hostid=i.hostid
   WHERE h.host='Zabbix server'
     AND i.key_ IN ('system.cpu.num','vm.memory.size[total]')
   GROUP BY i.key_;"
```

预期：至少一个关键 Agent 指标开始写入数据
