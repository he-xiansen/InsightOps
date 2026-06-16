from datetime import UTC, datetime

from sqlalchemy import Engine, text


# Zabbix item IDs for each host: CPU utilization, Memory utilization
# These are looked up at runtime via zabbix_host_mapping
PERF_QUERY = """
SELECT i.hostid, i.itemid, i.key_, i.name
FROM items i
WHERE i.hostid IN :hostids
  AND i.key_ IN ('system.cpu.util', 'vm.memory.util')
"""

TRENDS_QUERY = """
SELECT t.clock, t.itemid, t.value_avg
FROM trends t
WHERE t.itemid IN :itemids
ORDER BY t.clock ASC
"""


def fetch_perf_trends(
    zabbix_engine: Engine,
    hostid: int,
) -> dict[str, list[dict]]:
    """获取指定主机的 CPU 和内存趋势数据"""
    with zabbix_engine.connect() as conn:
        # 1. 获取该主机的 CPU/内存 itemid
        items_result = conn.execute(
            text(PERF_QUERY),
            {"hostids": [hostid]},
        )
        items = [dict(row) for row in items_result.mappings()]

        cpu_itemid = None
        mem_itemid = None
        itemid_key_map = {}

        for item in items:
            if item["key_"] == "system.cpu.util":
                cpu_itemid = item["itemid"]
                itemid_key_map[item["itemid"]] = "cpu"
            elif item["key_"] == "vm.memory.util":
                mem_itemid = item["itemid"]
                itemid_key_map[item["itemid"]] = "mem"

        itemids = []
        if cpu_itemid:
            itemids.append(cpu_itemid)
        if mem_itemid:
            itemids.append(mem_itemid)

        if not itemids:
            return {"cpu": [], "mem": []}

        # 2. 查询 trends 表
        trends_result = conn.execute(
            text(TRENDS_QUERY),
            {"itemids": itemids},
        )

        cpu_series = []
        mem_series = []

        for row in trends_result.mappings():
            key = itemid_key_map.get(row["itemid"])
            if key == "cpu":
                cpu_series.append({
                    "clock": int(row["clock"]),
                    "value_avg": float(row["value_avg"]),
                })
            elif key == "mem":
                mem_series.append({
                    "clock": int(row["clock"]),
                    "value_avg": float(row["value_avg"]),
                })

        return {"cpu": cpu_series, "mem": mem_series}


class PerfTrendService:
    def __init__(self, zabbix_engine: Engine) -> None:
        self.zabbix_engine = zabbix_engine

    def get_perf_trends(self, hostid: int) -> dict:
        return fetch_perf_trends(self.zabbix_engine, hostid)
