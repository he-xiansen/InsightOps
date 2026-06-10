# 任务3资产同步 API 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 为后端补齐 `X-API-Key` 鉴权、VM 资产批量 upsert 服务和同步路由，并通过专用 API 测试验证行为。

**架构：** 使用 FastAPI 依赖注入提供数据库会话和 API Key 鉴权；用 schema 定义批量请求和响应；仓储层负责按 `ip` 查询与批量 upsert，服务层聚合写入和同步结果，同步路由额外记录 `SyncJob(job_type="asset_sync")` 基础统计。

**技术栈：** FastAPI、Pydantic、SQLAlchemy、pytest、SQLite（测试）

---

### 任务 1：编写失败测试覆盖鉴权与批量 upsert

**文件：**
- 创建：`backend/tests/test_asset_sync_api.py`
- 测试：`backend/tests/test_asset_sync_api.py`

- [ ] **步骤 1：编写失败的测试**

```python
def test_bulk_upsert_requires_api_key_authentication() -> None:
    response = client.post("/api/assets/bulk-upsert", json={"items": []})
    assert response.status_code == 401


def test_bulk_upsert_creates_and_updates_assets() -> None:
    response = client.post(
        "/api/assets/bulk-upsert",
        headers={"X-API-Key": "secret-key"},
        json={
            "items": [
                {"ip": "10.0.0.1", "hostname": "vm-01", "department": "研发"},
                {"ip": "10.0.0.1", "hostname": "vm-01-new", "department": "平台"},
            ]
        },
    )
    assert response.status_code == 200
    assert response.json()["processed_count"] == 2
    assert response.json()["upserted_count"] == 2
```

- [ ] **步骤 2：运行测试验证失败**

运行：`cd /opt/trae/InsightOps/backend && .venv/bin/pytest tests/test_asset_sync_api.py -v`
预期：FAIL，报错缺少 `app.api.routes` / `app.core.security` / 路由未注册。

- [ ] **步骤 3：编写最少实现代码**

```python
@router.post("/bulk-upsert")
def bulk_upsert_assets(
    payload: BulkUpsertVMAssetsRequest,
    _: APIKey = Depends(require_api_key),
    session: Session = Depends(get_session),
) -> BulkUpsertVMAssetsResponse:
    service = VMAssetService(session)
    return service.bulk_upsert(payload)
```

- [ ] **步骤 4：运行测试验证通过**

运行：`cd /opt/trae/InsightOps/backend && .venv/bin/pytest tests/test_asset_sync_api.py -v`
预期：PASS，鉴权失败用例和批量写入用例通过。

- [ ] **步骤 5：Commit**

```bash
git add backend/tests/test_asset_sync_api.py backend/app/core/security.py backend/app/schemas/vm_asset.py backend/app/repositories/api_key_repository.py backend/app/repositories/vm_asset_repository.py backend/app/services/vm_asset_service.py backend/app/api/routes/assets.py backend/app/main.py
git commit -m "feat: add asset bulk upsert api"
```

### 任务 2：扩展同步接口并记录 SyncJob 统计

**文件：**
- 创建：`backend/app/api/routes/sync.py`
- 修改：`backend/tests/test_asset_sync_api.py`
- 修改：`backend/app/services/vm_asset_service.py`
- 修改：`backend/app/main.py`

- [ ] **步骤 1：编写失败的测试**

```python
def test_sync_assets_reuses_payload_and_records_sync_job() -> None:
    response = client.post(
        "/api/sync/assets",
        headers={"X-API-Key": "secret-key"},
        json={"items": [{"ip": "10.0.0.8", "hostname": "sync-vm"}]},
    )
    assert response.status_code == 200
    assert response.json()["job_type"] == "asset_sync"
    assert response.json()["processed_count"] == 1
    assert response.json()["status"] == "success"
```

- [ ] **步骤 2：运行测试验证失败**

运行：`cd /opt/trae/InsightOps/backend && .venv/bin/pytest tests/test_asset_sync_api.py -v`
预期：FAIL，报错 `/api/sync/assets` 未注册或返回体不匹配。

- [ ] **步骤 3：编写最少实现代码**

```python
@router.post("/assets")
def sync_assets(
    payload: BulkUpsertVMAssetsRequest,
    _: APIKey = Depends(require_api_key),
    session: Session = Depends(get_session),
) -> AssetSyncResponse:
    service = VMAssetService(session)
    return service.sync_assets(payload)
```

- [ ] **步骤 4：运行测试验证通过**

运行：`cd /opt/trae/InsightOps/backend && .venv/bin/pytest tests/test_asset_sync_api.py -v`
预期：PASS，同步接口返回 `asset_sync` 统计并写入 `sync_jobs`。

- [ ] **步骤 5：Commit**

```bash
git add backend/tests/test_asset_sync_api.py backend/app/api/routes/sync.py backend/app/services/vm_asset_service.py backend/app/main.py
git commit -m "feat: add asset sync api"
```

### 任务 3：完整验证、诊断检查与最终提交

**文件：**
- 修改：`backend/tests/test_asset_sync_api.py`
- 修改：`backend/app/main.py`

- [ ] **步骤 1：运行目标测试**

```bash
cd /opt/trae/InsightOps/backend && .venv/bin/pytest tests/test_asset_sync_api.py -v
```

- [ ] **步骤 2：检查最近编辑文件诊断**

```text
GetDiagnostics:
- backend/app/core/security.py
- backend/app/schemas/vm_asset.py
- backend/app/repositories/vm_asset_repository.py
- backend/app/repositories/api_key_repository.py
- backend/app/services/vm_asset_service.py
- backend/app/api/routes/assets.py
- backend/app/api/routes/sync.py
- backend/app/main.py
- backend/tests/test_asset_sync_api.py
```

- [ ] **步骤 3：整理并提交最终变更**

```bash
git add backend/app/core/security.py backend/app/schemas/vm_asset.py backend/app/repositories/vm_asset_repository.py backend/app/repositories/api_key_repository.py backend/app/services/vm_asset_service.py backend/app/api/routes/assets.py backend/app/api/routes/sync.py backend/app/main.py backend/tests/test_asset_sync_api.py docs/superpowers/plans/2026-06-11-task3-asset-sync-api.md
git commit -m "feat: implement task3 asset sync api"
```

- [ ] **步骤 4：记录结果**

```text
- 输出改动文件列表
- 输出 pytest 结果
- 输出 commit SHA
- 输出自审问题
```
