from sqlalchemy import Engine, text


HOST_SYNC_SQL = """
SELECT h.hostid, h.host, i.ip, i.available
FROM hosts AS h
JOIN interface AS i ON i.hostid = h.hostid
WHERE h.status IN (0, 1)
ORDER BY h.hostid ASC, i.ip ASC, i.interfaceid ASC
"""


def fetch_host_rows(engine: Engine) -> list[dict[str, object]]:
    with engine.connect() as connection:
        result = connection.execute(text(HOST_SYNC_SQL))
        return [dict(row) for row in result.mappings()]


def _is_explicitly_available(value: object) -> bool:
    return value in {1, "1", True}


def normalize_host_row(row: dict[str, object]) -> dict[str, object]:
    ip_value = str(row["ip"]).strip()
    host_value = str(row["host"]).strip()

    return {
        "ip": ip_value,
        "zabbix_hostid": int(row["hostid"]),
        "host_name": host_value,
        "available": _is_explicitly_available(row.get("available")),
    }
