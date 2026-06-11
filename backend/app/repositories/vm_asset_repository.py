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

        statement = select(VMAsset).where(VMAsset.ip.in_(ips))
        assets = self.session.scalars(statement).all()
        return {asset.ip: asset for asset in assets}

    def upsert_many(self, payloads: list[dict[str, object]]) -> int:
        deduplicated_payloads = self._deduplicate_payloads(payloads)
        existing_assets = self.get_by_ips([str(payload["ip"]) for payload in deduplicated_payloads])

        for payload in deduplicated_payloads:
            ip = str(payload["ip"])
            asset = existing_assets.get(ip)

            if asset is None:
                asset = VMAsset(ip=ip)
                self.session.add(asset)
                existing_assets[ip] = asset

            for field_name, value in payload.items():
                setattr(asset, field_name, value)

        self.session.flush()
        return len(deduplicated_payloads)
