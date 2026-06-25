from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.vm_asset import VMAsset


class VMAssetRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    @staticmethod
    def _deduplicate_payloads(payloads: list[dict[str, object]]) -> list[dict[str, object]]:
        deduplicated_by_ip: dict[str, dict[str, object]] = {}

        for payload in payloads:
            ip = str(payload["ip"])
            merged_payload = dict(deduplicated_by_ip.get(ip, {}))
            merged_payload.update(payload)
            deduplicated_by_ip[ip] = merged_payload

        return list(deduplicated_by_ip.values())

    def get_by_ips(self, ips: list[str]) -> dict[str, VMAsset]:
        if not ips:
            return {}

        statement = select(VMAsset).where(VMAsset.ip.in_(ips), VMAsset.deleted == False)
        assets = self.session.scalars(statement).all()
        return {asset.ip: asset for asset in assets}

    def list_all(self) -> list[VMAsset]:
        statement = select(VMAsset).where(VMAsset.deleted == False).order_by(VMAsset.ip)
        return self.session.scalars(statement).all()

    def upsert_many(self, payloads: list[dict[str, object]], skip_deleted: bool = False) -> int:
        deduplicated_payloads = self._deduplicate_payloads(payloads)
        ips = [str(payload["ip"]) for payload in deduplicated_payloads]
        # 包含已删除的记录
        existing_all = self._get_by_ips_include_deleted(ips)

        for payload in deduplicated_payloads:
            ip = str(payload["ip"])
            asset = existing_all.get(ip)

            # skip_deleted=True：Zabbix 自动同步跳过已删除
            if skip_deleted and asset is not None and asset.deleted:
                continue

            if asset is None:
                asset = VMAsset(ip=ip)
                self.session.add(asset)
                existing_all[ip] = asset
            elif asset.deleted:
                # 手动操作：恢复已删除主机
                asset.deleted = False

            for field_name, value in payload.items():
                if field_name == "deleted":
                    continue
                setattr(asset, field_name, value)

        self.session.flush()
        return len(deduplicated_payloads)

    def _get_by_ips_include_deleted(self, ips: list[str]) -> dict[str, VMAsset]:
        """查询 IP（包含已软删除的记录）"""
        if not ips:
            return {}
        statement = select(VMAsset).where(VMAsset.ip.in_(ips))
        assets = self.session.scalars(statement).all()
        return {asset.ip: asset for asset in assets}
