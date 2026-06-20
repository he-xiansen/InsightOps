from datetime import datetime, timezone
from app.core.settings import CN_TZ

from sqlalchemy.orm import Session

from app.models.sync_job import SyncJob
from app.repositories.vm_asset_repository import VMAssetRepository
from app.schemas.vm_asset import (
    AssetSyncResponse,
    AssetSyncResponseData,
    BulkUpsertVMAssetsRequest,
    BulkUpsertVMAssetsResponse,
    VMAssetListItem,
    VMAssetListResponse,
    VMAssetPerfItem,
)


def _calc_idle_days(last_rdp_login_at: datetime | None) -> int:
    if last_rdp_login_at is None:
        return -1
    now = datetime.now(CN_TZ)
    login = last_rdp_login_at
    if login.tzinfo is None:
        login = login.replace(tzinfo=CN_TZ)
    return max((now - login).days, 0)


def _calc_status(last_seen_at: datetime | None) -> str:
    """根据最后在线时间实时计算状态
    - 客户端 10 分钟内有请求（RDP ingest / 性能数据）→ active
    - 否则 → inactive
    """
    if last_seen_at is None:
        return "inactive"
    now = datetime.now(CN_TZ)
    seen = last_seen_at
    if seen.tzinfo is None:
        seen = seen.replace(tzinfo=CN_TZ)
    if (now - seen).total_seconds() <= 600:  # 10 分钟
        return "active"
    return "inactive"


class VMAssetService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = VMAssetRepository(session)

    @staticmethod
    def _serialize_payload(payload: BulkUpsertVMAssetsRequest) -> list[dict[str, object]]:
        serialized_items: list[dict[str, object]] = []
        for item in payload.items:
            item_payload = item.model_dump(exclude_unset=True)
            item_payload.setdefault("status", item.status)
            serialized_items.append(item_payload)
        return serialized_items

    def bulk_upsert(self, payload: BulkUpsertVMAssetsRequest) -> BulkUpsertVMAssetsResponse:
        serialized_items = self._serialize_payload(payload)
        upserted_count = self.repository.upsert_many(serialized_items)
        self.session.commit()
        return BulkUpsertVMAssetsResponse(
            processed_count=len(serialized_items),
            upserted_count=upserted_count,
        )

    def list_assets(self) -> VMAssetListResponse:
        assets = self.repository.list_all()
        return VMAssetListResponse(
            items=[
                VMAssetListItem(
                    ip=asset.ip,
                    hostname=asset.hostname,
                    department=asset.department,
                    owner=asset.owner,
                    phone=asset.phone,
                    mobile=asset.mobile,
                    os_type=asset.os_type,
                    status=_calc_status(asset.last_seen_at),
                    last_rdp_login_at=asset.last_rdp_login_at,
                )
                for asset in assets
            ]
        )

    def list_assets_with_perf(self) -> VMAssetListResponse:
        """返回含闲置天数、性能评估的资产列表"""
        from sqlalchemy import func, desc
        from app.models.perf_metric import PerfMetric

        assets = self.repository.list_all()
        ips = [a.ip for a in assets]

        # 批量查询各主机最新的性能数据
        # 用子查询取每个 ip 最新的 perf_metric
        if ips:
            subq = (
                self.session.query(
                    PerfMetric.ip,
                    func.max(PerfMetric.collected_at).label("max_time")
                )
                .filter(PerfMetric.ip.in_(ips))
                .group_by(PerfMetric.ip)
                .subquery()
            )
            latest_perf_rows = self.session.query(PerfMetric).join(
                subq,
                (PerfMetric.ip == subq.c.ip) & (PerfMetric.collected_at == subq.c.max_time)
            ).all()
            perf_map = {p.ip: p for p in latest_perf_rows}
        else:
            perf_map = {}

        def _idle(idays):
            return "关注" if idays >= 30 else "保留"

        return VMAssetListResponse(
            items=[
                VMAssetPerfItem(
                    ip=asset.ip,
                    hostname=asset.hostname,
                    department=asset.department,
                    owner=asset.owner,
                    phone=asset.phone,
                    mobile=asset.mobile,
                    os_type=asset.os_type,
                    status=_calc_status(asset.last_seen_at),
                    last_rdp_login_at=asset.last_rdp_login_at,
                    idle_days=_calc_idle_days(asset.last_rdp_login_at),
                    cpu_avg=round(perf_map[asset.ip].cpu_avg, 1) if asset.ip in perf_map and perf_map[asset.ip].cpu_avg is not None else None,
                    mem_avg=round(perf_map[asset.ip].mem_avg, 1) if asset.ip in perf_map and perf_map[asset.ip].mem_avg is not None else None,
                    recommendation=_idle(_calc_idle_days(asset.last_rdp_login_at)),
                )
                for asset in assets
            ]
        )

    def update_asset(self, ip: str, payload) -> dict:
        """更新单台主机信息"""
        from app.models.vm_asset import VMAsset
        from app.schemas.vm_asset import VMAssetListItem

        asset = self.session.query(VMAsset).filter(VMAsset.ip == ip).first()
        if not asset:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail=f"Host {ip} not found")

        update_data = payload.model_dump(exclude_unset=True, exclude_none=True)
        for key, value in update_data.items():
            if hasattr(asset, key):
                setattr(asset, key, value)
        self.session.commit()

        return VMAssetListItem(
            ip=asset.ip,
            hostname=asset.hostname,
            department=asset.department,
            owner=asset.owner,
            phone=asset.phone,
            mobile=asset.mobile,
            os_type=asset.os_type,
            status=_calc_status(asset.last_seen_at),
            last_rdp_login_at=asset.last_rdp_login_at,
        ).model_dump()

    def sync_assets(self, payload: BulkUpsertVMAssetsRequest) -> AssetSyncResponse:
        started_at = datetime.now(CN_TZ)
        serialized_items = self._serialize_payload(payload)
        upserted_count = self.repository.upsert_many(serialized_items)
        self.session.add(
            SyncJob(
                job_type="asset_sync",
                started_at=started_at,
                finished_at=datetime.now(CN_TZ),
                status="success",
                processed_count=upserted_count,
            )
        )
        self.session.commit()
        return AssetSyncResponse(
            code=0,
            message="success",
            data=AssetSyncResponseData(upserted_count=upserted_count),
        )
