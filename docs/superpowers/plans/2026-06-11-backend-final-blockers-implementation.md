# 后端终审阻塞项最小收尾实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 以最小范围补齐 collector 可执行入口、资产查询接口、闲置清单接口、对应测试与部署默认命令。

**架构：** 复用现有 `task/service/repository` 结构，不新增复杂调度层。`collector-service` 增加一个 Python CLI 入口，统一创建数据库会话并按环境变量或命令行分派到 `zabbix_host_sync` 或 `idle_analysis`；`api-service` 在既有路由中补两个只读 GET 列表接口，直接调用新增的最小查询 service 方法。

**技术栈：** `Python 3.11`、`FastAPI`、`SQLAlchemy 2`、`Pydantic v2`、`pytest`、`Docker`

---

## 文件结构

- 修改：`/opt/trae/InsightOps/backend/app/schemas/vm_asset.py`，补资产/闲置列表响应模型。
- 修改：`/opt/trae/InsightOps/backend/app/services/vm_asset_service.py`，补资产列表查询。
- 修改：`/opt/trae/InsightOps/backend/app/repositories/idle_vm_snapshot_repository.py`，补最新快照列表查询。
- 修改：`/opt/trae/InsightOps/backend/app/services/idle_analysis_service.py`，补默认 30 天闲置清单查询。
- 修改：`/opt/trae/InsightOps/backend/app/api/routes/assets.py`，补 `GET /api/assets`。
- 修改：`/opt/trae/InsightOps/backend/app/api/routes/idle.py`，补 `GET /api/v1/idle`。
- 创建：`/opt/trae/InsightOps/backend/app/collector_runner.py`，新增 collector CLI 入口。
- 修改：`/opt/trae/InsightOps/deploy/Dockerfile.collector`，把默认命令切换为 CLI 入口。
- 修改：`/opt/trae/InsightOps/backend/tests/test_asset_sync_api.py`，增加资产列表接口测试。
- 修改：`/opt/trae/InsightOps/backend/tests/test_idle_export_api.py`，增加闲置列表接口测试。
- 创建：`/opt/trae/InsightOps/backend/tests/test_collector_runner.py`，增加 collector CLI 测试。

### 任务 1：先写 collector CLI 失败测试

**文件：**
- 创建：`/opt/trae/InsightOps/backend/tests/test_collector_runner.py`
- 修改：`/opt/trae/InsightOps/backend/app/collector_runner.py`

- [ ] **步骤 1：编写失败的测试**

```python
def test_main_prefers_cli_task_over_env(monkeypatch: pytest.MonkeyPatch) -> None:
    observed: list[str] = []

    monkeypatch.setattr("app.collector_runner.run_selected_task", lambda task_name, idle_days: observed.append(task_name) or 3)

    exit_code = collector_runner.main(["idle_analysis", "--idle-days", "45"])

    assert exit_code == 0
    assert observed == ["idle_analysis"]
```

- [ ] **步骤 2：运行测试验证失败**

运行：`cd /opt/trae/InsightOps/backend && .venv/bin/pytest tests/test_collector_runner.py -q`
预期：`FAIL`，报错 `ModuleNotFoundError` 或 `AttributeError`

- [ ] **步骤 3：编写最少实现代码**

```python
TASK_NAMES = {"zabbix_host_sync", "idle_analysis"}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("task", nargs="?")
    parser.add_argument("--idle-days", type=int, default=DEFAULT_IDLE_DAYS)
    args = parser.parse_args(argv)
    task_name = args.task or os.getenv("INSIGHTOPS_COLLECTOR_TASK") or "idle_analysis"
    run_selected_task(task_name, idle_days=args.idle_days)
    return 0
```

- [ ] **步骤 4：运行测试验证通过**

运行：`cd /opt/trae/InsightOps/backend && .venv/bin/pytest tests/test_collector_runner.py -q`
预期：`PASS`

- [ ] **步骤 5：Commit**

```bash
git add backend/tests/test_collector_runner.py backend/app/collector_runner.py
git commit -m "feat: add collector task runner"
```

### 任务 2：先写只读接口失败测试

**文件：**
- 修改：`/opt/trae/InsightOps/backend/tests/test_asset_sync_api.py`
- 修改：`/opt/trae/InsightOps/backend/tests/test_idle_export_api.py`
- 修改：`/opt/trae/InsightOps/backend/app/api/routes/assets.py`
- 修改：`/opt/trae/InsightOps/backend/app/api/routes/idle.py`
- 修改：`/opt/trae/InsightOps/backend/app/services/vm_asset_service.py`
- 修改：`/opt/trae/InsightOps/backend/app/repositories/idle_vm_snapshot_repository.py`
- 修改：`/opt/trae/InsightOps/backend/app/services/idle_analysis_service.py`
- 修改：`/opt/trae/InsightOps/backend/app/schemas/vm_asset.py`

- [ ] **步骤 1：编写失败的测试**

```python
def test_list_assets_returns_vm_asset_fields(client: TestClient, session_factory: sessionmaker[Session]) -> None:
    with session_factory() as session:
        session.add(VMAsset(ip="10.0.0.1", hostname="vm-01", owner="alice"))
        session.commit()

    response = client.get("/api/assets")

    assert response.status_code == 200
    assert response.json() == {
        "items": [{"ip": "10.0.0.1", "hostname": "vm-01", "owner": "alice", "last_rdp_login_at": None}]
    }
```

```python
def test_list_idle_snapshots_returns_latest_snapshot_rows(client: TestClient, session_factory: sessionmaker[Session]) -> None:
    response = client.get("/api/v1/idle")

    assert response.status_code == 200
    assert response.json()["items"][0]["ip"] == "10.0.0.10"
```

- [ ] **步骤 2：运行测试验证失败**

运行：`cd /opt/trae/InsightOps/backend && .venv/bin/pytest tests/test_asset_sync_api.py tests/test_idle_export_api.py -q`
预期：`FAIL`，报错 `404 != 200` 或响应结构不匹配

- [ ] **步骤 3：编写最少实现代码**

```python
@router.get("", response_model=VMAssetListResponse)
def list_assets(session: Session = Depends(get_session)) -> VMAssetListResponse:
    return VMAssetService(session).list_assets()
```

```python
@router.get("", response_model=IdleVMListResponse)
def list_idle_snapshots(session: Session = Depends(get_session)) -> IdleVMListResponse:
    return IdleAnalysisService(session).list_idle_assets()
```

- [ ] **步骤 4：运行测试验证通过**

运行：`cd /opt/trae/InsightOps/backend && .venv/bin/pytest tests/test_asset_sync_api.py tests/test_idle_export_api.py -q`
预期：`PASS`

- [ ] **步骤 5：Commit**

```bash
git add backend/tests/test_asset_sync_api.py backend/tests/test_idle_export_api.py backend/app/api/routes/assets.py backend/app/api/routes/idle.py backend/app/services/vm_asset_service.py backend/app/repositories/idle_vm_snapshot_repository.py backend/app/services/idle_analysis_service.py backend/app/schemas/vm_asset.py
git commit -m "feat: add backend read APIs"
```

### 任务 3：接通部署入口并完成回归

**文件：**
- 修改：`/opt/trae/InsightOps/deploy/Dockerfile.collector`
- 修改：`/opt/trae/InsightOps/backend/app/collector_runner.py`
- 测试：`/opt/trae/InsightOps/backend/tests/test_collector_runner.py`

- [ ] **步骤 1：编写失败的默认命令验证**

```python
def test_default_task_name_is_idle_analysis() -> None:
    assert collector_runner.resolve_task_name(None, None) == "idle_analysis"
```

- [ ] **步骤 2：运行测试验证失败**

运行：`cd /opt/trae/InsightOps/backend && .venv/bin/pytest tests/test_collector_runner.py -q`
预期：`FAIL`

- [ ] **步骤 3：编写最少实现代码**

```dockerfile
CMD ["python", "-m", "app.collector_runner"]
```

- [ ] **步骤 4：运行完整测试验证通过**

运行：`cd /opt/trae/InsightOps/backend && .venv/bin/pytest -q`
预期：`PASS`

- [ ] **步骤 5：Commit**

```bash
git add deploy/Dockerfile.collector backend/app/collector_runner.py backend/tests/test_collector_runner.py
git commit -m "fix: wire collector runtime entrypoint"
```
