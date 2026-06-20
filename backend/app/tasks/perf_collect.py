"""定时从 Zabbix trends 表采集 CPU/内存数据到本地 perf_metrics 表"""
from app.core.settings import CN_TZ
from datetime import datetime

from sqlalchemy import Engine, text
from sqlalchemy.orm import Session

from app.models.perf_metric import PerfMetric
from app.models.sync_job import SyncJob
from app.models.vm_asset import VMAsset
from app.repositories.zabbix_host_mapping_repository import ZabbixHostMappingRepository


JOB_NAME = "perf_collect"

ITEMS_QUERY = """
SELECT i.hostid, i.itemid, i.key_
FROM items i
WHERE i.hostid IN :hostids
  AND i.key_ IN ('system.cpu.util', 'vm.memory.util')
"""

TRENDS_QUERY = """
SELECT t.itemid, t.clock, t.value_avg
FROM trends t
WHERE t.itemid IN :itemids
  AND t.clock > :since
ORDER BY t.clock ASC
"""


def _parse_ip_filter(ip_filter_str: str | None) -> list[str] | None:
    """解析 IP 段配置，返回 IP 前缀列表，None 表示全部"""
    if not ip_filter_str or ip_filter_str.strip() == "*":
        return None  # 全部
    prefixes = []
    for part in ip_filter_str.split(","):
        part = part.strip()
        if part.endswith(".*"):
            prefixes.append(part[:-2])
        elif part.endswith("."):
            prefixes.append(part[:-1])
        else:
            prefixes.append(part)
    return prefixes


def _ip_matches_filter(ip: str, prefixes: list[str] | None) -> bool:
    if prefixes is None:
        return True
    for prefix in prefixes:
        if ip.startswith(prefix):
            return True
    return False


def run_perf_collect(session: Session, zabbix_engine: Engine, ip_filter: str | None = None) -> int:
    started_at = datetime.now(CN_TZ)
    ip_prefixes = _parse_ip_filter(ip_filter)
    now = datetime.now(CN_TZ)

    # 1. 获取所有 Zabbix 主机映射
    mapping_repo = ZabbixHostMappingRepository(session)
    mappings = mapping_repo.list_all()

    # 2. 按 IP 段过滤
    filtered = [m for m in mappings if _ip_matches_filter(m.ip, ip_prefixes)]
    if not filtered:
        print(f"[perf_collect] no hosts match filter: {ip_filter}")
        return 0

    hostid_to_ip = {m.zabbix_hostid: m.ip for m in filtered if m.zabbix_hostid}
    hostids = list(hostid_to_ip.keys())
    if not hostids:
        return 0

    # 3. 查 itemid
    with zabbix_engine.connect() as conn:
        result = conn.execute(text(ITEMS_QUERY), {"hostids": hostids})
        cpu_itemids = []
        mem_itemids = []
        itemid_hostid_map = {}
        for row in result.mappings():
            itemid_hostid_map[row["itemid"]] = row["hostid"]
            if row["key_"] == "system.cpu.util":
                cpu_itemids.append(row["itemid"])
            elif row["key_"] == "vm.memory.util":
                mem_itemids.append(row["itemid"])

        all_itemids = cpu_itemids + mem_itemids
        if not all_itemids:
            return 0

        # 4. 找到上次采集时间
        latest = session.query(PerfMetric.collected_at).order_by(PerfMetric.collected_at.desc()).first()
        since = latest[0] if latest else datetime(2020, 1, 1, tzinfo=UTC)
        since_ts = int(since.timestamp())

        # 5. 查询 trends
        trends_result = conn.execute(
            text(TRENDS_QUERY),
            {"itemids": all_itemids, "since": since_ts},
        )

        # 组织数据：{ (ip, clock): {"cpu": val, "mem": val} }
        records: dict[tuple[str, int], dict] = {}
        for row in trends_result.mappings():
            hostid = itemid_hostid_map.get(row["itemid"])
            ip = hostid_to_ip.get(hostid)
            if not ip:
                continue
            clock = int(row["clock"])
            key = (ip, clock)
            if key not in records:
                records[key] = {"ip": ip, "collected_at": datetime.fromtimestamp(clock, tz=UTC)}
            if row["itemid"] in cpu_itemids:
                records[key]["cpu_avg"] = float(row["value_avg"])
            elif row["itemid"] in mem_itemids:
                records[key]["mem_avg"] = float(row["value_avg"])

        # 6. 批量插入
        inserted = 0
        for rec in records.values():
            # 检查是否已有
            exists = session.query(PerfMetric).filter_by(
                ip=rec["ip"], collected_at=rec["collected_at"]
            ).first()
            if not exists:
                session.add(PerfMetric(
                    ip=rec["ip"],
                    cpu_avg=rec.get("cpu_avg"),
                    mem_avg=rec.get("mem_avg"),
                    collected_at=rec["collected_at"],
                ))
                inserted += 1
                # 更新该主机的最后在线时间
                asset = session.get(VMAsset, rec["ip"])
                if asset is not None:
                    last_seen = asset.last_seen_at
                    if last_seen is not None and last_seen.tzinfo is None:
                        last_seen = last_seen.replace(tzinfo=CN_TZ)
                    collected_at = rec["collected_at"]
                    if collected_at.tzinfo is None:
                        collected_at = collected_at.replace(tzinfo=CN_TZ)
                    if last_seen is None or last_seen < collected_at:
                        asset.last_seen_at = collected_at

        # 7. 记录同步日志
        session.add(SyncJob(
            job_type=JOB_NAME,
            started_at=started_at,
            finished_at=datetime.now(CN_TZ),
            status="success",
            processed_count=inserted,
        ))
        session.commit()
        print(f"[perf_collect] inserted={inserted} hosts={len(hostids)}")
        return inserted
