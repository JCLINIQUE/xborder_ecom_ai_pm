"use client";
import { useEffect, useRef, useState } from "react";
import { Files, SlidersHorizontal, MessageSquare, ChevronRight, PanelRight, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { documentContent, documentLimit, writeDocument } from "@/lib/ops/workspace-documents";
import { download } from "@/lib/ops/export";
import { OperationFeedback, ProposalReview, useInteraction, useOperation, VersionHistory } from "./shared";

export function FileEditor() {
  const { w, ops, consent, request, propose } = useInteraction();
  const [settings, setSettings] = useState(false);
  const [prefs, setPrefs] = useState({ size: 15, lineHeight: 1.8, font: "mono", wrap: false });
  const gutter = useRef<HTMLDivElement>(null);
  useEffect(() => { try { const p = JSON.parse(localStorage.getItem("day09-editor-preferences") || "null"); if (p) setPrefs({ size: Math.max(12, Math.min(22, Number(p.size) || 15)), lineHeight: Math.max(1.4, Math.min(2.2, Number(p.lineHeight) || 1.8)), font: p.font === "sans" ? "sans" : "mono", wrap: !!p.wrap }); } catch {} }, []);
  function preference(patch: Partial<typeof prefs>) { const next = { ...prefs, ...patch }; setPrefs(next); localStorage.setItem("day09-editor-preferences", JSON.stringify(next)); }

  const [file, setFile] = useState("report"), [instruction, setInstruction] = useState(""), [history, setHistory] = useState(false);
  const [range, setRange] = useState<{ start: number; end: number; base: string; file: string } | null>(null);
  const input = useRef<HTMLTextAreaElement>(null), editor = useRef<HTMLTextAreaElement>(null), op = useOperation();
  const files = [{ id: "report", name: "report.md", detail: "共同报告" }, { id: "prompt", name: "task.md", detail: "任务要求" }, ...w.sources.filter(s => s.confirmed).map(s => ({ id: `source:${s.id}`, name: s.name, detail: "资料文字" }))];
  const active = files.find(f => f.id === file) || files[0];
  const content = documentContent(w, active.id);
  const selection = range?.file === active.id && range.base === content ? range : null;
  const source = w.sources.find(s => `source:${s.id}` === active.id);
  function select(el: HTMLTextAreaElement) {
    setRange(el.selectionStart === el.selectionEnd ? null : { start: el.selectionStart, end: el.selectionEnd, base: el.value, file: active.id });
  }
  async function generate(signal: AbortSignal) {
    const result = await request({ action: content ? "rewrite" : "draft", instruction: `当前编辑文件：${active.name}（${active.detail}）。只修改这个文件。${active.id === "prompt" ? "这是任务指令文件，请改写指令本身，不要执行指令生成报告。" : ""}\n${instruction.trim() || "改善结构和表达，保留事实与数据。"}`, draft: content, selection: selection ? { start: selection.start, end: selection.end } : undefined }, signal);
    propose(result.content, `${active.name.slice(0, 100)} · ${selection ? "选区修改" : "文件修改"}`, content, selection ?? undefined, active.id);
  }
  return <div className="ide-workspace" onKeyDown={e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); input.current?.focus(); }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); void ops.flush().catch(ops.notifyError); }
  }}>
    <div className="interaction-ide cursor-layout">
      <div className="cursor-activity"><button aria-label="聚焦编辑区" onClick={() => editor.current?.focus()}><Files size={21}/></button><button aria-label="编辑器文字设置" onClick={() => setSettings(!settings)}><SlidersHorizontal size={21}/></button><button aria-label="聚焦 AI 助手" onClick={() => input.current?.focus()}><MessageSquare size={21}/></button></div>
      <nav className="interaction-file-tree" aria-label="资料文件"><small>EXPLORER <span>···</span></small>{files.map(f => <button key={f.id} aria-current={active.id === f.id ? "page" : undefined} onClick={() => { setFile(f.id); setRange(null); }}><span><ChevronRight size={12}/> {f.name}</span><small>{f.detail} · 可编辑</small></button>)}<p>修改自动保存到本次资料。</p></nav>
      <section className="interaction-editor-main">
        <div className="interaction-editor-tab"><strong>{active.name} <span>×</span></strong><span>{ops.saveStatus}</span><Button variant="ghost" size="sm" aria-label="打开文字设置" onClick={() => setSettings(!settings)}><Type size={15}/></Button></div>
        <div className="ide-document-tools"><span>{active.detail} · 直接输入即可编辑</span><Button variant="ghost" size="sm" onClick={() => { editor.current?.focus(); }}>编辑正文</Button><Button variant="ghost" size="sm" onClick={() => void ops.flush().catch(ops.notifyError)}>保存 ⌘S</Button></div>
        {source && <p className="ide-source-note">正在编辑提取后的资料文字，修改会更新分析依据。{source.tables.length > 0 ? "这里的文字修改不会同步改动原有结构化表格。" : "原始上传文件保留。"}</p>}
        {settings && <div className="cursor-settings"><strong>编辑器文字</strong><label>字号 <input aria-label="编辑器字号" type="range" min="12" max="22" value={prefs.size} onChange={e => preference({size:Number(e.target.value)})}/><span>{prefs.size}px</span></label><label>行距 <select aria-label="编辑器行距" value={prefs.lineHeight} onChange={e => preference({lineHeight:Number(e.target.value)})}>{[1.4,1.6,1.8,2,2.2].map(n=><option key={n} value={n}>{n}</option>)}</select></label><label>字体 <select aria-label="编辑器字体" value={prefs.font} onChange={e=>preference({font:e.target.value})}><option value="mono">等宽字体</option><option value="sans">系统字体</option></select></label><label><input type="checkbox" checked={prefs.wrap} onChange={e=>preference({wrap:e.target.checked})}/>自动换行</label></div>}
        <div className="cursor-code-area" style={{fontSize:prefs.size,lineHeight:prefs.lineHeight,fontFamily:prefs.font==="mono"?'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace':'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'}}>
        {!prefs.wrap && <div ref={gutter} className="cursor-line-numbers" aria-hidden="true">{content.split("\n").map((_,i)=><div key={i}>{i+1}</div>)}</div>}
        <Textarea wrap={prefs.wrap?"soft":"off"} onScroll={e=>{if(gutter.current)gutter.current.scrollTop=e.currentTarget.scrollTop;}} key={active.id} ref={editor} spellCheck={false} aria-label={`${active.name} 正文`} className="interaction-code-editor" maxLength={documentLimit(active.id)} value={content} placeholder="在这里直接写内容，或选中文字后让 AI 修改。" onSelect={e => select(e.currentTarget)} onBlur={e => select(e.currentTarget)} onChange={e => { const value = e.currentTarget.value; setRange(null); ops.update(current => writeDocument(current, active.id, value)); }} />
        </div><div className="interaction-editor-status"><span>{selection ? `已选 ${selection.end - selection.start} 字` : `${content.length.toLocaleString()} 字 · 可编辑`}</span><span>Markdown · UTF-8</span></div>
      </section>
      <aside className="interaction-editor-assistant"><div className="cursor-agent-heading"><strong>Agent</strong><PanelRight size={16}/></div><h3>一起完成这份文件</h3><div className="ide-target"><strong>{active.name}</strong><span>{selection ? `仅修改选中的 ${selection.end - selection.start} 字` : "修改整份文件"}</span></div>
        {selection && <><blockquote className="ide-selection">{content.slice(selection.start, selection.end).slice(0, 250)}</blockquote><Button variant="ghost" size="sm" onClick={() => setRange(null)}>取消选区</Button></>}
        <Textarea ref={input} aria-label="编辑助手要求" maxLength={11000} value={instruction} onChange={e => setInstruction(e.target.value)} placeholder="希望这份文件怎么改？（⌘ / Ctrl + K 聚焦）" onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && consent && !ops.busy && !ops.connectionIssue) { e.preventDefault(); void op.run(generate); } }} />
        <Button disabled={!consent || !!ops.connectionIssue || ops.busy || op.working} onClick={() => void op.run(generate)}>{selection ? "修改选中文字" : "生成文件修改"}</Button>
        {!consent && <p>直接编辑无需调用模型；使用 AI 前请勾选上方许可。</p>}<OperationFeedback operation={op} />
        <div className="interaction-actions"><Button variant="outline" size="sm" disabled={!content} onClick={() => download(active.name.endsWith(".md") ? active.name : `${active.name}.md`, content, "text/markdown;charset=utf-8")}>下载当前文件</Button><Button variant="ghost" size="sm" onClick={() => setHistory(!history)}>修改记录</Button></div>
      </aside>
    </div>
    <ProposalReview />{history && <VersionHistory />}
  </div>;
}
