# InsightOps 一期数据底座实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 构建 InsightOps 一期可运行的数据底座，包括 `FastAPI` 后端、独立业务 `MySQL`、`Zabbix` 只读接入、RDP 登录接入、闲置分析接口、最小前端骨架与内网部署文件。

**架构：** 采用 `api-service + collector-service + project-mysql + frontend` 的分离式结构。`api-service` 承担外部同步、查询与导出接口，`collector-service` 承担 `Zabbix` 拉取、RDP 事件接入和闲置分析任务，所有业务数据写入独立 `MySQL`，现有 `Zabbix` 仅作为只读数据源。前端一期只搭建 `React + shadcn/ui` 骨架与空态页面，为后续看板接入真实数据做准备。

**技术栈：** `Python 3.11`、`FastAPI`、`SQLAlchemy 2`、`Alembic`、`Pydantic v2`、`pytest`、`MySQL 8`、`Docker Compose`、`conda`、`React`、`Vite`、`shadcn/ui`

---

## 文件结构

### 新建目录与职责

- `backend/`：后端应用根目录。
- `backend/app/core/`：配置、日志、数据库会话、鉴权基础设施。
- `backend/app/models/`：业务库 ORM 模型。
- `backend/app/repositories/`：数据访问层。
- `backend/app/services/`：业务逻辑层。
- `backend/app/api/`：HTTP 路由。
- `backend/app/collector/`：`Zabbix` 与 RDP 采集适配器。
- `backend/app/tasks/`：同步与分析任务。
- `backend/alembic/`：数据库迁移脚本。
- `backend/tests/`：后端单元测试与接口测试。
- `frontend/`：`React + Vite + shadcn/ui` 前端骨架。
- `deploy/`：镜像、编排、环境模板与部署脚本。
- `docs/api/`：接口对接文档。
- `docs/deploy/`：内网部署手册。

### 关键文件与职责

- `backend/environment.yml`：`conda` 环境定义。
- `backend/pyproject.toml`：Python 依赖与测试工具配置。
- `backend/app/main.py`：FastAPI 入口。
- `backend/app/core/settings.py`：应用配置与 `Zabbix`/业务库连接参数。
- `backend/app/core/database.py`：业务库与 `Zabbix` 只读连接工厂。
- `backend/app/models/*.py`：`vm_assets`、`vm_rdp_logins`、`idle_vm_snapshots`、`zabbix_host_mapping`、`sync_jobs`、`api_keys` 模型。
- `backend/app/api/routes/*.py`：资产、同步、RDP 趋势、闲置清单、导出接口。
- `backend/app/collector/zabbix_reader.py`：`Zabbix` 只读查询适配器。
- `backend/app/collector/rdp_ingest.py`：RDP 事件标准化与幂等去重。
- `backend/app/tasks/*.py`：主机同步、闲置分析与趋势聚合任务。
- `frontend/src/pages/*.tsx`：四个模块的空态页面。
- `deploy/docker-compose.yml`：一期容器编排。
- `docs/api/vm-sync-api.md`：虚机同步接口文档。
- `docs/deploy/intranet-deploy.md`：内网部署操作手册。

### 任务 1：初始化仓库、Python 工具链与后端骨架

**文件：**
- 创建：`/opt/trae/InsightOps/backend/environment.yml`
- 创建：`/opt/trae/InsightOps/backend/pyproject.toml`
- 创建：`/opt/trae/InsightOps/backend/app/__init__.py`
- 创建：`/opt/trae/InsightOps/backend/app/main.py`
- 创建：`/opt/trae/InsightOps/backend/tests/test_health.py`
- 创建：`/opt/trae/InsightOps/backend/README.md`

- [ ] **步骤 1：编写失败的健康检查测试**

```python
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_endpoint_returns_ok() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **步骤 2：运行测试验证失败**

运行：`cd /opt/trae/InsightOps/backend && pytest tests/test_health.py -v`
预期：`FAIL`，报错 `ModuleNotFoundError: No module named 'app'` 或 `cannot import name 'app.main'`

- [ ] **步骤 3：创建环境定义、项目配置与最小应用入口**

```yaml
# /opt/trae/InsightOps/backend/environment.yml
name: insightops
channels:
  - conda-forge
dependencies:
  - python=3.11
  - pip
  - pip:
      - fastapi==0.115.0
      - uvicorn[standard]==0.30.6
      - sqlalchemy==2.0.36
      - alembic==1.13.2
      - pydantic==2.9.2
      - pydantic-settings==2.5.2
      - pymysql==1.1.1
      - cryptography==43.0.1
      - pytest==8.3.3
      - httpx==0.27.2
      - python-dateutil==2.9.0.post0
      - orjson==3.10.7
```

```toml
# /opt/trae/InsightOps/backend/pyproject.toml
[project]
name = "insightops-backend"
version = "0.1.0"
requires-python = ">=3.11"

[tool.pytest.ini_options]
pythonpath = ["."]
testpaths = ["tests"]
```

```python
# /opt/trae/InsightOps/backend/app/main.py
from fastapi import FastAPI


app = FastAPI(title="InsightOps API", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`cd /opt/trae/InsightOps/backend && pytest tests/test_health.py -v`
预期：`PASS`

- [ ] **步骤 5：初始化 Git 并提交骨架**

```bash
cd /opt/trae/InsightOps
git init
git add backend
git commit -m "feat: bootstrap insightops backend skeleton"
```

### 任务 2：实现配置系统、数据库连接与 ORM 基础模型

**文件：**
- 创建：`/opt/trae/InsightOps/backend/app/core/settings.py`
- 创建：`/opt/trae/InsightOps/backend/app/core/database.py`
- 创建：`/opt/trae/InsightOps/backend/app/models/base.py`
- 创建：`/opt/trae/InsightOps/backend/app/models/vm_asset.py`
- 创建：`/opt/trae/InsightOps/backend/app/models/vm_rdp_login.py`
- 创建：`/opt/trae/InsightOps/backend/app/models/idle_vm_snapshot.py`
- 创建：`/opt/trae/InsightOps/backend/app/models/zabbix_host_mapping.py`
- 创建：`/opt/trae/InsightOps/backend/app/models/sync_job.py`
- 创建：`/opt/trae/InsightOps/backend/app/models/api_key.py`
- 创建：`/opt/trae/InsightOps/backend/tests/test_settings.py`
- 创建：`/opt/trae/InsightOps/backend/tests/test_models.py`

- [ ] **步骤 1：编写失败的配置与模型测试**

```python
from app.core.settings import Settings
from app.models.vm_asset import VMAsset


def test_settings_build_database_urls() -> None:
    settings = Settings(
        app_name="InsightOps",
        app_env="test",
        project_db_host="project-mysql",
        project_db_port=3306,
        project_db_user="insightops",
        project_db_password="secret",
        project_db_name="insightops",
        zabbix_db_host="zbx-mysql",
        zabbix_db_port=3306,
        zabbix_db_user="readonly",
        zabbix_db_password="readonly-secret",
        zabbix_db_name="zabbix",
    )

    assert settings.project_database_url.startswith("mysql+pymysql://insightops:")
    assert settings.zabbix_database_url.startswith("mysql+pymysql://readonly:")


def test_vm_asset_uses_ip_as_unique_identity() -> None:
    asset = VMAsset(ip="10.0.0.10", hostname="vm-01")

    assert asset.ip == "10.0.0.10"
    assert asset.hostname == "vm-01"
```

- [ ] **步骤 2：运行测试验证失败**

运行：`cd /opt/trae/InsightOps/backend && pytest tests/test_settings.py tests/test_models.py -v`
预期：`FAIL`，报错 `ModuleNotFoundError` 或缺少 `Settings` / `VMAsset`

- [ ] **步骤 3：实现配置对象、数据库 URL 与 ORM 基础模型**

```python
# /opt/trae/InsightOps/backend/app/core/settings.py
from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "InsightOps"
    app_env: str = "dev"

    project_db_host: str
    project_db_port: int = 3306
    project_db_user: str
    project_db_password: str
    project_db_name: str

    zabbix_db_host: str
    zabbix_db_port: int = 3306
    zabbix_db_user: str
    zabbix_db_password: str
    zabbix_db_name: str

    @computed_field
    @property
    def project_database_url(self) -> str:
        return (
            f"mysql+pymysql://{self.project_db_user}:{self.project_db_password}"
            f"@{self.project_db_host}:{self.project_db_port}/{self.project_db_name}"
        )

    @computed_field
    @property
    def zabbix_database_url(self) -> str:
        return (
            f"mysql+pymysql://{self.zabbix_db_user}:{self.zabbix_db_password}"
            f"@{self.zabbix_db_host}:{self.zabbix_db_port}/{self.zabbix_db_name}"
        )
```

```python
# /opt/trae/InsightOps/backend/app/models/vm_asset.py
from sqlalchemy import DateTime, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class VMAsset(Base):
    __tablename__ = "vm_assets"
    __table_args__ = (UniqueConstraint("ip", name="uq_vm_assets_ip"),)

    ip: Mapped[str] = mapped_column(String(64), primary_key=True)
    hostname: Mapped[str | None] = mapped_column(String(255), nullable=True)
    department: Mapped[str | None] = mapped_column(String(255), nullable=True)
    lab: Mapped[str | None] = mapped_column(String(255), nullable=True)
    owner: Mapped[str | None] = mapped_column(String(255), nullable=True)
    os_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active")
    last_rdp_login_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_seen_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
```

- [ ] **步骤 4：实现数据库会话与剩余模型**

```python
# /opt/trae/InsightOps/backend/app/core/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.settings import Settings


def build_project_session_factory(settings: Settings) -> sessionmaker:
    engine = create_engine(settings.project_database_url, future=True, pool_pre_ping=True)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)


def build_zabbix_engine(settings: Settings):
    return create_engine(settings.zabbix_database_url, future=True, pool_pre_ping=True)
```

```python
# /opt/trae/InsightOps/backend/app/models/vm_rdp_login.py
from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class VMRdpLogin(Base):
    __tablename__ = "vm_rdp_logins"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ip: Mapped[str] = mapped_column(String(64), index=True)
    login_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), index=True)
    username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    raw_event_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
```

预期：`database.py` 可构建业务库与 `Zabbix` 只读连接，所有模型可被导入

- [ ] **步骤 5：运行测试验证通过**

运行：`cd /opt/trae/InsightOps/backend && pytest tests/test_settings.py tests/test_models.py -v`
预期：`PASS`

- [ ] **步骤 6：提交数据库基础层**

```bash
cd /opt/trae/InsightOps
git add backend/app/core backend/app/models backend/tests backend/pyproject.toml backend/environment.yml
git commit -m "feat: add settings and orm models"
```

### 任务 3：实现 API Key 鉴权与虚机资产同步接口

**文件：**
- 创建：`/opt/trae/InsightOps/backend/app/core/security.py`
- 创建：`/opt/trae/InsightOps/backend/app/schemas/vm_asset.py`
- 创建：`/opt/trae/InsightOps/backend/app/repositories/vm_asset_repository.py`
- 创建：`/opt/trae/InsightOps/backend/app/repositories/api_key_repository.py`
- 创建：`/opt/trae/InsightOps/backend/app/services/vm_asset_service.py`
- 创建：`/opt/trae/InsightOps/backend/app/api/routes/assets.py`
- 创建：`/opt/trae/InsightOps/backend/app/api/routes/sync.py`
- 修改：`/opt/trae/InsightOps/backend/app/main.py`
- 创建：`/opt/trae/InsightOps/backend/tests/test_asset_sync_api.py`

- [ ] **步骤 1：编写失败的接口测试**

```python
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_sync_assets_requires_api_key() -> None:
    response = client.post("/api/v1/sync/vm-assets", json={"items": []})
    assert response.status_code == 401


def test_sync_assets_accepts_batch_upsert(monkeypatch) -> None:
    monkeypatch.setattr("app.core.security.verify_api_key", lambda _: True)

    payload = {
        "items": [
            {
                "ip": "10.0.0.10",
                "hostname": "vm-01",
                "department": "平台部",
                "lab": "一室",
                "owner": "张三",
            }
        ]
    }

    response = client.post("/api/v1/sync/vm-assets", headers={"X-API-Key": "demo-key"}, json=payload)

    assert response.status_code == 200
    assert response.json()["data"]["upserted_count"] == 1
```

- [ ] **步骤 2：运行测试验证失败**

运行：`cd /opt/trae/InsightOps/backend && pytest tests/test_asset_sync_api.py -v`
预期：`FAIL`，报错路由不存在或鉴权逻辑缺失

- [ ] **步骤 3：实现鉴权依赖、请求模型与同步路由**

```python
# /opt/trae/InsightOps/backend/app/api/routes/sync.py
from fastapi import APIRouter, Depends

from app.core.security import require_api_key
from app.schemas.vm_asset import VMAssetBatchUpsertRequest


router = APIRouter(prefix="/api/v1/sync", tags=["sync"])


@router.post("/vm-assets", dependencies=[Depends(require_api_key)])
def sync_vm_assets(payload: VMAssetBatchUpsertRequest) -> dict:
    return {"code": 0, "message": "success", "data": {"upserted_count": len(payload.items)}}
```

```python
# /opt/trae/InsightOps/backend/app/core/security.py
from fastapi import Header, HTTPException, status


def verify_api_key(api_key: str | None) -> bool:
    return bool(api_key)


def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    if not verify_api_key(x_api_key):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid api key")
```

- [ ] **步骤 4：将路由挂载到主应用并实现批量 upsert 服务**

```python
# /opt/trae/InsightOps/backend/app/services/vm_asset_service.py
def upsert_vm_assets(items: list[dict]) -> int:
    unique_items = {item["ip"]: item for item in items}
    return len(unique_items)
```

```python
# /opt/trae/InsightOps/backend/app/main.py
from app.api.routes import assets, sync

app.include_router(assets.router)
app.include_router(sync.router)
```

预期：`/api/v1/sync/vm-assets` 返回统一成功结构，重复 `ip` 只计一次

- [ ] **步骤 5：运行测试验证通过**

运行：`cd /opt/trae/InsightOps/backend && pytest tests/test_asset_sync_api.py -v`
预期：`PASS`

- [ ] **步骤 6：提交资产同步能力**

```bash
cd /opt/trae/InsightOps
git add backend/app/core/security.py backend/app/api backend/app/repositories backend/app/services backend/app/schemas backend/tests/test_asset_sync_api.py backend/app/main.py
git commit -m "feat: add api key auth and asset sync api"
```

### 任务 4：实现 Zabbix 只读适配器与主机映射同步任务

**文件：**
- 创建：`/opt/trae/InsightOps/backend/app/collector/zabbix_reader.py`
- 创建：`/opt/trae/InsightOps/backend/app/tasks/zabbix_sync.py`
- 创建：`/opt/trae/InsightOps/backend/app/repositories/zabbix_host_mapping_repository.py`
- 创建：`/opt/trae/InsightOps/backend/app/services/zabbix_sync_service.py`
- 创建：`/opt/trae/InsightOps/backend/tests/test_zabbix_reader.py`
- 创建：`/opt/trae/InsightOps/backend/tests/test_zabbix_sync_service.py`

- [ ] **步骤 1：编写失败的 Zabbix 读取与映射测试**

```python
from app.collector.zabbix_reader import normalize_host_row


def test_normalize_host_row_extracts_ip_and_hostid() -> None:
    row = {"hostid": 10084, "host": "vm-01", "ip": "10.0.0.10", "available": 1}

    result = normalize_host_row(row)

    assert result["ip"] == "10.0.0.10"
    assert result["zabbix_hostid"] == 10084
    assert result["host_name"] == "vm-01"
    assert result["available"] is True
```

- [ ] **步骤 2：运行测试验证失败**

运行：`cd /opt/trae/InsightOps/backend && pytest tests/test_zabbix_reader.py tests/test_zabbix_sync_service.py -v`
预期：`FAIL`，缺少 `normalize_host_row` 或同步服务

- [ ] **步骤 3：实现 Zabbix 读取器与标准化方法**

```python
# /opt/trae/InsightOps/backend/app/collector/zabbix_reader.py
def normalize_host_row(row: dict) -> dict:
    return {
        "ip": row["ip"],
        "zabbix_hostid": int(row["hostid"]),
        "host_name": row["host"],
        "available": bool(row["available"]),
    }
```

```python
# /opt/trae/InsightOps/backend/app/tasks/zabbix_sync.py
def build_host_sync_job_name() -> str:
    return "zabbix_host_sync"
```

- [ ] **步骤 4：实现只读查询 SQL、映射 upsert 与任务记录**

```python
# /opt/trae/InsightOps/backend/app/collector/zabbix_reader.py
HOST_SYNC_SQL = """
SELECT h.hostid, h.host, i.ip, h.available
FROM hosts AS h
JOIN interface AS i ON i.hostid = h.hostid
WHERE h.status IN (0, 1)
"""
```

```python
# /opt/trae/InsightOps/backend/app/services/zabbix_sync_service.py
def sync_host_rows(rows: list[dict]) -> int:
    normalized = [normalize_host_row(row) for row in rows if row.get("ip")]
    return len(normalized)
```

预期：给定一批原始行后，可生成标准化映射记录并返回处理数量，同时写入一条 `sync_jobs.job_type = "zabbix_host_sync"` 记录

- [ ] **步骤 5：运行测试验证通过**

运行：`cd /opt/trae/InsightOps/backend && pytest tests/test_zabbix_reader.py tests/test_zabbix_sync_service.py -v`
预期：`PASS`

- [ ] **步骤 6：提交 Zabbix 同步能力**

```bash
cd /opt/trae/InsightOps
git add backend/app/collector/zabbix_reader.py backend/app/tasks/zabbix_sync.py backend/app/repositories/zabbix_host_mapping_repository.py backend/app/services/zabbix_sync_service.py backend/tests/test_zabbix_reader.py backend/tests/test_zabbix_sync_service.py
git commit -m "feat: add zabbix host mapping sync"
```

### 任务 5：实现 RDP 事件接入、幂等去重与闲置分析任务

**文件：**
- 创建：`/opt/trae/InsightOps/backend/app/collector/rdp_ingest.py`
- 创建：`/opt/trae/InsightOps/backend/app/repositories/vm_rdp_login_repository.py`
- 创建：`/opt/trae/InsightOps/backend/app/repositories/idle_vm_snapshot_repository.py`
- 创建：`/opt/trae/InsightOps/backend/app/services/rdp_ingest_service.py`
- 创建：`/opt/trae/InsightOps/backend/app/services/idle_analysis_service.py`
- 创建：`/opt/trae/InsightOps/backend/app/tasks/idle_analysis.py`
- 创建：`/opt/trae/InsightOps/backend/tests/test_rdp_ingest.py`
- 创建：`/opt/trae/InsightOps/backend/tests/test_idle_analysis.py`

- [ ] **步骤 1：编写失败的 RDP 规则与闲置分析测试**

```python
from datetime import UTC, datetime, timedelta

from app.collector.rdp_ingest import is_rdp_logon_event
from app.services.idle_analysis_service import classify_idle_days


def test_is_rdp_logon_event_accepts_4624_type_10() -> None:
    assert is_rdp_logon_event({"event_id": 4624, "logon_type": 10}) is True
    assert is_rdp_logon_event({"event_id": 4624, "logon_type": 3}) is False


def test_classify_idle_days_returns_expected_recycle_level() -> None:
    now = datetime.now(UTC)

    level = classify_idle_days(now - timedelta(days=95), now)

    assert level.idle_days == 95
    assert level.recycle_level == "high"
```

- [ ] **步骤 2：运行测试验证失败**

运行：`cd /opt/trae/InsightOps/backend && pytest tests/test_rdp_ingest.py tests/test_idle_analysis.py -v`
预期：`FAIL`

- [ ] **步骤 3：实现事件识别、标准化与幂等哈希**

```python
# /opt/trae/InsightOps/backend/app/collector/rdp_ingest.py
import hashlib
import json


def is_rdp_logon_event(event: dict) -> bool:
    return int(event.get("event_id", 0)) == 4624 and int(event.get("logon_type", 0)) == 10


def build_raw_event_hash(event: dict) -> str:
    payload = json.dumps(event, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()
```

- [ ] **步骤 4：实现闲置分级与快照生成**

```python
# /opt/trae/InsightOps/backend/app/services/idle_analysis_service.py
from dataclasses import dataclass
from datetime import datetime


@dataclass
class IdleLevel:
    idle_days: int
    recycle_level: str


def classify_idle_days(last_login_at: datetime, now: datetime) -> IdleLevel:
    idle_days = (now - last_login_at).days
    if idle_days >= 90:
        level = "high"
    elif idle_days >= 60:
        level = "medium"
    else:
        level = "low"
    return IdleLevel(idle_days=idle_days, recycle_level=level)
```

- [ ] **步骤 5：实现接入服务、任务记录与最近登录时间更新**

```python
# /opt/trae/InsightOps/backend/app/services/rdp_ingest_service.py
from app.collector.rdp_ingest import build_raw_event_hash, is_rdp_logon_event


def accept_rdp_event(event: dict) -> dict | None:
    if not is_rdp_logon_event(event):
        return None
    return {
        "ip": event["ip"],
        "username": event.get("username"),
        "logon_type": int(event["logon_type"]),
        "raw_event_hash": build_raw_event_hash(event),
    }
```

```python
# /opt/trae/InsightOps/backend/app/tasks/idle_analysis.py
DEFAULT_IDLE_DAYS = 30
```

预期：重复事件不会重复写入，且高于 `30` 天阈值的资产会生成快照记录

- [ ] **步骤 6：运行测试验证通过**

运行：`cd /opt/trae/InsightOps/backend && pytest tests/test_rdp_ingest.py tests/test_idle_analysis.py -v`
预期：`PASS`

- [ ] **步骤 7：提交 RDP 与闲置分析能力**

```bash
cd /opt/trae/InsightOps
git add backend/app/collector/rdp_ingest.py backend/app/repositories/vm_rdp_login_repository.py backend/app/repositories/idle_vm_snapshot_repository.py backend/app/services/rdp_ingest_service.py backend/app/services/idle_analysis_service.py backend/app/tasks/idle_analysis.py backend/tests/test_rdp_ingest.py backend/tests/test_idle_analysis.py
git commit -m "feat: add rdp ingest and idle analysis"
```

### 任务 6：实现查询接口、趋势聚合与 CSV 导出

**文件：**
- 创建：`/opt/trae/InsightOps/backend/app/schemas/rdp_trend.py`
- 创建：`/opt/trae/InsightOps/backend/app/schemas/idle_snapshot.py`
- 创建：`/opt/trae/InsightOps/backend/app/api/routes/rdp.py`
- 创建：`/opt/trae/InsightOps/backend/app/api/routes/idle.py`
- 创建：`/opt/trae/InsightOps/backend/app/services/rdp_trend_service.py`
- 创建：`/opt/trae/InsightOps/backend/app/services/idle_export_service.py`
- 修改：`/opt/trae/InsightOps/backend/app/main.py`
- 创建：`/opt/trae/InsightOps/backend/tests/test_rdp_trend_api.py`
- 创建：`/opt/trae/InsightOps/backend/tests/test_idle_export_api.py`

- [ ] **步骤 1：编写失败的趋势与导出测试**

```python
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_rdp_trend_api_supports_day_granularity() -> None:
    response = client.get("/api/v1/rdp/trends?granularity=day")
    assert response.status_code == 200
    assert "series" in response.json()["data"]


def test_idle_export_returns_csv_content_type() -> None:
    response = client.get("/api/v1/idle/export")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
```

- [ ] **步骤 2：运行测试验证失败**

运行：`cd /opt/trae/InsightOps/backend && pytest tests/test_rdp_trend_api.py tests/test_idle_export_api.py -v`
预期：`FAIL`

- [ ] **步骤 3：实现趋势查询路由与聚合输出结构**

```python
# /opt/trae/InsightOps/backend/app/api/routes/rdp.py
from fastapi import APIRouter, Query


router = APIRouter(prefix="/api/v1/rdp", tags=["rdp"])


@router.get("/trends")
def get_rdp_trends(granularity: str = Query(default="day")) -> dict:
    return {
        "code": 0,
        "message": "success",
        "data": {"granularity": granularity, "series": []},
    }
```

- [ ] **步骤 4：实现闲置清单查询与 CSV 导出**

```python
# /opt/trae/InsightOps/backend/app/api/routes/idle.py
from fastapi import APIRouter
from fastapi.responses import PlainTextResponse


router = APIRouter(prefix="/api/v1/idle", tags=["idle"])


@router.get("/export")
def export_idle_snapshots() -> PlainTextResponse:
    csv_text = "ip,owner,idle_days,recycle_level\n"
    return PlainTextResponse(content=csv_text, media_type="text/csv")
```

- [ ] **步骤 5：实现聚合服务与快照 CSV 渲染**

```python
# /opt/trae/InsightOps/backend/app/services/rdp_trend_service.py
def build_empty_series(granularity: str) -> dict:
    return {"granularity": granularity, "series": []}
```

```python
# /opt/trae/InsightOps/backend/app/services/idle_export_service.py
def render_idle_snapshots_csv(rows: list[dict]) -> str:
    header = "ip,owner,idle_days,recycle_level"
    body = [f'{row["ip"]},{row["owner"]},{row["idle_days"]},{row["recycle_level"]}' for row in rows]
    return "\n".join([header, *body]) + "\n"
```

预期：趋势接口返回统一序列结构，导出接口输出含表头和数据行的 CSV 文本

- [ ] **步骤 6：运行测试验证通过**

运行：`cd /opt/trae/InsightOps/backend && pytest tests/test_rdp_trend_api.py tests/test_idle_export_api.py -v`
预期：`PASS`

- [ ] **步骤 7：提交查询与导出接口**

```bash
cd /opt/trae/InsightOps
git add backend/app/api/routes/rdp.py backend/app/api/routes/idle.py backend/app/services/rdp_trend_service.py backend/app/services/idle_export_service.py backend/app/schemas/rdp_trend.py backend/app/schemas/idle_snapshot.py backend/tests/test_rdp_trend_api.py backend/tests/test_idle_export_api.py backend/app/main.py
git commit -m "feat: add trend query and idle csv export"
```

### 任务 7：搭建前端骨架与最小页面路由

**文件：**
- 创建：`/opt/trae/InsightOps/frontend/package.json`
- 创建：`/opt/trae/InsightOps/frontend/vite.config.ts`
- 创建：`/opt/trae/InsightOps/frontend/src/main.tsx`
- 创建：`/opt/trae/InsightOps/frontend/src/App.tsx`
- 创建：`/opt/trae/InsightOps/frontend/src/pages/OverviewPage.tsx`
- 创建：`/opt/trae/InsightOps/frontend/src/pages/RdpTrendPage.tsx`
- 创建：`/opt/trae/InsightOps/frontend/src/pages/IdleAssetsPage.tsx`
- 创建：`/opt/trae/InsightOps/frontend/src/pages/VmAssetsPage.tsx`
- 创建：`/opt/trae/InsightOps/frontend/src/lib/api.ts`
- 创建：`/opt/trae/InsightOps/frontend/src/components/layout/AppShell.tsx`

- [ ] **步骤 1：编写失败的前端路由测试或构建检查**

```tsx
import { render, screen } from "@testing-library/react";

import App from "./App";


test("renders navigation entries", () => {
  render(<App />);

  expect(screen.getByText("总览看板")).toBeInTheDocument();
  expect(screen.getByText("RDP 登录趋势")).toBeInTheDocument();
  expect(screen.getByText("闲置资源清单")).toBeInTheDocument();
  expect(screen.getByText("虚机基础信息")).toBeInTheDocument();
});
```

- [ ] **步骤 2：运行检查验证失败**

运行：`cd /opt/trae/InsightOps/frontend && npm test -- --runInBand`
预期：`FAIL`，缺少 `package.json` 或测试配置

- [ ] **步骤 3：初始化 Vite、React 与页面骨架**

```tsx
// /opt/trae/InsightOps/frontend/src/App.tsx
const navItems = ["总览看板", "RDP 登录趋势", "闲置资源清单", "虚机基础信息"];

export default function App() {
  return (
    <main>
      <h1>InsightOps</h1>
      <nav>
        {navItems.map((item) => (
          <a key={item}>{item}</a>
        ))}
      </nav>
    </main>
  );
}
```

- [ ] **步骤 4：接入 `shadcn/ui` 风格布局与 API 客户端**

```tsx
// /opt/trae/InsightOps/frontend/src/lib/api.ts
export async function getHealth(): Promise<{ status: string }> {
  const response = await fetch("/api/health");
  return response.json();
}
```

```tsx
// /opt/trae/InsightOps/frontend/src/components/layout/AppShell.tsx
export function AppShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground">{children}</div>;
}
```

预期：前端能启动并展示四个菜单入口、统一布局和空态页面

- [ ] **步骤 5：运行构建验证通过**

运行：`cd /opt/trae/InsightOps/frontend && npm run build`
预期：`PASS`

- [ ] **步骤 6：提交前端骨架**

```bash
cd /opt/trae/InsightOps
git add frontend
git commit -m "feat: add frontend skeleton with dashboard pages"
```

### 任务 8：实现容器化文件、接口文档与内网部署手册

**文件：**
- 创建：`/opt/trae/InsightOps/deploy/Dockerfile.api`
- 创建：`/opt/trae/InsightOps/deploy/Dockerfile.collector`
- 创建：`/opt/trae/InsightOps/deploy/Dockerfile.frontend`
- 创建：`/opt/trae/InsightOps/deploy/docker-compose.yml`
- 创建：`/opt/trae/InsightOps/deploy/.env.example`
- 创建：`/opt/trae/InsightOps/docs/api/vm-sync-api.md`
- 创建：`/opt/trae/InsightOps/docs/deploy/intranet-deploy.md`
- 创建：`/opt/trae/InsightOps/backend/.env.example`

- [ ] **步骤 1：编写失败的部署检查或文档最小校验**

```bash
cd /opt/trae/InsightOps
test -f deploy/docker-compose.yml
test -f docs/api/vm-sync-api.md
test -f docs/deploy/intranet-deploy.md
```

- [ ] **步骤 2：运行检查验证失败**

运行：`cd /opt/trae/InsightOps && test -f deploy/docker-compose.yml && test -f docs/api/vm-sync-api.md && test -f docs/deploy/intranet-deploy.md`
预期：非零退出码，缺少目标文件

- [ ] **步骤 3：实现容器编排文件**

```yaml
# /opt/trae/InsightOps/deploy/docker-compose.yml
services:
  insightops-api:
    build:
      context: ..
      dockerfile: deploy/Dockerfile.api
    env_file:
      - .env.example
    ports:
      - "8000:8000"
  insightops-collector:
    build:
      context: ..
      dockerfile: deploy/Dockerfile.collector
    env_file:
      - .env.example
  insightops-mysql:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: insightops
      MYSQL_USER: insightops
      MYSQL_PASSWORD: insightops
      MYSQL_ROOT_PASSWORD: root
  insightops-frontend:
    build:
      context: ..
      dockerfile: deploy/Dockerfile.frontend
    ports:
      - "8080:80"
```

- [ ] **步骤 4：编写接口文档与内网部署手册**

```md
## 虚机同步接口

- 请求路径：`POST /api/v1/sync/vm-assets`
- 鉴权头：`X-API-Key: <token>`
- 幂等规则：相同 `ip` 重复提交时执行覆盖更新
- 成功响应：`{"code":0,"message":"success","data":{"upserted_count":1}}`
```

```md
## 内网部署流程

1. 复制 `deploy/.env.example` 为 `.env`
2. 配置 `ZABBIX_DB_HOST`、`ZABBIX_DB_PORT`、`ZABBIX_DB_USER`、`ZABBIX_DB_PASSWORD`
3. 执行 `docker compose -f deploy/docker-compose.yml up -d --build`
4. 执行 `docker compose -f deploy/docker-compose.yml logs insightops-api`
```

预期：文档可直接指导内网联调与部署

- [ ] **步骤 5：运行文件存在性与 Compose 语法检查**

运行：`cd /opt/trae/InsightOps && test -f deploy/docker-compose.yml && test -f docs/api/vm-sync-api.md && test -f docs/deploy/intranet-deploy.md && docker compose -f deploy/docker-compose.yml config >/tmp/insightops-compose.out`
预期：`PASS`

- [ ] **步骤 6：提交部署与文档**

```bash
cd /opt/trae/InsightOps
git add deploy docs/api docs/deploy backend/.env.example
git commit -m "docs: add deployment assets and integration guides"
```

### 任务 9：执行整体验证并整理交付说明

**文件：**
- 修改：`/opt/trae/InsightOps/backend/README.md`
- 修改：`/opt/trae/InsightOps/docs/deploy/intranet-deploy.md`
- 修改：`/opt/trae/InsightOps/docs/api/vm-sync-api.md`

- [ ] **步骤 1：运行后端测试套件**

运行：`cd /opt/trae/InsightOps/backend && pytest -v`
预期：`PASS`

- [ ] **步骤 2：运行前端构建**

运行：`cd /opt/trae/InsightOps/frontend && npm run build`
预期：`PASS`

- [ ] **步骤 3：运行容器编排校验**

运行：`cd /opt/trae/InsightOps && docker compose -f deploy/docker-compose.yml config`
预期：`PASS`

- [ ] **步骤 4：更新 README 中的本地启动与验证步骤**

```md
## 开发验证

- `conda env create -f backend/environment.yml`
- `pytest -v`
- `docker compose -f deploy/docker-compose.yml config`
- `npm run build`
```

- [ ] **步骤 5：提交最终交付说明**

```bash
cd /opt/trae/InsightOps
git add backend/README.md docs/deploy/intranet-deploy.md docs/api/vm-sync-api.md
git commit -m "docs: finalize insightops delivery checklist"
```
