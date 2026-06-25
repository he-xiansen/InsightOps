# InsightOps 离线部署常见问题

## db-init 容器一直在 waiting

### 原因

`insightops-db-init` 依赖 MySQL `service_healthy`，只有 MySQL health check 通过后才会启动。

### 排查

```bash
# 1. 看 MySQL 容器状态
docker compose -f docker-compose.offline.yml ps

# 2. 看 MySQL 日志
docker compose -f docker-compose.offline.yml logs insightops-mysql

# 3. 手动测试 health check
docker compose -f docker-compose.offline.yml exec insightops-mysql \
  mysqladmin ping -h 127.0.0.1 -uroot -p"$MYSQL_ROOT_PASSWORD"
```

### 常见原因及解决

| 原因 | 症状 | 解决 |
|------|------|------|
| **MySQL 首次启动慢** | 日志显示 `InnoDB initialization` | 等 1-3 分钟，health check 通过后 db-init 会自动继续 |
| **旧 volume 数据损坏** | MySQL 日志反复报错 | 清空 volume 重建：`docker compose -f docker-compose.offline.yml down -v && docker compose --env-file .env -f docker-compose.offline.yml up -d` |
| **端口被占用** | MySQL 起不来，日志报 `port already in use` | `lsof -i :3306` 查看占用进程，或改 `PROJECT_DB_PORT` |
| **磁盘空间不足** | MySQL 日志报 `No space left` | `df -h` 清理磁盘 |
| **arm64 / amd64 架构不匹配** | MySQL 日志报 `exec format error` | 需要用 `uname -m` 确认架构，`mysql:8.0` 镜像需匹配 |

> **注意**：`docker compose -f docker-compose.offline.yml down -v` 会删除数据库数据！确认无重要数据再执行。

---

## Zabbix 数据库连不上

```bash
# 测试网络连通性
ping <ZABBIX_DB_HOST>
telnet <ZABBIX_DB_HOST> 3306
```

确认 `.env` 中 `ZABBIX_DB_HOST` 和 `ZABBIX_DB_PASSWORD` 正确。
