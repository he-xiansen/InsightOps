# Collector Compose Restart Fix 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 修复 `insightops-collector` 一次性任务入口与 Compose 自动重启策略冲突的问题，并同步更新部署文档。

**架构：** 保持 collector 镜像默认入口 `python -m app.collector_runner` 不变，仅将 Compose 服务语义改为一次性任务容器。部署文档统一以 `docker compose run --rm insightops-collector ...` 描述手工触发方式，并使用 `docker compose config` 验证最终编排。

**技术栈：** Docker Compose、YAML、Markdown

---

### 任务 1：调整 Compose 中 collector 的重启策略

**文件：**
- 修改：`/opt/trae/InsightOps/deploy/docker-compose.yml`

- [ ] **步骤 1：确认当前配置会自动重启 collector**

```yaml
  insightops-collector:
    build:
      context: ..
      dockerfile: deploy/Dockerfile.collector
    restart: unless-stopped
```

- [ ] **步骤 2：将 collector 改为一次性任务容器语义**

```yaml
  insightops-collector:
    build:
      context: ..
      dockerfile: deploy/Dockerfile.collector
    restart: "no"
```

- [ ] **步骤 3：保留现有镜像入口与依赖关系不变**

```yaml
    depends_on:
      insightops-mysql:
        condition: service_healthy
      insightops-db-init:
        condition: service_completed_successfully
```

### 任务 2：更新部署手册中的 collector 运行方式

**文件：**
- 修改：`/opt/trae/InsightOps/docs/deploy/intranet-deploy.md`

- [ ] **步骤 1：修正组件描述**

```md
- `insightops-collector`：采集一次性任务容器，按需手工触发执行同步或分析任务。
```

- [ ] **步骤 2：修正首次部署与启动说明**

```bash
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d --build insightops-api insightops-frontend
docker compose --env-file deploy/.env -f deploy/docker-compose.yml run --rm insightops-collector
```

- [ ] **步骤 3：将 `exec insightops-collector` 示例改为 `run --rm`**

```bash
docker compose --env-file deploy/.env -f deploy/docker-compose.yml run --rm insightops-collector \
  sh -lc 'python - <<"PY"
print("collector ready")
PY'
```

### 任务 3：验证编排与文档一致性

**文件：**
- 使用：`/opt/trae/InsightOps/deploy/docker-compose.yml`
- 使用：`/opt/trae/InsightOps/docs/deploy/intranet-deploy.md`

- [ ] **步骤 1：运行 Compose 配置校验**

运行：`cd /opt/trae/InsightOps && docker compose --env-file deploy/.env.example -f deploy/docker-compose.yml config`
预期：退出码 `0`，`insightops-collector` 展开为 `restart: "no"` 或等效的禁用重启语义。

- [ ] **步骤 2：检查最近修改文件诊断**

运行：在 IDE 中检查 `deploy/docker-compose.yml` 与 `docs/deploy/intranet-deploy.md` 的诊断
预期：无新增语法错误

- [ ] **步骤 3：提交最小修复**

```bash
cd /opt/trae/InsightOps
git add deploy/docker-compose.yml docs/deploy/intranet-deploy.md docs/superpowers/plans/2026-06-11-collector-compose-restart-fix.md
git commit -m "fix: align collector compose restart behavior"
```
