# InsightOps 离线安装部署手册

适用于内网 Ubuntu 服务器，所有依赖已打包，无需外网。

---

## 架构

**2 个容器：**
- `insightops` — 整合 API + 采集器 + 前端，端口 8080
- `insightops-mysql` — MySQL 8.0 数据库

---

## 交付件

| 文件 | 大小 | 说明 |
|------|------|------|
| `insightops-images.tar` | ~970 MB | Docker 镜像 |
| `insightops-files.tar.gz` | ~11 MB | 源码 + 部署配置 + 文档 |
| `offline-install.sh` | — | 一键安装脚本 |

---

## 安装

### 前置

- Docker Engine ≥ 24，Docker Compose V2
- Zabbix 数据库（用于读取性能数据和主机列表）

```bash
# Docker 需要预先在有网环境安装好
docker --version
docker compose version
```

### 第一步：拷贝安装包

将交付件拷贝到目标机同一目录，如 `/opt/insightops-offline/`。

### 第二步：导入镜像并解压

```bash
cd /opt/insightops-offline
chmod +x offline-install.sh
docker load -i insightops-images.tar
tar xzf insightops-files.tar.gz -C /opt/
```

### 第三步：配置

```bash
cd /opt/InsightOps/deploy
```

编辑或创建 `.env`：

```bash
APP_NAME=InsightOps
APP_ENV=prod
APP_PORT=8080
PROJECT_DB_USER=insightops
PROJECT_DB_PASSWORD=insightops
PROJECT_DB_NAME=insightops
MYSQL_ROOT_PASSWORD=root
ZABBIX_DB_HOST=192.168.1.100      # ← 改成 Zabbix 数据库实际 IP
ZABBIX_DB_PORT=3306
ZABBIX_DB_USER=readonly
ZABBIX_DB_PASSWORD=实际密码          # ← 改成 Zabbix 数据库实际密码
ZABBIX_DB_NAME=zabbix
```

### 第四步：选择 Compose 文件

| 场景 | 文件 |
|------|------|
| Zabbix 在物理机 / 另一台机器 | `docker-compose.standalone.yml` |
| Zabbix 在同一 Docker 宿主机 | `docker-compose.offline.yml`（有外部网络配置） |

大部分场景用 `docker-compose.standalone.yml`。

### 第五步：启动

```bash
docker compose --env-file .env -f docker-compose.standalone.yml up -d
```

验证：

```bash
curl http://127.0.0.1:8080/health   # → {"status":"ok"}
```

浏览器访问 `http://<服务器IP>:8080`，第一个注册的用户自动成为管理员。

---

## 首次使用

1. 注册管理员账号（右上角登录/注册）
2. 系统设置 → 配置 Zabbix 数据库连接 → 测试连接 → 保存
3. 设备管理 → 添加主机 → 输入 IP 或 IP 段导入

---

## Windows 客户端部署

1. 将 `deploy/setup_rdp_collector.bat` 和 `deploy/neone-rdp-collector.ps1` 拷贝到 Windows 主机同一目录
2. 右键以管理员身份运行 `setup_rdp_collector.bat`
3. 输入 InsightOps API 地址（如 `http://172.27.39.32:8080`）

部署后每 5 分钟自动上报 RDP 登录事件和心跳。

---

## 运维

```bash
cd /opt/InsightOps/deploy

# 状态
docker compose -f docker-compose.standalone.yml ps

# 日志
docker compose -f docker-compose.standalone.yml logs -f insightops

# 重启
docker compose -f docker-compose.standalone.yml restart insightops

# 停止
docker compose -f docker-compose.standalone.yml down

# 数据库备份
docker compose -f docker-compose.standalone.yml exec insightops-mysql \
  mysqldump -uroot -proot insightops > backup.sql
```

## 代码更新

后端 Python 代码替换后重启即可：
```bash
docker compose -f docker-compose.standalone.yml restart insightops
```

前端更新：需在有网环境 `docker build` → `docker save` 新镜像 → 拷贝到离线环境 `docker load` + 重启。

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `APP_PORT` | `8080` | 对外端口 |
| `MYSQL_ROOT_PASSWORD` | `root` | MySQL root 密码 |
| `PROJECT_DB_USER` | `insightops` | 业务库用户 |
| `PROJECT_DB_PASSWORD` | `insightops` | 业务库密码 |
| `PROJECT_DB_NAME` | `insightops` | 业务库名 |
| `ZABBIX_DB_HOST` | — | Zabbix IP（**必改**） |
| `ZABBIX_DB_PASSWORD` | — | Zabbix 密码（**必改**） |
