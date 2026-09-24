"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseInteractionCommand } from "@/lib/ops/interactions";
import { download } from "@/lib/ops/export";
import { OperationFeedback, ProposalReview, useInteraction, useOperation } from "./shared";
const help = `/sources              列出已确认资料
/status               查看当前资料与成果状态
/read                 读取共同报告
/ask 你的问题          根据资料回答，不改报告
/draft 你的要求        生成报告初稿，等待确认
/rewrite 修改要求      修改整篇报告，等待确认
/apply                接受待确认的修改
/discard              丢弃待确认的修改
/export               下载共同报告
/help                 显示帮助
↑ / ↓ 浏览历史指令；Ctrl + C 停止当前请求。`;
export function CommandLine() {
  const { w, ops, request, propose, update } = useInteraction();
  const [command, setCommand] = useState(""), [historyIndex, setHistoryIndex] = useState(-1);
  const op = useOperation();
  const outputRef = useRef<HTMLDivElement>(null), inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { const el = outputRef.current; if (el) el.scrollTop = el.scrollHeight; }, [w.interaction.terminal.length, op.working]);
  useEffect(() => { if (!op.working) inputRef.current?.focus(); }, [op.working]);
  useEffect(() => {
    const cancel = (e: KeyboardEvent) => { if (e.ctrlKey && e.key === "c" && op.working) { e.preventDefault(); op.cancel(); } };
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, [op]);
  function append(raw: string, output: string, status: "done" | "error") {
    update(l => ({ ...l, terminal: [...l.terminal, { id: crypto.randomUUID(), command: raw, output: output.length > 6500 ? `${output.slice(0, 6400)}\n…终端显示已截断；候选正文仍可在下方完整审阅。` : output, status }].slice(-12) }));
  }
  async function execute(signal: AbortSignal) {
    const raw = command.trim(); if (!raw) return;
    setCommand(""); setHistoryIndex(-1);
    try {
      const { name, argument } = parseInteractionCommand(raw);
      let output = "";
      if (name === "/help") output = help;
      else if (name === "/sources") output = w.sources.filter(s => s.confirmed).map(s => `• ${s.name} · ${s.mcp ? "MCP" : "导入资料"} · ${s.tables.length} 张表`).join("\n") || "没有已确认资料。";
      else if (name === "/status") output = `${w.name}\n资料版本：${w.dataVersion}\n报告：${w.report.length} 字\n待确认修改：${w.interaction.proposal ? "有" : "无"}\n${ops.saveStatus}`;
      else if (name === "/read") output = w.report || "报告为空，可用 /draft 生成初稿。";
      else if (name === "/discard") { update(l => ({ ...l, proposal: null })); output = "已丢弃建议，共同报告未变。"; }
      else if (name === "/apply") { if (!w.interaction.proposal) throw new Error("没有待接受的修改。"); await ops.applyInteractionProposal(w.interaction.proposal); output = "已接受修改并保存对应文件。可在 IDE 模式查看、回退。"; }
      else if (name === "/export") { if (!w.report) throw new Error("当前报告为空。"); download(`${w.name}.md`, w.report, "text/markdown;charset=utf-8"); output = "已发起下载当前报告。"; }
      else {
        if (name === "/rewrite" && !w.report.trim()) throw new Error("报告为空，请先用 /draft 生成初稿。");
        const action = name === "/ask" ? "ask" : name === "/draft" ? "draft" : "rewrite";
        const result = await request({ action, instruction: argument, draft: w.report }, signal);
        if (action !== "ask") { propose(result.content, `命令生成：${name}`); output = `${result.content}\n\n[候选成果，尚未应用] 请审阅下方差异，再用 /apply 接受或 /discard 丢弃。`; }
        else output = result.content;
      }
      append(raw, output, "done");
    } catch (e) { append(raw, signal.aborted ? "已停止。已发送的请求可能消耗额度。" : e instanceof Error ? e.message : "执行失败。", "error"); throw e; }
  }
  return <><section className="interaction-terminal"><header><span>● ● ●</span><strong>资料工作台 / CLI</strong><span>本页命令</span></header><div ref={outputRef} className="interaction-terminal-output" role="log" aria-label="命令输出"><p className="interaction-terminal-welcome">同一份资料，同一份成果。输入 /help 查看命令。<br />这是工作台命令界面，不执行电脑系统命令。</p>{!w.interaction.terminal.length && <pre>{help}</pre>}{w.interaction.terminal.map(line => <div key={line.id} className="interaction-terminal-entry" data-status={line.status}><strong>❯ {line.command}</strong><pre>{line.output}</pre></div>)}</div><ProposalReview />
    <form onSubmit={e => { e.preventDefault(); void op.run(execute); }}><span>❯</span><Input ref={inputRef} aria-label="CLI 命令" value={command} maxLength={12000} disabled={op.working || ops.busy} autoComplete="off" placeholder="/ask 这份资料有哪些待确认问题？" onChange={e => setCommand(e.target.value)} onKeyDown={e => { if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); const next = e.key === "ArrowUp" ? Math.min(historyIndex + 1, w.interaction.terminal.length - 1) : Math.max(-1, historyIndex - 1); setHistoryIndex(next); setCommand(next < 0 ? "" : w.interaction.terminal.at(-1 - next)?.command || ""); } }} /><Button type="submit" disabled={op.working || ops.busy || !command.trim()}>执行</Button></form>
    <div className="interaction-terminal-shortcuts">{["/help", "/sources", "/read", "/draft ", "/apply"].map(cmd => <button key={cmd} disabled={op.working} onClick={() => setCommand(cmd)}>{cmd}</button>)}</div>
  </section><div onKeyDown={e => { if (e.ctrlKey && e.key === "c") op.cancel(); }} tabIndex={op.working ? 0 : -1}><OperationFeedback operation={op} /></div></>;
}
