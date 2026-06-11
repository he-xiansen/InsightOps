from datetime import datetime, timezone

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
)


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

    def bulk_upsert(
        self,
        payload: BulkUpsertVMAssetsRequest,
    ) -> BulkUpsertVMAssetsResponse:
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
                    lab=asset.lab,
                    owner=asset.owner,
                    os_type=asset.os_type,
                    status=asset.status,
                    last_rdp_login_at=asset.last_rdp_login_at,
                )
                for asset in assets
            ]
        )

    def sync_assets(self, payload: BulkUpsertVMAssetsRequest) -> AssetSyncResponse:
        started_at = datetime.now(timezone.utc)
        serialized_items = self._serialize_payload(payload)
        upserted_count = self.repository.upsert_many(serialized_items)
        self.session.add(
            SyncJob(
                job_type="asset_sync",
                started_at=started_at,
                finished_at=datetime.now(timezone.utc),
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
