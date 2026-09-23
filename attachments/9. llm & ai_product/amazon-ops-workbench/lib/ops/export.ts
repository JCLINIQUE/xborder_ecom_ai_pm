import type { Workspace } from "./domain";
export function download(
  name: string,
  content: string,
  mime = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
export const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
export function exportReport(w: Workspace, format: "md" | "html") {
  if (!w.report.trim()) throw new Error("请先生成或编辑日报。");
  const title = `${w.name}-${w.reportDate}`;
  download(
    title + "." + format,
    format === "md"
      ? w.report
      : `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{max-width:900px;margin:50px auto;padding:0 24px;font:15px/1.8 system-ui;color:#292929}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}h1{font-size:24px}</style><h1>${escapeHtml(title)}</h1><pre>${escapeHtml(w.report)}</pre></html>`,
    format === "md" ? "text/markdown;charset=utf-8" : "text/html;charset=utf-8",
  );
}
export function backup(w: Workspace) {
  download(
    `${w.name}-工作空间备份.json`,
    JSON.stringify(
      { format: "amazon-ops-workspace", version: 1, workspace: w },
      null,
      2,
    ),
    "application/json",
  );
}
