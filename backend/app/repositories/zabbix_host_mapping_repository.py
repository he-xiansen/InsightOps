from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.zabbix_host_mapping import ZabbixHostMapping


class ZabbixHostMappingRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    @staticmethod
    def _deduplicate_payloads(payloads: list[dict[str, object]]) -> list[dict[str, object]]:
        deduplicated_by_ip: dict[str, dict[str, object]] = {}

        for payload in payloads:
            ip = str(payload["ip"])
            deduplicated_by_ip[ip] = dict(payload)

        return list(deduplicated_by_ip.values())

    def get_by_ips(self, ips: list[str]) -> dict[str, ZabbixHostMapping]:
        if not ips:
            return {}

        statement = select(ZabbixHostMapping).where(ZabbixHostMapping.ip.in_(ips))
        mappings = self.session.scalars(statement).all()
        return {mapping.ip: mapping for mapping in mappings}

    def upsert_many(self, payloads: list[dict[str, object]]) -> int:
        deduplicated_payloads = self._deduplicate_payloads(payloads)
        existing_mappings = self.get_by_ips([str(payload["ip"]) for payload in deduplicated_payloads])

        for payload in deduplicated_payloads:
            ip = str(payload["ip"])
            mapping = existing_mappings.get(ip)

            if mapping is None:
                mapping = ZabbixHostMapping(ip=ip)
                self.session.add(mapping)
                existing_mappings[ip] = mapping

            for field_name, value in payload.items():
                setattr(mapping, field_name, value)

        self.session.flush()
        return len(deduplicated_payloads)
