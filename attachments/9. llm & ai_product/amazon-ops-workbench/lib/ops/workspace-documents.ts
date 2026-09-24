import type { Workspace } from "./domain";
import { acceptProposal, type Proposal } from "./interactions";

export function documentContent(w: Workspace, target = "report"): string {
  if (target === "report") return w.report;
  if (target === "prompt") return w.prompt;
  const source = target.startsWith("source:") && w.sources.find(s => s.id === target.slice(7));
  if (!source) throw new Error("这份资料已不存在，请重新选择文件。");
  return source.text;
}
export function documentLimit(target: string) { return target === "prompt" ? 12000 : target === "report" ? 100000 : 150000; }
export function writeDocument(w: Workspace, target: string, content: string): Workspace {
  documentContent(w, target);
  if (content.length > documentLimit(target)) throw new Error("内容超过当前文件的长度上限，请缩小修改范围。");
  if (target === "report") return { ...w, report: content, reportDataVersion: w.dataVersion };
  if (target === "prompt") return { ...w, prompt: content };
  return { ...w, sources: w.sources.map(s => s.id === target.slice(7) ? { ...s, text: content } : s), dataVersion: w.dataVersion + 1 };
}
export function applyDocumentProposal(w: Workspace, p: Proposal): Workspace {
  const target = p.target || "report", before = documentContent(w, target);
  const content = acceptProposal(before, w.dataVersion, p);
  const next = writeDocument(w, target, content);
  return { ...next, interaction: { ...next.interaction, proposal: null,
    task: p.runId && w.interaction.task?.id === p.runId ? { ...w.interaction.task, status: "accepted" } : w.interaction.task,
    workflow: { ...w.interaction.workflow, run: p.runId && w.interaction.workflow.run?.id === p.runId ? { ...w.interaction.workflow.run, status: "accepted" } : w.interaction.workflow.run },
    history: [{ id: crypto.randomUUID(), target, title: p.title, content: before, dataVersion: target === "report" ? w.reportDataVersion : w.dataVersion, createdAt: new Date().toISOString() }, ...w.interaction.history].slice(0, 3),
  } };
}
