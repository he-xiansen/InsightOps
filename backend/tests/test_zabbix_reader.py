from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool

from app.collector.zabbix_reader import HOST_SYNC_SQL, fetch_host_rows, normalize_host_row


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


def test_normalize_host_row_only_maps_explicit_available_values_to_true() -> None:
    unavailable_rows = [
        {"hostid": 1, "host": "vm-01", "ip": "10.0.0.1", "available": 0},
        {"hostid": 2, "host": "vm-02", "ip": "10.0.0.2", "available": 2},
        {"hostid": 3, "host": "vm-03", "ip": "10.0.0.3", "available": "unknown"},
        {"hostid": 4, "host": "vm-04", "ip": "10.0.0.4", "available": None},
    ]

    normalized = [normalize_host_row(row) for row in unavailable_rows]

    assert [row["available"] for row in normalized] == [False, False, False, False]


def test_host_sync_sql_uses_minimum_read_only_projection() -> None:
    normalized_sql = " ".join(HOST_SYNC_SQL.split())

    assert "SELECT h.hostid, h.host, i.ip, h.available" in normalized_sql
    assert "FROM hosts AS h" in normalized_sql
    assert "JOIN interface AS i ON i.hostid = h.hostid" in normalized_sql
    assert "WHERE h.status IN (0, 1)" in normalized_sql
    assert "ORDER BY h.hostid ASC, i.ip ASC, i.interfaceid ASC" in normalized_sql


def test_fetch_host_rows_returns_stably_sorted_mapping_rows() -> None:
    engine = create_engine(
        "sqlite+pysqlite://",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    with engine.begin() as connection:
        connection.execute(
            text(
                """
                CREATE TABLE hosts (
                    hostid INTEGER PRIMARY KEY,
                    host TEXT NOT NULL,
                    available INTEGER NOT NULL,
                    status INTEGER NOT NULL
                )
                """
            )
        )
        connection.execute(
            text(
                """
                CREATE TABLE interface (
                    interfaceid INTEGER PRIMARY KEY,
                    hostid INTEGER NOT NULL,
                    ip TEXT NOT NULL
                )
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO hosts (hostid, host, available, status) VALUES
                (10085, 'vm-02', 1, 0),
                (10084, 'vm-01', 1, 0)
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO interface (interfaceid, hostid, ip) VALUES
                (4, 10085, '10.0.0.20'),
                (3, 10084, '10.0.0.11'),
                (2, 10084, '10.0.0.10'),
                (1, 10084, '10.0.0.10')
                """
            )
        )

    rows = fetch_host_rows(engine)

    assert rows == [
        {"hostid": 10084, "host": "vm-01", "ip": "10.0.0.10", "available": 1},
        {"hostid": 10084, "host": "vm-01", "ip": "10.0.0.10", "available": 1},
        {"hostid": 10084, "host": "vm-01", "ip": "10.0.0.11", "available": 1},
        {"hostid": 10085, "host": "vm-02", "ip": "10.0.0.20", "available": 1},
    ]
