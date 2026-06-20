import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSettings, updateSettings, testAiConnection, getLLMApiKey } from "@/lib/api";


export function SystemSettingsPage() {
  const [endpoint, setEndpoint] = useState("https://api.deepseek.com");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyDirty, setApiKeyDirty] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState("deepseek-chat");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [ipFilter, setIpFilter] = useState("*");
  const [perfInterval, setPerfInterval] = useState("600");
  const [idleInterval, setIdleInterval] = useState("600");
  const [perfRetention, setPerfRetention] = useState("30");
  const [rdpRetention, setRdpRetention] = useState("90");
  const [saveResult, setSaveResult] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Zabbix 配置
  const [zabbixHost, setZabbixHost] = useState("");
  const [zabbixPort, setZabbixPort] = useState("3306");
  const [zabbixUser, setZabbixUser] = useState("");
  const [zabbixDbName, setZabbixDbName] = useState("zabbix");
  const [zabbixTestResult, setZabbixTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [zabbixTesting, setZabbixTesting] = useState(false);

  useEffect(() => {
    getSettings().then((res) => {
      const s = res.settings;
      if (s.llm_endpoint) setEndpoint(s.llm_endpoint);
      if (s.llm_model) setModel(s.llm_model);
      if (s.perf_collect_ip_filter) setIpFilter(s.perf_collect_ip_filter);
      if (s.perf_collect_interval) setPerfInterval(s.perf_collect_interval);
      if (s.idle_analysis_interval) setIdleInterval(s.idle_analysis_interval);
      if (s.perf_retention_days) setPerfRetention(s.perf_retention_days);
      if (s.rdp_retention_days) setRdpRetention(s.rdp_retention_days);
      if (s.zabbix_db_host) setZabbixHost(s.zabbix_db_host);
      if (s.zabbix_db_port) setZabbixPort(s.zabbix_db_port);
      if (s.zabbix_db_user) setZabbixUser(s.zabbix_db_user);
      if (s.zabbix_db_name) setZabbixDbName(s.zabbix_db_name);

      if (s.llm_api_key && s.llm_api_key !== "\u2022\u2022\u2022\u2022\u2022\u2022") {
        setApiKey(s.llm_api_key);
      } else if (s.llm_api_key === "\u2022\u2022\u2022\u2022\u2022\u2022") {
        getLLMApiKey().then((r) => {
          setApiKey(r.api_key || "");
        }).catch(() => {
          setApiKey("\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022");
        });
      }
    }).catch(() => {}).finally(() => setLoaded(true));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      const finalApiKey = (!apiKeyDirty && apiKey.startsWith("\u2022")) ? "" : apiKey;
      await updateSettings({
        llm_endpoint: endpoint,
        llm_api_key: finalApiKey,
        llm_model: model,
        perf_collect_ip_filter: ipFilter,
        perf_collect_interval: perfInterval,
        idle_analysis_interval: idleInterval,
        perf_retention_days: perfRetention,
        rdp_retention_days: rdpRetention,
        zabbix_db_host: zabbixHost,
        zabbix_db_port: zabbixPort,
        zabbix_db_user: zabbixUser,
        zabbix_db_name: zabbixDbName,
      });
      setApiKeyDirty(false);
      setSaveResult("保存成功");
    } catch (e: any) {
      setSaveResult("保存失败: " + (e.message || "未知错误"));
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
      setTestResult({ ok: false, message: "请求失败: " + (e.message || "未知错误") });
    } finally {
      setTesting(false);
    }
  };

  const handleZabbixTest = async () => {
    setZabbixTesting(true);
    setZabbixTestResult(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/v1/settings/test-zabbix", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).then(r => r.json());
      setZabbixTestResult(res);
    } catch (e: any) {
      setZabbixTestResult({ ok: false, message: "请求失败: " + (e.message || "未知错误") });
    } finally {
      setZabbixTesting(false);
    }
  };

  if (!loaded) {
    return <div className="p-8 text-center text-sm text-on-surface-variant">加载中...</div>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* 大模型配置 */}
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
            <Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://api.deepseek.com" />
          </div>
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1">API Key</label>
            <div className="relative">
              <Input type={showKey ? "text" : "password"} value={apiKey} onChange={(e) => { setApiKey(e.target.value); setApiKeyDirty(true); }} placeholder="sk-..." className="pr-10" />
              <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/[0.06] transition-colors text-on-surface-variant/60 hover:text-on-surface-variant" title={showKey ? "隐藏" : "显示"}>
                <span className="material-symbols-outlined text-lg">{showKey ? "visibility_off" : "visibility"}</span>
              </button>
            </div>
          </div>
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1">模型名称</label>
            <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="deepseek-chat" />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>{saving ? "保存中..." : "保存配置"}</Button>
            <Button variant="outline" onClick={handleTest} disabled={testing}>{testing ? "测试中..." : "测试连接"}</Button>
            {saveResult && <span className={`text-sm ${saveResult.includes("成功") ? "text-primary" : "text-error"}`}>{saveResult}</span>}
          </div>
          {testResult && (
            <div className={`p-3 rounded micro-border ${testResult.ok ? "bg-primary/5 border-primary/20" : "bg-error/5 border-error/20"}`}>
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined text-sm ${testResult.ok ? "text-primary" : "text-error"}`}>{testResult.ok ? "check_circle" : "error"}</span>
                <span className="text-sm">{testResult.message}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Zabbix 数据库连接 */}
      <div className="glass-panel micro-border rounded p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-tertiary text-2xl">storage</span>
          <div>
            <h2 className="text-headline-md">Zabbix 数据库连接</h2>
            <p className="text-label-md text-on-surface-variant">配置 Zabbix 数据库连接信息，用于同步主机和性能数据。密码通过环境变量注入，不在页面显示。</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1">主机地址</label>
            <input type="text" value={zabbixHost} onChange={(e) => setZabbixHost(e.target.value)} className="w-full h-9 px-3 rounded border border-white/10 bg-transparent text-sm text-on-surface-variant focus:outline-none focus:border-primary/50" placeholder="zabbix-mysql 或 IP" />
          </div>
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1">端口</label>
            <input type="number" value={zabbixPort} onChange={(e) => setZabbixPort(e.target.value)} className="w-full h-9 px-3 rounded border border-white/10 bg-transparent text-sm text-on-surface-variant focus:outline-none focus:border-primary/50" />
          </div>
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1">数据库用户</label>
            <input type="text" value={zabbixUser} onChange={(e) => setZabbixUser(e.target.value)} className="w-full h-9 px-3 rounded border border-white/10 bg-transparent text-sm text-on-surface-variant focus:outline-none focus:border-primary/50" placeholder="zabbix 或 readonly" />
          </div>
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1">数据库名</label>
            <input type="text" value={zabbixDbName} onChange={(e) => setZabbixDbName(e.target.value)} className="w-full h-9 px-3 rounded border border-white/10 bg-transparent text-sm text-on-surface-variant focus:outline-none focus:border-primary/50" placeholder="zabbix" />
          </div>
        </div>
        <div className="flex items-center gap-3 pt-4">
          <Button onClick={handleSave} disabled={saving}>{saving ? "保存中..." : "保存配置"}</Button>
          <Button variant="outline" onClick={handleZabbixTest} disabled={zabbixTesting}>{zabbixTesting ? "测试中..." : "测试 Zabbix 连接"}</Button>
          {saveResult && <span className={`text-sm ${saveResult.includes("成功") ? "text-primary" : "text-error"}`}>{saveResult}</span>}
        </div>
        {zabbixTestResult && (
          <div className={`mt-3 p-3 rounded micro-border ${zabbixTestResult.ok ? "bg-primary/5 border-primary/20" : "bg-error/5 border-error/20"}`}>
            <div className="flex items-center gap-2">
              <span className={`material-symbols-outlined text-sm ${zabbixTestResult.ok ? "text-primary" : "text-error"}`}>{zabbixTestResult.ok ? "check_circle" : "error"}</span>
              <span className="text-sm">{zabbixTestResult.message}</span>
            </div>
          </div>
        )}
      </div>

      {/* 采集与数据保留 */}
      <div className="glass-panel micro-border rounded p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-tertiary text-2xl">schedule</span>
          <div>
            <h2 className="text-headline-md">采集与数据保留</h2>
            <p className="text-label-md text-on-surface-variant">配置数据采集频率和历史数据保留天数</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1">性能采集间隔（秒）</label>
            <input type="number" value={perfInterval} onChange={(e) => setPerfInterval(e.target.value)} className="w-full h-9 px-3 rounded border border-white/10 bg-transparent text-sm text-on-surface-variant focus:outline-none focus:border-primary/50" min="60" />
            <p className="text-xs text-on-surface-variant/50 mt-1">建议 600（10 分钟），最小 60</p>
          </div>
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1">闲置分析间隔（秒）</label>
            <input type="number" value={idleInterval} onChange={(e) => setIdleInterval(e.target.value)} className="w-full h-9 px-3 rounded border border-white/10 bg-transparent text-sm text-on-surface-variant focus:outline-none focus:border-primary/50" min="60" />
            <p className="text-xs text-on-surface-variant/50 mt-1">建议 600（10 分钟），最小 60</p>
          </div>
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1">性能数据保留（天）</label>
            <input type="number" value={perfRetention} onChange={(e) => setPerfRetention(e.target.value)} className="w-full h-9 px-3 rounded border border-white/10 bg-transparent text-sm text-on-surface-variant focus:outline-none focus:border-primary/50" min="1" />
            <p className="text-xs text-on-surface-variant/50 mt-1">超过此天数的 CPU/内存数据将被清理</p>
          </div>
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1">RDP 日志保留（天）</label>
            <input type="number" value={rdpRetention} onChange={(e) => setRdpRetention(e.target.value)} className="w-full h-9 px-3 rounded border border-white/10 bg-transparent text-sm text-on-surface-variant focus:outline-none focus:border-primary/50" min="1" />
            <p className="text-xs text-on-surface-variant/50 mt-1">超过此天数的 RDP 登录记录将被清理</p>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>{saving ? "保存中..." : "保存采集配置"}</Button>
          {saveResult && <span className={`text-sm ${saveResult.includes("成功") ? "text-primary" : "text-error"}`}>{saveResult}</span>}
        </div>
      </div>

      {/* 使用说明 */}
      <div className="glass-panel micro-border rounded p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-tertiary text-2xl">info</span>
          <div><h2 className="text-headline-md">使用说明</h2></div>
        </div>
        <div className="text-sm text-on-surface-variant space-y-2">
          <p>• 本项目兼容所有 OpenAI API 格式的大模型服务（DeepSeek、OpenAI、通义千问等）</p>
          <p>• 配置完成后，前往仪表盘点击"AI 回收建议"区域的"分析"按钮即可使用</p>
          <p>• API Key 以掩码方式存储，不会在前端明文显示</p>
          <p>• Zabbix 数据库密码通过环境变量 zabbix_db_password 注入，不在页面配置</p>
        </div>
      </div>
    </div>
  );
}
