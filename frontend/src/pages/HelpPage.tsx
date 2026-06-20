import { useEffect, useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

// 导入所有文档
import md01 from "@/content/help-docs/01-quickstart.md?raw";
import md02 from "@/content/help-docs/02-device-management.md?raw";
import md03 from "@/content/help-docs/03-alerts.md?raw";
import md04 from "@/content/help-docs/04-logs.md?raw";
import md05 from "@/content/help-docs/05-users.md?raw";
import md06 from "@/content/help-docs/06-online-status.md?raw";
import md07 from "@/content/help-docs/07-recycle-scoring.md?raw";

// 文档定义
const DOCS = [
  { id: "quickstart", label: "仪表盘概览", content: md01 },
  { id: "devices", label: "设备管理", content: md02 },
  { id: "alerts", label: "告警规则", content: md03 },
  { id: "logs", label: "日志分析", content: md04 },
  { id: "users", label: "用户与权限", content: md05 },
  { id: "online-status", label: "在线状态判定", content: md06 },
  { id: "recycle-scoring", label: "回收建议打分策略", content: md07 },
];

interface TocItem {
  id: string;
  text: string;
  level: number;
}

function extractToc(md: string): TocItem[] {
  const re = /^(#{1,3})\s+(.+)$/gm;
  const items: TocItem[] = [];
  let m;
  while ((m = re.exec(md)) !== null) {
    const text = m[2].trim();
    const id = text.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/(^-|-$)/g, "");
    items.push({ id, text, level: m[1].length });
  }
  return items;
}

// Markdown 渲染组件
function H1({ children, ...props }: any) {
  const text = String(children);
  const id = text.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/(^-|-$)/g, "");
  return <h1 id={id} className="text-2xl font-bold mt-10 mb-5 pb-3 border-b border-white/10 text-white scroll-mt-24" {...props}>{children}</h1>;
}
function H2({ children, ...props }: any) {
  const text = String(children);
  const id = text.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/(^-|-$)/g, "");
  return <h2 id={id} className="text-xl font-semibold mt-8 mb-4 text-white/90 scroll-mt-24" {...props}>{children}</h2>;
}
function H3({ children, ...props }: any) {
  const text = String(children);
  const id = text.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/(^-|-$)/g, "");
  return <h3 id={id} className="text-lg font-semibold mt-6 mb-3 text-white/85 scroll-mt-24" {...props}>{children}</h3>;
}
function P({ children }: any) { return <p className="my-3 text-white/65 leading-7 text-[15px]">{children}</p>; }
function UL({ children }: any) { return <ul className="my-3 space-y-1.5 list-none">{children}</ul>; }
function LI({ children }: any) {
  return <li className="text-white/65 text-[15px] leading-relaxed pl-5 relative before:content-['•'] before:absolute before:left-1 before:text-primary/60">{children}</li>;
}
function Strong({ children }: any) { return <strong className="font-semibold text-white/85">{children}</strong>; }
function Code({ children, className }: any) {
  if (!className) return <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-md text-sm font-mono font-medium">{children}</code>;
  return (
    <div className="my-4 rounded-lg border border-white/5 overflow-hidden">
      <div className="px-4 py-2 bg-white/[0.03] border-b border-white/5 text-xs text-white/30 font-mono uppercase">CODE</div>
      <pre className="p-4 bg-transparent overflow-x-auto text-sm"><code className={className}>{children}</code></pre>
    </div>
  );
}
function Table({ children }: any) { return <div className="my-4 overflow-x-auto rounded-lg border border-white/5"><table className="w-full text-sm">{children}</table></div>; }
function THead({ children }: any) { return <thead className="bg-white/[0.04] border-b border-white/10">{children}</thead>; }
function TH({ children }: any) { return <th className="px-4 py-2.5 text-left text-white/80 font-semibold text-sm">{children}</th>; }
function TD({ children }: any) { return <td className="px-4 py-2.5 text-white/60 border-b border-white/[0.04]">{children}</td>; }
function HR() { return <hr className="my-8 border-white/5" />; }

export function HelpPage() {
  const [activeDoc, setActiveDoc] = useState(DOCS[0].id);
  const [activeId, setActiveId] = useState("");

  const currentDoc = DOCS.find((d) => d.id === activeDoc) || DOCS[0];
  const toc = useMemo(() => extractToc(currentDoc.content), [currentDoc]);

  // 滚动时高亮当前标题
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { for (const e of entries) { if (e.isIntersecting) setActiveId(e.target.id); } },
      { rootMargin: "-80px 0px -60% 0px" }
    );
    const hs = document.querySelectorAll("h1[id], h2[id], h3[id]");
    hs.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [currentDoc]);

  // 切换文档时重置 TOC 高亮
  useEffect(() => { setActiveId(""); }, [activeDoc]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); }
  };

  return (
    <div className="flex gap-0 -m-6 min-h-[calc(100vh-4rem)]">
      {/* ====== 左侧文档列表 ====== */}
      <aside className="w-56 flex-shrink-0 border-r border-white/[0.04] bg-[#0a0a0c] overflow-y-auto sticky top-16 h-[calc(100vh-4rem)]">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-6 px-2">
            <span className="material-symbols-outlined text-primary text-xl">menu_book</span>
            <span className="text-sm font-semibold text-white/85">帮助文档</span>
          </div>
          <nav className="space-y-5">
            <div>
              <h4 className="px-2 mb-2 text-[11px] font-semibold text-white/25 uppercase tracking-widest">文档列表</h4>
              <ul className="space-y-px">
                {DOCS.map((doc) => (
                  <li key={doc.id}>
                    <button
                      onClick={() => setActiveDoc(doc.id)}
                      className={`w-full text-left px-2 py-1.5 text-[13px] rounded-md transition-all duration-150 ${
                        activeDoc === doc.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
                      }`}
                    >
                      {doc.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>
      </aside>

      {/* ====== 中间文档内容 ====== */}
      <main className="flex-1 min-w-0 flex justify-center overflow-auto">
        <div className="w-full px-12 py-10 max-w-5xl">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{ h1: H1 as any, h2: H2 as any, h3: H3 as any, p: P, ul: UL, li: LI, strong: Strong, code: Code, table: Table, thead: THead, th: TH, td: TD, hr: HR }}
          >
            {currentDoc.content}
          </ReactMarkdown>
        </div>
      </main>

      {/* ====== 右侧当前文档目录 ====== */}
      <aside className="w-48 flex-shrink-0 border-l border-white/[0.04] overflow-y-auto sticky top-16 h-[calc(100vh-4rem)] hidden xl:block">
        <div className="p-4">
          <h4 className="text-[11px] font-semibold text-white/25 uppercase tracking-widest mb-3 px-2">本页目录</h4>
          <nav className="space-y-px">
            {toc.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`block w-full text-left text-[13px] py-1 transition-all duration-150 truncate ${
                  item.level === 1 ? "pl-2 font-medium" : item.level === 2 ? "pl-4" : "pl-6"
                } ${
                  activeId === item.id
                    ? "text-primary border-l-2 border-primary -ml-[2px]"
                    : "text-white/30 hover:text-white/55 border-l-2 border-transparent -ml-[2px]"
                }`}
              >
                {item.text}
              </button>
            ))}
          </nav>
        </div>
      </aside>
    </div>
  );
}
