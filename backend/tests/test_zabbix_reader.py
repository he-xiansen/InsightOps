from app.collector.zabbix_reader import HOST_SYNC_SQL, normalize_host_row


def test_normalize_host_row_extracts_minimum_fields() -> None:
    row = {
        "hostid": "10084",
        "host": "vm-01",
        "ip": " 10.0.0.10 ",
        "available": "1",
    }

    result = normalize_host_row(row)

    assert result == {
        "ip": "10.0.0.10",
        "zabbix_hostid": 10084,
        "host_name": "vm-01",
        "available": True,
    }


def test_host_sync_sql_uses_minimum_read_only_projection() -> None:
    normalized_sql = " ".join(HOST_SYNC_SQL.split())

    assert "SELECT h.hostid, h.host, i.ip, h.available" in normalized_sql
    assert "FROM hosts AS h" in normalized_sql
    assert "JOIN interface AS i ON i.hostid = h.hostid" in normalized_sql
    assert "WHERE h.status IN (0, 1)" in normalized_sql
