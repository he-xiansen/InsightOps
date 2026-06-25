import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getVmAssetsWithPerf, type VmAssetPerfItem } from "@/lib/api";
import { toBeijingTime } from "@/lib/utils";

const PAGE_SIZE = 15;

export function DeviceManagementPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<VmAssetPerfItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editItem, setEditItem] = useState<VmAssetPerfItem | null>(null);
  const [editForm, setEditForm] = useState({ department: "", owner: "", phone: "", mobile: "", os_type: "" });
  const [saving, setSaving] = useState(false);
  const [showAddHost, setShowAddHost] = useState(false);
  const [addHostInput, setAddHostInput] = useState("");
  const [addHostResults, setAddHostResults] = useState<any[]>([]);
  const [addHostSearching, setAddHostSearching] = useState(false);
  const [addHostAdding, setAddHostAdding] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    getVmAssetsWithPerf().then((res) => { if (!cancelled) setItems(res.items as VmAssetPerfItem[]); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (item) =>
          item.ip.toLowerCase().includes(q) ||
          (item.hostname ?? "").toLowerCase().includes(q) ||
          (item.owner ?? "").toLowerCase().includes(q)
      );
    }
    if (statusFilter === "active") list = list.filter(i => i.status === "active");
    else if (statusFilter === "inactive") list = list.filter(i => i.status !== "active");
    else if (statusFilter === "idle") list = list.filter(i => i.idle_days >= 30);
    // 在线的主机排在前面
    list = [...list].sort((a, b) => {
      if (a.status === "active" && b.status !== "active") return -1;
      if (a.status !== "active" && b.status === "active") return 1;
      return (a.hostname ?? a.ip).localeCompare(b.hostname ?? b.ip);
    });
    return list;
  }, [items, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const onlineCount = items.filter(i => i.status === "active").length;

  return (
    <div className="glass-panel micro-border rounded overflow-hidden">
      <div className="p-4 border-b border-outline-variant flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={() => setShowAddHost(true)} className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">add</span>
            添加主机
          </Button>
        <Input
          placeholder="搜索 IP、主机名或负责人..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-32 h-9 px-2 rounded border border-white/10 bg-transparent text-sm text-on-surface-variant focus:outline-none focus:border-primary/50"
        >
          <option value="all" className="bg-[#131315]">全部</option>
          <option value="active" className="bg-[#131315]">在线</option>
          <option value="inactive" className="bg-[#131315]">离线</option>
          <option value="idle" className="bg-[#131315]">闲置30天以上</option>
        </select>
        <div className="flex items-center gap-3 text-label-md text-on-surface-variant ml-auto">
          <Button variant="outline" size="sm" onClick={() => {
            const data = filtered.map(i => ({
              IP: i.ip,
              主机名: i.hostname ?? "",
              部门: i.department ?? "",
              负责人: i.owner ?? "",
              "CPU(%)": i.cpu_avg != null ? i.cpu_avg.toFixed(1) : "",
              "内存(%)": i.mem_avg != null ? i.mem_avg.toFixed(1) : "",
              闲置天数: i.idle_days >= 0 ? i.idle_days : "",
              状态: i.status === "active" ? "在线" : "离线"
            }));
            const ws = XLSX.utils.json_to_sheet(data);
            ws["!cols"] = [{wch:16},{wch:16},{wch:12},{wch:12},{wch:10},{wch:10},{wch:10},{wch:8}];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "设备清单");
            XLSX.writeFile(wb, "device-list.xlsx");
          }}>导出 Excel</Button>
          <Button variant="outline" size="sm" onClick={() => {
            const csv = "IP,主机名,部门,负责人,CPU(%),内存(%),闲置天数,状态\n" + filtered.map(i => `${i.ip},${i.hostname ?? ""},${i.department ?? ""},${i.owner ?? ""},${i.cpu_avg ?? ""},${i.mem_avg ?? ""},${i.idle_days ?? ""},${i.status}`).join("\n");
            const blob = new Blob(["\uFEFF" + csv], {type: "text/csv;charset=utf-8"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = "device-list.csv"; a.click();
            URL.revokeObjectURL(url);
          }}>导出 CSV</Button>
          <Button variant="outline" size="sm" onClick={() => {
            const template = [{IP:"",部门:"",负责人:"",座机:"",手机:""}];
            const ws = XLSX.utils.json_to_sheet(template);
            ws["!cols"] = [{wch:16},{wch:16},{wch:12},{wch:16},{wch:16}];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "导入模板");
            XLSX.writeFile(wb, "device-import-template.xlsx");
          }}>下载模板</Button>

          <label className="inline-flex items-center gap-1 px-3 h-8 rounded border border-white/10 text-on-surface-variant hover:border-white/30 transition-all cursor-pointer text-sm">
            <span className="material-symbols-outlined text-sm">upload_file</span>
            批量导入
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const data = await file.arrayBuffer();
                const wb = XLSX.read(data, {type:"array"});
                const sheet = wb.Sheets[wb.SheetNames[0]];
                const rows: any[] = XLSX.utils.sheet_to_json(sheet);
                if (rows.length === 0) { alert("文件中没有数据"); return; }
                // 先获取平台已有 IP，只导入已存在的主机
                const existingIps = new Set(items.map(i => i.ip));
                const parsed = rows.map((r: any) => ({
                  ip: String(r["IP"] ?? r["ip"] ?? "").trim(),
                  department: String(r["部门"] ?? r["department"] ?? "").trim() || null,
                  owner: String(r["负责人"] ?? r["owner"] ?? "").trim() || null,
                  phone: String(r["座机"] ?? r["phone"] ?? "").trim() || null,
                  mobile: String(r["手机"] ?? r["mobile"] ?? "").trim() || null,
                })).filter(r => r.ip && existingIps.has(r.ip));
                const skippedIps = rows.map((r: any) => String(r["IP"] ?? r["ip"] ?? "").trim()).filter(ip => ip && !existingIps.has(ip));
                if (parsed.length === 0) { alert("文件中没有匹配到平台已有主机的 IP（平台共 " + existingIps.size + " 台），无法导入。"); return; }
                const res = await fetch("/api/v1/sync/vm-assets", {
                  method: "POST",
                  headers: {"Content-Type":"application/json"},
                  body: JSON.stringify({items}),
                });
                if (!res.ok) { const err = await res.json(); alert("导入失败: " + JSON.stringify(err)); return; }
                const result = await res.json();
                const msg = skippedIps.length > 0
                  ? `导入成功: 更新 ${result.processed_count ?? parsed.length} 台。跳过 ${skippedIps.length} 个未监控 IP: ${skippedIps.slice(0,5).join(", ")}${skippedIps.length > 5 ? "..." : ""}`
                  : `导入成功: 更新 ${result.processed_count ?? parsed.length} 台`;
                alert(msg);
                // 刷新列表
                const refresh = await fetch("/api/assets/perf");
                const refreshData = await refresh.json();
                setItems(refreshData.items as VmAssetPerfItem[]);
                e.target.value = "";
              } catch (err: any) { alert("导入失败: " + err.message); }
            }} />
          </label>
          <span className="tabular-nums">共 {filtered.length} 台</span>
          <span className="tabular-nums text-primary">{onlineCount} 在线</span>
        </div>
      </div>
      {loading ? (
        <div className="p-8 text-center text-sm text-on-surface-variant">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-sm text-on-surface-variant">{search || statusFilter !== "all" ? "未匹配到设备" : "暂无设备数据"}</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-center">
              <thead className="bg-primary/[0.08] border-b-2 border-primary/20">
                <tr>
                  <th className="px-4 py-3 text-label-md text-on-surface-variant font-semibold tracking-wider uppercase text-[10px]">状态</th>
                  <th className="px-4 py-3 text-label-md text-on-surface-variant font-semibold tracking-wider uppercase text-[10px]">主机名</th>
                  <th className="px-4 py-3 text-label-md text-on-surface-variant font-semibold tracking-wider uppercase text-[10px]">IP</th>
                  <th className="px-4 py-3 text-label-md text-on-surface-variant font-semibold tracking-wider uppercase text-[10px]">CPU / 内存</th>
                  <th className="px-4 py-3 text-label-md text-on-surface-variant font-semibold tracking-wider uppercase text-[10px]">闲置天数</th>
                  <th className="px-4 py-3 text-label-md text-on-surface-variant font-semibold tracking-wider uppercase text-[10px]">部门</th>
                  <th className="px-4 py-3 text-label-md text-on-surface-variant font-semibold tracking-wider uppercase text-[10px]">负责人</th>
                  <th className="px-4 py-3 text-label-md text-on-surface-variant font-semibold tracking-wider uppercase text-[10px]">操作系统</th>
                  <th className="px-4 py-3 text-label-md text-on-surface-variant font-semibold tracking-wider uppercase text-[10px]">座机</th>
                  <th className="px-4 py-3 text-label-md text-on-surface-variant font-semibold tracking-wider uppercase text-[10px]">手机</th>
                  <th className="px-4 py-3 text-label-md text-on-surface-variant font-semibold tracking-wider uppercase text-[10px]">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08] min-h-[555px]">
                {paged.map((item) => (
                  <tr key={item.ip} className="hover:bg-primary/[0.05] transition-all duration-200 border-l-2 border-l-transparent hover:border-l-primary/40 odd:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${item.status === "active" ? "bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]" : "bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.4)]"}`} />
                    </td>
                    <td className="px-4 py-3 font-medium text-center text-base">{item.hostname ?? "--"}</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-center text-lg"><button onClick={() => navigate(`/host/${item.ip}`)} className="hover:text-[#4D8EFF] hover:scale-110 transition-all duration-200 cursor-pointer inline-block">{item.ip}</button></td>
                    <td className="px-4 py-3 text-on-surface-variant text-center text-base">
                      {item.cpu_avg != null ? item.cpu_avg.toFixed(1) + "%" : "--"} / {item.mem_avg != null ? item.mem_avg.toFixed(1) + "%" : "--"}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant text-center text-base">
                      {item.idle_days >= 0 ? item.idle_days + " 天" : "--"}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant text-center text-base">{item.department ?? "--"}</td>
                    <td className="px-4 py-3 text-on-surface-variant text-center text-base">{item.owner ?? "--"}</td>
                    <td className="px-4 py-3 text-on-surface-variant text-center text-base">{item.os_type ?? "--"}</td>
                    <td className="px-4 py-3 text-on-surface-variant text-center text-base">{item.phone ?? "--"}</td>
                    <td className="px-4 py-3 text-on-surface-variant text-center text-base">{item.mobile ?? "--"}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center gap-2 justify-center">
                      <button className="text-sm px-2 py-1 rounded text-white hover:scale-110 transition-all duration-200" style={{backgroundColor:"#4D8EFF",borderColor:"#4D8EFF"}} onClick={() => { setEditItem(item); setEditForm({ department: item.department ?? "", owner: item.owner ?? "", phone: item.phone ?? "", mobile: item.mobile ?? "", os_type: item.os_type ?? "" }); }}>修改</button>
                      <button className="text-sm px-2 py-1 rounded text-white hover:scale-110 transition-all duration-200" style={{backgroundColor:"#ef4444",borderColor:"#ef4444"}} onClick={async () => {
                        if (!confirm('确认删除主机 ' + item.ip + '？此操作不可撤销。')) return;
                        try {
                          const res = await fetch('/api/assets/' + item.ip, { method: 'DELETE' });
                          if (!res.ok) { const err = await res.json(); alert('删除失败: ' + JSON.stringify(err)); return; }
                          setItems(prev => prev.filter(i => i.ip !== item.ip));
                        } catch (e: any) { alert('删除失败: ' + e.message); }
                      }}>删除</button>
                    </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-white/[0.06] bg-white/[0.02] flex justify-between items-center text-sm text-on-surface-variant">
            <span>第 {page}/{totalPages} 页</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</Button>
            </div>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {showAddHost && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center" onClick={() => { setShowAddHost(false); setAddHostResults([]); setAddHostInput(""); }}>
          <div className="bg-surface border border-outline-variant rounded-lg p-6 w-full max-w-lg micro-border shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-headline-md mb-1">添加主机</h3>
            <p className="text-label-md text-on-surface-variant mb-4">输入 IP 或 IP 前缀（如 "192.168.1." 匹配整个 C 段），从 Zabbix 搜索并同步</p>
            <div className="flex gap-2 mb-4">
              <input
                value={addHostInput}
                onChange={(e) => setAddHostInput(e.target.value)}
                className="flex-1 h-9 px-3 rounded border border-white/10 bg-transparent text-sm text-on-surface-variant focus:outline-none focus:border-primary/50"
                placeholder="例: 172.27.32.30-60 或 192.168.1. 或 10.0.1.5"
                onKeyDown={(e) => { if (e.key === "Enter") { /* search below */ } }}
              />
              <Button
                size="sm"
                disabled={addHostSearching || !addHostInput.trim()}
                onClick={async () => {
                  setAddHostSearching(true);
                  setAddHostResults([]);
                  try {
                    const ips = addHostInput.split(",").map(s => s.trim()).filter(Boolean);
                    const res = await fetch("/api/v1/sync/search-zabbix-hosts", {
                      method: "POST",
                      headers: {"Content-Type": "application/json"},
                      body: JSON.stringify({ips}),
                    });
                    const data = await res.json();
                    setAddHostResults(data.hosts || []);
                  } catch (e: any) { alert("搜索失败: " + e.message); }
                  finally { setAddHostSearching(false); }
                }}
              >{addHostSearching ? "搜索中..." : "搜索 Zabbix"}</Button>
            </div>
            {addHostResults.length > 0 && (
              <>
                <p className="text-label-md text-on-surface-variant mb-2">找到 {addHostResults.length} 台主机</p>
                <div className="max-h-48 overflow-y-auto border border-white/10 rounded divide-y divide-white/5 mb-4">
                  {addHostResults.map((h: any) => (
                    <div key={h.ip} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="font-mono">{h.ip}</span>
                      <span className="text-on-surface-variant">{h.hostname}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => { setShowAddHost(false); setAddHostResults([]); setAddHostInput(""); }}>取消</Button>
                  <Button
                    size="sm"
                    disabled={addHostAdding}
                    onClick={async () => {
                      setAddHostAdding(true);
                      try {
                        const ips = addHostInput.split(",").map(s => s.trim()).filter(Boolean);
                        const res = await fetch("/api/v1/sync/add-zabbix-hosts", {
                          method: "POST",
                          headers: {"Content-Type": "application/json"},
                          body: JSON.stringify({ips}),
                        });
                        const data = await res.json();
                        alert(data.message || "添加完成");
                        setShowAddHost(false);
                        setAddHostResults([]);
                        setAddHostInput("");
                        // 刷新
                        const refresh = await fetch("/api/assets/perf");
                        const rd = await refresh.json();
                        setItems(rd.items as VmAssetPerfItem[]);
                      } catch (e: any) { alert("添加失败: " + e.message); }
                      finally { setAddHostAdding(false); }
                    }}
                  >{addHostAdding ? "添加中..." : "确认添加"}</Button>
                </div>
              </>
            )}
            {addHostResults.length === 0 && !addHostSearching && addHostInput && (
              <p className="text-label-md text-on-surface-variant">无匹配结果</p>
            )}
          </div>
        </div>,
        document.body
      )}
      {editItem && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center" onClick={() => setEditItem(null)}>
          <div className="bg-surface border border-outline-variant rounded-lg p-6 w-full max-w-md micro-border shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-headline-md mb-1">编辑主机信息</h3>
            <p className="text-label-md text-on-surface-variant mb-4">{editItem.ip} ({editItem.hostname})</p>
            <div className="space-y-3">
              {[
                { label: "部门", key: "department" },
                { label: "负责人", key: "owner" },
                { label: "座机", key: "phone" },
                { label: "手机", key: "mobile" },
                { label: "操作系统", key: "os_type" },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-label-md text-on-surface-variant mb-1">{field.label}</label>
                  <input
                    value={(editForm as any)[field.key]}
                    onChange={e => setEditForm(f => ({ ...f, [field.key]: e.target.value }))}
                    className="w-full h-9 px-3 rounded border border-white/10 bg-transparent text-sm text-on-surface-variant focus:outline-none focus:border-primary/50"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditItem(null)} className="text-xs h-8 px-4 rounded border border-white/10 text-on-surface-variant hover:border-white/30 transition-all">取消</button>
              <button
                onClick={async () => {
                  setSaving(true);
                  try {
                    const body: any = {};
                    for (const key of ["department","owner","phone","mobile","os_type"]) {
                      if ((editForm as any)[key] !== (editItem as any)[key]) body[key] = (editForm as any)[key];
                    }
                    if (Object.keys(body).length > 0) {
                      await fetch(`/api/assets/${editItem.ip}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(body),
                      });
                      // Refresh list
                      const res = await fetch("/api/assets/perf");
                      const data = await res.json();
                      setItems(data.items as VmAssetPerfItem[]);
                    }
                    setEditItem(null);
                  } catch (e: any) {
                    alert("保存失败: " + e.message);
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="text-xs h-8 px-4 rounded bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
