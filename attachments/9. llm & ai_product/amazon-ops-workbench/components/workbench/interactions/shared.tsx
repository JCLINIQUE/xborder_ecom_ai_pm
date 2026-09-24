"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace } from "@/lib/ops/workspace-context";
import type { Workspace } from "@/lib/ops/domain";
import type { InteractionState, Proposal } from "@/lib/ops/interactions";
import { documentContent, writeDocument } from "@/lib/ops/workspace-documents";
import { download } from "@/lib/ops/export";

type Ops = ReturnType<typeof useWorkspace>;
const Context = createContext<{ ops: Ops; w: Workspace; consent: boolean } | null>(null);
export function InteractionProvider({ value, children }: { value: { ops: Ops; w: Workspace; consent: boolean }; children: ReactNode }) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useInteraction() {
  const state = useContext(Context);
  if (!state) throw new Error("InteractionProvider missing");
  const { ops, w, consent } = state;
  function update(transform: (lab: InteractionState) => InteractionState) {
    ops.update(current => current.id !== w.id ? current : { ...current, interaction: transform(current.interaction) });
  }
  async function request(input: Parameters<Ops["interact"]>[0], signal: AbortSignal) {
    if (!consent) throw new Error("请先勾选上方的模型调用许可。");
    return ops.interact(input, signal, { id: w.id, dataVersion: w.dataVersion });
  }
  function propose(result: string, title: string, base = w.report, selection?: { start: number; end: number }, target = "report") {
    const proposal: Proposal = { target, id: crypto.randomUUID(), title, result, base, start: selection?.start ?? null, end: selection?.end ?? null, dataVersion: w.dataVersion, createdAt: new Date().toISOString() };
    update(lab => ({ ...lab, proposal }));
    return proposal;
  }
  return { ...state, update, request, propose };
}
export function useOperation() {
  const controller = useRef<AbortController | null>(null);
  const [working, setWorking] = useState(false), [error, setError] = useState("");
  useEffect(() => () => controller.current?.abort(), []);
  async function run(action: (signal: AbortSignal) => Promise<void>) {
    if (controller.current) return;
    const ctl = new AbortController(); controller.current = ctl; setWorking(true); setError("");
    try { await action(ctl.signal); }
    catch (e) { setError(ctl.signal.aborted ? "已停止当前请求，未应用的建议不会修改文件。服务商可能已消耗本次额度。" : e instanceof Error ? e.message : "执行失败，请重试。"); }
    finally { if (controller.current === ctl) { controller.current = null; setWorking(false); } }
  }
  return { working, error, run, cancel: () => controller.current?.abort(), clearError: () => setError("") };
}
export function OperationFeedback({ operation }: { operation: ReturnType<typeof useOperation> }) {
  return <>{operation.working && <div className="interaction-working" role="status"><span className="interaction-spinner" />正在执行当前操作<Button variant="ghost" size="sm" onClick={operation.cancel}>停止</Button></div>}
    {operation.error && <p className="interaction-error" role="alert">{operation.error}</p>}</>;
}
export function ProposalReview() {
  const { ops, w, update } = useInteraction();
  const op = useOperation();
  const p = w.interaction.proposal;
  if (!p) return null;
  let currentContent: string | null = null;
  try { currentContent = documentContent(w, p.target); } catch { /* Removed source keeps the suggestion unavailable. */ }
  const stale = p.base !== currentContent || p.dataVersion !== w.dataVersion;
  const original = p.start === null ? p.base : p.base.slice(p.start, p.end ?? undefined);
  return <section className="interaction-proposal" aria-label="待接受的修改">
    <div className="interaction-section-heading"><div><small>待你确认</small><h3>{p.title}</h3></div><span>{p.start === null ? "整篇建议" : `仅替换选中的 ${original.length} 字`}</span></div>
    <div className="interaction-diff"><div><strong>修改前</strong><pre>{original || "空白文件"}</pre></div><div><strong>修改后</strong><pre>{p.result}</pre></div></div>
    {stale && <p role="alert" className="interaction-error">正文或资料已经变化，请重新生成建议，避免覆盖新修改。</p>}
    <div className="interaction-actions"><Button disabled={stale || op.working || ops.busy} onClick={() => void op.run(async () => { await ops.applyInteractionProposal(p); })}>接受修改</Button><Button variant="outline" disabled={op.working} onClick={() => update(l => ({ ...l, proposal: null }))}>保留原文</Button></div>
    <OperationFeedback operation={op} />
  </section>;
}
export function DocumentEditor({ onSelection, editorStyle = false }: { onSelection?: (selection: { start: number; end: number } | null) => void; editorStyle?: boolean }) {
  const { ops, w } = useInteraction();
  return <Textarea aria-label="共同报告正文" className={editorStyle ? "interaction-code-editor" : "interaction-document-editor"} value={w.report} maxLength={100000}
    placeholder="可以直接写正文，也可以让 AI 根据已确认资料生成初稿。"
    onSelect={e => { const el = e.currentTarget; onSelection?.(el.selectionStart === el.selectionEnd ? null : { start: el.selectionStart, end: el.selectionEnd }); }}
    onChange={e => { onSelection?.(null); ops.update(current => ({ ...current, report: e.target.value, reportDataVersion: current.dataVersion })); }} />;
}
export function ArtifactActions() {
  const { w, ops, update } = useInteraction();
  const latest = w.analyses.at(-1);
  return <div className="interaction-actions">
    <Button variant="outline" size="sm" disabled={!w.report.trim()} onClick={() => download(`${w.name}.md`, w.report, "text/markdown;charset=utf-8")}>下载当前成果</Button>
    {latest && <Button variant="outline" size="sm" onClick={() => update(l => ({ ...l, proposal: { id: crypto.randomUUID(), title: "带入最近一次分析", base: w.report, result: latest.content, start: null, end: null, dataVersion: latest.dataVersion, createdAt: new Date().toISOString() } }))}>带入已有分析</Button>}
    <Button variant="ghost" size="sm" onClick={() => void ops.flush().catch(ops.notifyError)}>保存</Button>
  </div>;
}
export function VersionHistory() {
  const { w, ops } = useInteraction();
  if (!w.interaction.history.length) return null;
  return <section className="interaction-history"><h3>修改记录</h3><p>保留最近三次接受修改前的文件版本。</p>{w.interaction.history.map(item => <div key={item.id}><span>{item.title}<small>{new Date(item.createdAt).toLocaleString("zh-CN")}</small></span><Button size="sm" variant="outline" disabled={ops.busy} onClick={() => {
    try { ops.update(current => {
      const target = item.target || "report", before = documentContent(current, target);
      const restored = writeDocument(current, target, item.content);
      return { ...restored, reportDataVersion: target === "report" ? item.dataVersion : restored.reportDataVersion, interaction: { ...restored.interaction, proposal: null, history: [{ id: crypto.randomUUID(), target, title: "回退前的版本", content: before, dataVersion: target === "report" ? current.reportDataVersion : current.dataVersion, createdAt: new Date().toISOString() }, ...current.interaction.history.filter(h => h.id !== item.id)].slice(0, 3) } };
    }); } catch (e) { ops.notifyError(e); }
  }}>回退至此版本</Button></div>)}</section>;
}
