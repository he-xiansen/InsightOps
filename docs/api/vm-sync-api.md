# 主机信息同步接口

用于从外部系统（CMDB、工单系统、其他表单）向 InsightOps 批量同步主机信息。

## 接口信息

| 项目 | 值 |
|------|-----|
| 方法 | `POST` |
| 路径 | `/api/v1/sync/vm-assets` |
| 认证 | 请求头 `X-API-Key: <token>` |
| Content-Type | `application/json` |

## 幂等性

以 `ip` 为唯一标识。同一 `ip` 重复提交会覆盖已有字段，未传的字段保持原值不变。

## 请求体

```json
{
  "items": [
    {
      "ip": "10.0.1.1",
      "hostname": "web-server-01",
      "department": "技术部",
      "owner": "张三",
      "phone": "010-88008801",
      "mobile": "13800138001",
      "os_type": "Linux",
      "status": "active"
    }
  ]
}
```

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `ip` | ✅ | 主机 IP，唯一标识 |
| `hostname` | 可选 | 主机名 |
| `department` | 可选 | 部门 |
| `owner` | 可选 | 负责人 |
| `phone` | 可选 | 座机号码 |
| `mobile` | 可选 | 手机号码 |
| `os_type` | 可选 | 操作系统类型 |
| `status` | 可选 | 状态，默认 `active` |

> 只传需要更新的字段即可，不传的字段不会被覆盖。

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

## 错误响应

```json
{
  "detail": "Missing API key"
}
```

## curl 调用示例

```bash
curl -X POST 'http://<平台IP>:8080/api/v1/sync/vm-assets' \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: <你的API_KEY>' \
  -d '{
    "items": [
      {
        "ip": "10.0.1.1",
        "hostname": "web-server-01",
        "department": "技术部",
        "owner": "张三",
        "phone": "010-88008801",
        "mobile": "13800138001"
      }
    ]
  }'
```

## Python 调用示例

```python
import requests

API_URL = "http://<平台IP>:8080"
API_KEY = "<你的API_KEY>"

payload = {
    "items": [
        {
            "ip": "10.0.1.1",
            "hostname": "web-server-01",
            "department": "技术部",
            "owner": "张三",
            "phone": "010-88008801",
            "mobile": "13800138001",
        }
    ]
}

resp = requests.post(
    f"{API_URL}/api/v1/sync/vm-assets",
    headers={
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
    },
    json=payload,
    timeout=30,
)
resp.raise_for_status()
print(resp.json())
```

## API Key 获取

在平台的 `系统设置` 页面可以查看或配置 API Key。
