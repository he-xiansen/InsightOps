# InsightOps Backend

最小 FastAPI 后端骨架，作为 InsightOps 一期数据底座的起点。

## 本地开发

```bash
conda env create -f environment.yml
conda activate insightops
pytest tests/test_health.py -v
```

## 入口

- 应用入口：`app/main.py`
- 健康检查：`GET /health`
