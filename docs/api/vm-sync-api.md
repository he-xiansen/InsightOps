# 虚机同步接口

## 接口概览

- 方法：`POST`
- 路径：`/api/v1/sync/vm-assets`
- 认证：请求头 `X-API-Key: <token>`
- Content-Type：`application/json`
- 幂等键：`ip`

该接口用于将外部 CMDB、自动发现脚本或人工整理的虚机清单写入 InsightOps。一批请求中的重复 `ip` 会在服务端合并；重复提交同一 `ip` 时，会覆盖已有记录中的对应字段。

## 请求体

```json
{
  "items": [
    {
      "ip": "10.0.0.8",
      "hostname": "sync-vm",
      "department": "ops",
      "lab": "lab-a",
      "owner": "alice",
      "os_type": "windows",
      "status": "active",
      "last_rdp_login_at": "2026-06-11T09:30:00Z",
      "last_seen_at": "2026-06-11T10:00:00Z"
    }
  ]
}
```

## 字段说明

- `items`：待同步虚机列表，允许为空数组。
- `ip`：必填，虚机唯一标识；重复值会触发覆盖更新。
- `hostname`：可选，主机名。
- `department`：可选，部门或业务线。
- `lab`：可选，实验室、机房或资源池名称。
- `owner`：可选，责任人。
- `os_type`：可选，操作系统类型。
- `status`：可选，默认值为 `active`。
- `last_rdp_login_at`：可选，最近一次 RDP 登录时间，使用 ISO 8601 UTC 时间。
- `last_seen_at`：可选，最近一次资产活跃时间，使用 ISO 8601 UTC 时间。

## 成功响应

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "upserted_count": 1
  }
}
```

- `code=0` 表示处理成功。
- `data.upserted_count` 表示本次最终写入的唯一 `ip` 数量。

## 失败响应

### 401 未提供 API Key

```json
{
  "detail": "Missing API key"
}
```

### 401 API Key 无效或已过期

```json
{
  "detail": "Invalid API key"
}
```

或：

```json
{
  "detail": "Expired API key"
}
```

## 调用示例

### curl

```bash
curl -X POST 'http://127.0.0.1:8000/api/v1/sync/vm-assets' \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: replace-with-real-token' \
  -d '{
    "items": [
      {
        "ip": "10.0.0.8",
        "hostname": "sync-vm",
        "department": "ops",
        "owner": "alice",
        "status": "active",
        "last_seen_at": "2026-06-11T10:00:00Z"
      }
    ]
  }'
```

### Python

```python
import requests

payload = {
    "items": [
        {
            "ip": "10.0.0.8",
            "hostname": "sync-vm",
            "department": "ops",
            "owner": "alice",
            "status": "active",
            "last_seen_at": "2026-06-11T10:00:00Z",
        }
    ]
}

response = requests.post(
    "http://127.0.0.1:8000/api/v1/sync/vm-assets",
    headers={
        "Content-Type": "application/json",
        "X-API-Key": "replace-with-real-token",
    },
    json=payload,
    timeout=30,
)
response.raise_for_status()
print(response.json())
```

## 联调建议

- 在外部同步端按 `ip` 去重，减少无效覆盖写入。
- 当字段为空且不希望覆盖已有值时，不要传该字段。
- 建议先调用 `GET /health` 验证 API 连通性，再执行批量同步。
