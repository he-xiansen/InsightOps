import json
from urllib.request import Request, urlopen
from urllib.error import URLError

from sqlalchemy.orm import Session

from app.repositories.system_settings_repository import SystemSettingsRepository

DEFAULT_ENDPOINT = "https://api.deepseek.com"
DEFAULT_MODEL = "deepseek-chat"

# ── 量化评分规则 ──────────────────────────────────────────────
# 评分权重：RDP 闲置天数 60%，CPU 使用率 15%，内存使用率 15%，在线状态 10%
# 总分 ≥ 60 → high（强烈建议回收）
# 总分 30-59 → medium（建议关注）
# 总分 < 30  → low（无需操作）


def _score_idle(idle_days: int | None) -> tuple[float, str]:
    if idle_days is None or idle_days < 0:
        return (10, "无 RDP 记录")
    if idle_days >= 180:
        return (60, f"闲置 {idle_days} 天（超过半年）")
    if idle_days >= 90:
        return (55, f"闲置 {idle_days} 天（超过3个月）")
    if idle_days >= 60:
        return (45, f"闲置 {idle_days} 天（超过2个月）")
    if idle_days >= 30:
        return (30, f"闲置 {idle_days} 天（超过1个月）")
    if idle_days >= 14:
        return (15, f"闲置 {idle_days} 天（超过2周）")
    if idle_days >= 7:
        return (5, f"闲置 {idle_days} 天")
    return (0, f"活跃（最近 {idle_days} 天内有登录）")


def _score_cpu(cpu_avg: float | None) -> tuple[float, str]:
    if cpu_avg is None:
        return (0, "无 CPU 数据")
    if cpu_avg <= 5:
        return (15, f"CPU 长期低于 5%（当前 {cpu_avg:.1f}%）")
    if cpu_avg <= 15:
        return (8, f"CPU 偏低（{cpu_avg:.1f}%）")
    if cpu_avg <= 30:
        return (3, f"CPU 正常偏低（{cpu_avg:.1f}%）")
    return (0, f"CPU 正常（{cpu_avg:.1f}%）")


def _score_mem(mem_avg: float | None) -> tuple[float, str]:
    if mem_avg is None:
        return (0, "无内存数据")
    if mem_avg <= 10:
        return (15, f"内存长期低于 10%（当前 {mem_avg:.1f}%）")
    if mem_avg <= 25:
        return (8, f"内存偏低（{mem_avg:.1f}%）")
    if mem_avg <= 50:
        return (3, f"内存正常偏低（{mem_avg:.1f}%）")
    return (0, f"内存正常（{mem_avg:.1f}%）")


def _score_online(status: str) -> tuple[float, str]:
    if status != "active":
        return (10, "当前离线")
    return (0, "在线")


def _quantify_recycle(host: dict) -> dict:
    """纯量化评分，不依赖 AI"""
    idle_days = host.get("idle_days")
    cpu_avg = host.get("cpu_avg")
    mem_avg = host.get("mem_avg")
    status = host.get("status", "inactive")

    s_idle, reason_idle = _score_idle(idle_days)
    s_cpu, reason_cpu = _score_cpu(cpu_avg)
    s_mem, reason_mem = _score_mem(mem_avg)
    s_online, reason_online = _score_online(status)

    total = s_idle + s_cpu + s_mem + s_online

    if total >= 60:
        rating = "high"
        summary = f"强烈建议回收（综合评分 {total:.0f}/100）"
    elif total >= 30:
        rating = "medium"
        summary = f"建议关注（综合评分 {total:.0f}/100）"
    else:
        rating = "low"
        summary = f"无需操作（综合评分 {total:.0f}/100）"

    details = [reason_idle, reason_cpu, reason_mem, reason_online]
    if rating == "high":
        if idle_days and idle_days >= 90:
            details.append("建议：超过 3 个月未登录，可安全回收或关机")
        if cpu_avg is not None and cpu_avg <= 5:
            details.append("建议：CPU 持续极低负载，可降配为低规格实例")
        if mem_avg is not None and mem_avg <= 10:
            details.append("建议：内存严重空闲，可缩减内存配置")
        if status != "active":
            details.append("建议：主机已离线，确认后可立即回收")
    elif rating == "medium":
        if idle_days and idle_days >= 30:
            details.append("建议：已闲置超过 1 个月，联系负责人确认是否需要保留")
        if cpu_avg is not None and cpu_avg <= 15:
            details.append("建议：CPU 长期低负载，考虑适当降配")
    else:
        details.append("建议：当前使用状态正常，无需操作")

    return {"rating": rating, "summary": summary, "details": details, "score": round(total)}


def _build_ai_prompt(host: dict, quantify_result: dict) -> str:
    """构建给 LLM 的提示词，包含量化结果"""
    ip = host.get("ip", "未知")
    rating_label = {"high": "强烈建议回收", "medium": "建议关注", "low": "无需操作"}.get(quantify_result["rating"], "")

    return f"""你是一个 IT 基础设施运维专家。请基于以下量化分析结果，为主机 {ip} 生成一段自然、实用的回收建议（80-150 字）。

【量化打分维度】
{chr(10).join(f"- {d}" for d in quantify_result["details"][:4])}

【综合评分】{quantify_result["score"]}/100 → {rating_label}

【要求】
- 用中文回答
- 语气像运维同事之间的交流
- 给出明确可操作的建议
- 只输出建议文字，不要前缀标记"""


def _call_llm(endpoint: str, api_key: str, model: str, host: dict, quantify_result: dict) -> str | None:
    """调用 LLM，失败返回 None"""
    prompt = _build_ai_prompt(host, quantify_result)
    try:
        payload = json.dumps({
            "model": model,
            "messages": [
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"请为主机 {host.get('ip', '未知')} 生成回收建议。"},
            ],
            "temperature": 0.3,
            "max_tokens": 300,
        }).encode("utf-8")
        req = Request(
            f"{endpoint.rstrip('/')}/v1/chat/completions",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
        )
        with urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read())
        return data["choices"][0]["message"]["content"].strip()
    except Exception:
        return None


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
        """
        返回回收建议：先量化打分，取前 5 台高分主机调 AI 生成自然语言建议。
        即使没配 API Key 也能给出量化建议。
        """
        endpoint, api_key, model = self._get_llm_config()
        use_ai = bool(api_key)

        # 1. 先全部量化打分
        results = []
        for host in host_data:
            result = _quantify_recycle(host)
            result["ip"] = host.get("ip", "")
            results.append(result)

        # 2. 按分数降序，取前 5 台调 AI
        if use_ai:
            scored = sorted(results, key=lambda x: x.get("score", 0), reverse=True)
            top5 = scored[:5]
            top5_ips = {r["ip"] for r in top5}
            for i, r in enumerate(results):
                if r["ip"] in top5_ips:
                    host_info = host_data[i] if i < len(host_data) else {"ip": r["ip"]}
                    ai_text = _call_llm(endpoint, api_key, model, host_info, r)
                    if ai_text:
                        r["ai_text"] = ai_text

        return results

    def test_connection(self) -> dict:
        endpoint, api_key, model = self._get_llm_config()
        if not api_key:
            return {"ok": False, "message": "API Key 未配置"}
        try:
            payload = json.dumps({
                "model": model,
                "messages": [
                    {"role": "user", "content": "请回复'连接成功'"},
                ],
                "temperature": 0.1,
                "max_tokens": 32,
            }).encode("utf-8")
            req = Request(
                f"{endpoint.rstrip('/')}/v1/chat/completions",
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
            )
            with urlopen(req, timeout=15) as resp:
                json.loads(resp.read())
            return {"ok": True, "message": f"连接成功 · 模型: {model}"}
        except Exception as e:
            return {"ok": False, "message": f"连接失败: {str(e)}"}
