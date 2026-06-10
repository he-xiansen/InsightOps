# InsightOps Backend

最小 FastAPI 后端骨架，作为 InsightOps 一期数据底座的起点。

## 本地开发

```bash
conda env create -f environment.yml
conda activate insightops
cd /opt/trae/InsightOps/backend
pytest tests/test_health.py -v
```

如果使用标准安装方式，也可以在 `backend` 目录执行：

```bash
cd /opt/trae/InsightOps/backend
python -m pip install -e ".[test]"
pytest tests/test_health.py -v
```

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
.venv/bin/pytest tests/test_health.py -v
```

## 红绿灯记录

- 红灯：在未安装 `fastapi` 的情况下运行 `cd /opt/trae/InsightOps/backend && pytest tests/test_health.py -v`，测试收集失败，错误为 `ModuleNotFoundError: No module named 'fastapi'`
- 绿灯：在本地虚拟环境中运行 `cd /opt/trae/InsightOps/backend && .venv/bin/pytest tests/test_health.py -v`，结果为 `1 passed`

## 入口

- 应用入口：`app/main.py`
- 健康检查：`GET /health`
