import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSettings, updateSettings, testAiConnection } from "@/lib/api";

export function SystemSettingsPage() {
  const [endpoint, setEndpoint] = useState("https://api.deepseek.com");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("deepseek-chat");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [ipFilter, setIpFilter] = useState("*");
  const [saveResult, setSaveResult] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSettings().then((res) => {
      const s = res.settings;
      if (s.llm_endpoint) setEndpoint(s.llm_endpoint);
      if (s.llm_api_key && s.llm_api_key !== "••••••") setApiKey(s.llm_api_key);
      if (s.llm_model) setModel(s.llm_model);
      if (s.perf_collect_ip_filter) setIpFilter(s.perf_collect_ip_filter);
    }).catch(() => {}).finally(() => setLoaded(true));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      await updateSettings({
        llm_endpoint: endpoint,
        llm_api_key: apiKey,
        llm_model: model,
        perf_collect_ip_filter: ipFilter,
      });
      setSaveResult("保存成功");
    } catch (e: any) {
      setSaveResult(`保存失败: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testAiConnection();
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ ok: false, message: `请求失败: ${e.message}` });
    } finally {
      setTesting(false);
    }
  };

  if (!loaded) {
    return <div className="p-8 text-center text-sm text-on-surface-variant">加载中...</div>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* LLM 配置 */}
      <div className="glass-panel micro-border rounded p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-primary text-2xl">psychology</span>
          <div>
            <h2 className="text-headline-md">大模型配置</h2>
            <p className="text-label-md text-on-surface-variant">配置兼容 OpenAI API 格式的大模型，用于生成资产回收建议</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1">API 端点地址</label>
            <Input
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://api.deepseek.com"
            />
          </div>

          <div>
            <label className="block text-label-md text-on-surface-variant mb-1">API Key</label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>

          <div>
            <label className="block text-label-md text-on-surface-variant mb-1">模型名称</label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="deepseek-chat"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存配置"}
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing}>
              {testing ? "测试中..." : "测试连接"}
            </Button>
            {saveResult && (
              <span className={`text-sm ${saveResult.includes("成功") ? "text-primary" : "text-error"}`}>
                {saveResult}
              </span>
            )}
          </div>

          {testResult && (
            <div className={`p-3 rounded micro-border ${testResult.ok ? "bg-primary/5 border-primary/20" : "bg-error/5 border-error/20"}`}>
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined text-sm ${testResult.ok ? "text-primary" : "text-error"}`}>
                  {testResult.ok ? "check_circle" : "error"}
                </span>
                <span className="text-sm">{testResult.message}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 配置说明 */}
      <div className="glass-panel micro-border rounded p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-tertiary text-2xl">info</span>
          <div>
            <h2 className="text-headline-md">使用说明</h2>
          </div>
        </div>
        <div className="text-sm text-on-surface-variant space-y-2">
          <p>• 本项目兼容所有 OpenAI API 格式的大模型服务（DeepSeek、OpenAI、通义千问等）</p>
          <p>• 配置完成后，前往仪表盘点击"AI 回收建议"区域的"分析"按钮即可使用</p>
          <p>• AI 会基于主机的闲置天数、RDP 登录记录等数据生成回收建议</p>
          <p>• API Key 以加密方式存储，不会在前端明文显示</p>
        </div>
      </div>
    </div>
  );
}
