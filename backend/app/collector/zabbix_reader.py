HOST_SYNC_SQL = """
SELECT h.hostid, h.host, i.ip, h.available
FROM hosts AS h
JOIN interface AS i ON i.hostid = h.hostid
WHERE h.status IN (0, 1)
"""


def normalize_host_row(row: dict[str, object]) -> dict[str, object]:
    ip_value = str(row["ip"]).strip()
    host_value = str(row["host"]).strip()
    available_value = row.get("available", 0)

    return {
        "ip": ip_value,
        "zabbix_hostid": int(row["hostid"]),
        "host_name": host_value,
        "available": bool(int(available_value)),
    }
