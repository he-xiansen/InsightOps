import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthMode = "login" | "register";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>((searchParams.get("mode") === "register") ? "register" : "login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const url = mode === "login" ? "/api/v1/auth/login" : "/api/v1/auth/register";
      const body: Record<string, string> = { username: username.trim(), password };
      if (mode === "register") body.email = email.trim();

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "操作失败");
        return;
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username);
      localStorage.setItem("is_admin", String(data.is_admin));
      navigate("/dashboard", { replace: true });
    } catch (e: any) {
      setError(e.message || "网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background/80">
      <div className="glass-panel micro-border rounded-xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 rounded flex items-center justify-center bg-primary">
              <span className="material-symbols-outlined text-white text-xl">insights</span>
            </div>
            <h1 className="text-headline-lg font-bold text-on-surface">InsightOps</h1>
          </div>
          <p className="text-body-md text-on-surface-variant">
            {mode === "login" ? "登录以继续" : "注册新账号"}
          </p>
        </div>

        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1">用户名</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
            />
          </div>

          {mode === "register" && (
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1">邮箱（选填）</label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入邮箱"
              />
            </div>
          )}

          <div>
            <label className="block text-label-md text-on-surface-variant mb-1">密码</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
            />
          </div>

          {error && (
            <div className="p-3 rounded bg-error/10 border border-error/20 flex items-center gap-2">
              <span className="material-symbols-outlined text-error text-sm">error</span>
              <span className="text-sm text-error">{error}</span>
            </div>
          )}

          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? "处理中..." : mode === "login" ? "登录" : "注册"}
          </Button>

          <div className="text-center">
            <button
              className="text-sm text-primary hover:underline"
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            >
              {mode === "login" ? "没有账号？去注册" : "已有账号？去登录"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
