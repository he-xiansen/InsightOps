from sqlalchemy import Engine, text


HOST_SYNC_SQL = """
SELECT h.hostid, h.host, i.ip, i.available
FROM hosts AS h
JOIN interface AS i ON i.hostid = h.hostid
WHERE h.status IN (0, 1)
ORDER BY h.hostid ASC, i.ip ASC, i.interfaceid ASC
"""

# 从 host_inventory 读取 OS 信息（Zabbix 自动填充）
OS_FROM_INVENTORY_SQL = """
SELECT hi.os
FROM host_inventory hi
WHERE hi.hostid = :hostid
  AND hi.os IS NOT NULL
  AND hi.os != ''
"""

# 从 history_str 读 system.uname（Zabbix 6）
OS_FROM_HISTORY_SQL = """
SELECT h.value
FROM history_str h
JOIN items i ON i.itemid = h.itemid
WHERE i.hostid = :hostid
  AND i.key_ = 'system.uname'
ORDER BY h.clock DESC
LIMIT 1
"""


def fetch_host_rows(engine: Engine) -> list[dict[str, object]]:
    with engine.connect() as connection:
        result = connection.execute(text(HOST_SYNC_SQL))
        return [dict(row) for row in result.mappings()]


def fetch_os_info(engine: Engine, hostid: int) -> str | None:
    """从 Zabbix 读取主机操作系统信息"""
    with engine.connect() as connection:
        # 优先从 host_inventory.os 读
        row = connection.execute(text(OS_FROM_INVENTORY_SQL), {"hostid": hostid}).first()
        if row and row[0]:
            return row[0]

        # 回退到 history_str.system.uname
        row = connection.execute(text(OS_FROM_HISTORY_SQL), {"hostid": hostid}).first()
        if row and row[0]:
            return row[0]

        return None


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


def _parse_os_type(raw: str) -> str | None:
    """
    从 Zabbix 返回值推断操作系统类型
    system.uname 示例:
      'Windows 10.0.14393 Microsoft Windows Server 2016 ...'
      'Linux server01 5.15.0-91-generic ...'
    """
    if not raw:
        return None
    lower = raw.lower()
    if "windows" in lower:
        return "Windows"
    if "linux" in lower:
        return "Linux"
    if "freebsd" in lower:
        return "FreeBSD"
    if "mac" in lower or "darwin" in lower:
        return "macOS"
    first_word = raw.strip().split()[0] if raw.strip() else ""
    if first_word.lower() in ("linux", "windows", "freebsd", "sunos"):
        return first_word[:1].upper() + first_word[1:].lower()
    return first_word if first_word else None


def normalize_os_type(raw: str | None) -> str | None:
    if not raw:
        return None
    return _parse_os_type(raw)
