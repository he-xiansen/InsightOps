# InsightOps Backend

最小 FastAPI 后端骨架，作为 InsightOps 一期数据底座的起点。

## 本地开发

```bash
conda env create -f environment.yml
conda activate insightops
cd /opt/trae/InsightOps/backend
.venv/bin/pytest
```

如果使用标准安装方式，也可以在 `backend` 目录执行：

```bash
cd /opt/trae/InsightOps/backend
python -m pip install -e ".[test]"
python -m pytest
```

## 交付前验证

后端交付前，至少执行 1 次完整测试，而不是只跑健康检查用例。当前仓库已经实际验证通过的命令如下：

```bash
cd /opt/trae/InsightOps/backend
.venv/bin/pytest
```

预期结果：

- 收集 `40` 个测试用例。
- 结果为 `40 passed`。

如果当前环境尚未准备好 `.venv`，可以先执行 `python -m pip install -e ".[test]"`，然后改用 `python -m pytest`。

## 交付说明

- 后端应用入口：`app/main.py`
- 最小探活接口：`GET /health`
- 建议与仓库根目录的整体验证一起交付，至少补充以下结果：
  - `backend/.venv/bin/pytest`
  - `frontend` 目录下的 `npm run build`
  - 仓库根目录的 `docker compose --env-file deploy/.env.example -f deploy/docker-compose.yml config`
- 交付记录中建议明确写出验证时间、执行人、命令、结果摘要，以及是否使用示例环境变量还是正式内网变量。

## 最小运行

启动服务：

```bash
cd /opt/trae/InsightOps/backend
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Smoke test：

```bash
curl http://127.0.0.1:8000/health
```

预期返回：

```json
{"status":"ok"}
```

## 本地附注

当前工作区也曾使用未纳管的 `.venv` 执行本地验证：

```bash
cd /opt/trae/InsightOps/backend
.venv/bin/pytest
```

## 红绿灯记录

- 红灯：在未安装 `fastapi` 的情况下运行 `cd /opt/trae/InsightOps/backend && pytest`，测试收集失败，错误为 `ModuleNotFoundError: No module named 'fastapi'`
- 绿灯：在本地虚拟环境中运行 `cd /opt/trae/InsightOps/backend && .venv/bin/pytest`，结果为 `40 passed`

## 入口

- 应用入口：`app/main.py`
- 健康检查：`GET /health`
