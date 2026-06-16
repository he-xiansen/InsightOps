import json
from urllib.request import Request, urlopen
from urllib.error import URLError

from sqlalchemy.orm import Session

from app.repositories.system_settings_repository import SystemSettingsRepository

DEFAULT_ENDPOINT = "https://api.deepseek.com"
DEFAULT_MODEL = "deepseek-chat"

SYSTEM_PROMPT = """你是一个云资源优化专家。基于以下主机数据分析是否需要回收或降配。
请从以下维度评估：
1. 用户活跃度：最近RDP登录时间是哪天，闲置了多少天
2. CPU使用率趋势：是否长期低负载
3. 内存使用率趋势：是否严重浪费
4. 综合评级：high(强烈建议回收) / medium(建议关注) / low(无需操作)
5. 具体建议：用中文给出2-3条可操作建议

请以JSON格式回复，格式：
{"rating":"high|medium|low","summary":"一句话总结","details":["建议1","建议2","建议3"]}"""


class AIAdviceService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.settings_repo = SystemSettingsRepository(session)

    def _get_llm_config(self) -> tuple[str, str, str]:
        settings = self.settings_repo.get_all()
        endpoint = settings.get("llm_endpoint", DEFAULT_ENDPOINT)
        api_key = settings.get("llm_api_key", "")
        model = settings.get("llm_model", DEFAULT_MODEL)
        return endpoint, api_key, model

    def get_advice(self, host_data: list) -> list:
        endpoint, api_key, model = self._get_llm_config()
        if not api_key:
            return [{"ip": d.get("ip", ""), "rating": "low", "summary": "未配置 LLM API Key，请在系统设置中配置", "details": []} for d in host_data]

        results = []
        for host in host_data:
            prompt = f"""分析以下主机数据：
主机IP: {host.get('ip', '')}
主机名: {host.get('hostname', '')}
闲置天数: {host.get('idle_days', 'N/A')}
CPU平均使用率: {host.get('cpu_avg', 'N/A')}%
内存平均使用率: {host.get('mem_avg', 'N/A')}%
最近RDP登录: {host.get('last_rdp_login', 'N/A')}
操作系统: {host.get('os_type', 'N/A')}"""

            try:
                advice = self._call_llm(endpoint, api_key, model, prompt)
                results.append({"ip": host.get("ip", ""), **advice})
            except Exception as e:
                results.append({"ip": host.get("ip", ""), "rating": "low", "summary": f"AI 分析失败: {str(e)}", "details": []})

        return results

    def _call_llm(self, endpoint: str, api_key: str, model: str, user_prompt: str) -> dict:
        payload = json.dumps({
            "model": model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.3,
            "max_tokens": 512,
        }).encode("utf-8")

        req = Request(
            f"{endpoint.rstrip('/')}/v1/chat/completions",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
        )

        with urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read())
            content = body["choices"][0]["message"]["content"]

        # Try to parse JSON from response
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return {"rating": "medium", "summary": content[:100], "details": [content]}

    def test_connection(self) -> dict:
        endpoint, api_key, model = self._get_llm_config()
        if not api_key:
            return {"ok": False, "message": "API Key 未配置"}
        try:
            result = self._call_llm(endpoint, api_key, model, "请回复'连接成功'")
            return {"ok": True, "message": f"连接成功 · 模型: {model}"}
        except Exception as e:
            return {"ok": False, "message": f"连接失败: {str(e)}"}
