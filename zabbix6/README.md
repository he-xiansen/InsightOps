# Zabbix 6 容器化部署

## 文件说明

- `docker-compose.yml`: Zabbix 6、MySQL 8 的容器编排
- `.env`: 本地部署环境变量

## 启动

```bash
cd /opt/trae/InsightOps/zabbix6
docker compose up -d
```

## 重建

```bash
cd /opt/trae/InsightOps/zabbix6
docker compose down -v
docker compose up -d mysql
docker compose exec -T mysql mysqladmin ping -h 127.0.0.1 -uroot -p"$MYSQL_ROOT_PASSWORD" --silent
docker run --rm --network zabbix6_zabbix6-net \
  --entrypoint sh zabbix/zabbix-server-mysql:ubuntu-6.0-latest \
  -lc "gzip -dc /usr/share/doc/zabbix-server-mysql/create.sql.gz" \
  | docker compose exec -T mysql mysql -uzabbix -p"$MYSQL_PASSWORD" zabbix
docker compose up -d zabbix-server zabbix-web
```

`docker compose down -v` 会删除当前 Zabbix 目录对应的数据库卷，适用于直接重建场景。

## 官方 MySQL 手动初始化

当 `zabbix-server` 自动初始化后只生成表结构、没有写入默认数据时，使用上面的重建流程。

关键点：

- 先只启动 `mysql`
- 再从官方镜像导出 `/usr/share/doc/zabbix-server-mysql/create.sql.gz`
- 将 SQL 导入 `zabbix` 数据库
- 最后再启动 `zabbix-server` 和 `zabbix-web`

## 访问

- Web 地址: `http://<宿主机IP>:8080`
- 默认账号: `Admin`
- 默认密码: `zabbix`

## 宿主机监控

当前编排包含一个官方 `zabbix-agent2` 容器，用来接入当前 Linux 宿主机的基础监控。

关键点：

- `zabbix-agent2` 运行在宿主机 PID 命名空间下
- 挂载了宿主机的 `/`、`/proc`、`/sys`、`/dev`
- 默认主机 `Zabbix server` 的 Agent 接口需要指向 `zabbix-agent2:10050`

如果主机最初仍指向 `127.0.0.1:10050`，可以执行：

```bash
docker exec zabbix6-mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -D zabbix -e \
  "UPDATE interface i
   JOIN hosts h ON h.hostid=i.hostid
   SET i.useip=0, i.ip='', i.dns='zabbix-agent2', i.port='10050'
   WHERE h.host='Zabbix server' AND i.type=1;"
docker compose restart zabbix-server
```

## 常用命令

```bash
docker compose ps
docker compose logs -f mysql
docker compose logs -f zabbix-server
docker compose logs -f zabbix-agent2
docker compose logs -f zabbix-web
docker compose down
```
