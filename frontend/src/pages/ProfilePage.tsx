import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProfilePage() {
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const loadProfile = () => {
    fetch("/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setNickname(data.nickname || "");
        setEmail(data.email || "");
        setAvatar(data.avatar || "");
      });
  };

  useEffect(() => { loadProfile(); }, []);

  const handleUpload = async (file: File) => {
    setMsg("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/v1/upload/avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setAvatar(data.avatar);
        setMsg("头像已更新，请点击保存");
      } else {
        setMsg(data.detail || "上传失败");
      }
    } catch (e: any) {
      setMsg(e.message || "上传失败");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/v1/auth/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ nickname: nickname.trim(), email: email.trim(), avatar }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.detail || "保存失败"); return; }
      localStorage.setItem("username", data.nickname || data.username);
      if (data.avatar) {
        localStorage.setItem("avatar", data.avatar);
        // 强制刷新页面同步右上角头像
        window.location.reload();
      }
      setMsg("保存成功");
    } catch (e: any) {
      setMsg(e.message || "网络错误");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="glass-panel micro-border rounded p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1">头像</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-container border-2 border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                {avatar ? (
                  <img key={avatar} src={avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-2xl text-on-primary-container">person</span>
                )}
              </div>
              <label className="cursor-pointer px-4 py-2 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-on-surface-variant transition-colors">
                选择图片
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
                />
              </label>
              <span className="text-xs text-on-surface-variant/50">支持 jpg/png/gif/webp，最大 5MB</span>
            </div>
          </div>

          <div>
            <label className="block text-label-md text-on-surface-variant mb-1">昵称</label>
            <Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="给自己取个昵称" />
          </div>

          <div>
            <label className="block text-label-md text-on-surface-variant mb-1">邮箱</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
          </div>

          {msg && (
            <div className={`p-3 rounded text-sm ${msg.includes("成功") ? "bg-primary/10 text-primary" : "bg-error/10 text-error"}`}>
              {msg}
            </div>
          )}

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>
    </div>
  );
}
