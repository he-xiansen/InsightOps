import hashlib
import json
from datetime import UTC, datetime


def _normalize_hash_value(value: object) -> object:
    if isinstance(value, datetime):
        return parse_event_time(value).isoformat()
    if isinstance(value, dict):
        return {str(key): _normalize_hash_value(nested_value) for key, nested_value in value.items()}
    if isinstance(value, list):
        return [_normalize_hash_value(item) for item in value]
    if isinstance(value, tuple):
        return [_normalize_hash_value(item) for item in value]
    return value


def is_rdp_logon_event(event: dict[str, object]) -> bool:
    return int(event.get("event_id", 0)) == 4624 and int(event.get("logon_type", 0)) == 10


def build_raw_event_hash(event: dict[str, object]) -> str:
    payload = json.dumps(
        _normalize_hash_value(event),
        sort_keys=True,
        ensure_ascii=False,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def parse_event_time(value: object) -> datetime:
    if isinstance(value, datetime):
        parsed = value
    else:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)

    return parsed.astimezone(UTC)


def normalize_rdp_event(event: dict[str, object]) -> dict[str, object]:
    return {
        "ip": str(event["ip"]).strip(),
        "login_at": parse_event_time(event["login_at"]),
        "username": None if event.get("username") is None else str(event["username"]).strip() or None,
        "raw_event_hash": build_raw_event_hash(event),
    }
