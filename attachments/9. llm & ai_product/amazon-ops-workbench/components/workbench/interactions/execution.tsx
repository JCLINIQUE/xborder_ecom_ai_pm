"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { runWorkflowGraph } from "@/lib/ops/workflow-graph";
import { runInteractionSteps, stepSchema, type InteractionRun } from "@/lib/ops/interactions";
import { OperationFeedback, ProposalReview, useInteraction, useOperation } from "./shared";

const labels: Record<string, string> = { planned: "待审计划", running: "执行中", paused: "已暂停", review: "待验收", accepted: "已验收", error: "执行失败", interrupted: "已中断", pending: "待执行", done: "已完成", skipped: "条件不满足，已跳过" };
export function useExecution(kind: "task" | "workflow") {
  const { w, ops, update, request } = useInteraction();
  const op = useOperation(), pause = useRef(false);
  const run = kind === "task" ? w.interaction.task : w.interaction.workflow.run;
  function setRun(next: InteractionRun) {
    update(l => kind === "task" ? { ...l, task: next } : { ...l, workflow: { ...l.workflow, run: next } });
  }
  function start(initial: InteractionRun, retryOnce = false) {
    pause.current = false;
    return op.run(async signal => {
      if (initial.dataVersion !== w.dataVersion) throw new Error("资料已经变化，请重新规划或新建一次流程。");
      const runner = initial.graph ? runWorkflowGraph : runInteractionSteps;
      await runner({ run: initial, retryOnce, signal, warnings: w.sources.some(s => s.confirmed && (initial.source !== "mcp" || s.mcp) && s.warnings.length > 0), shouldPause: () => pause.current,
        persist: async next => { setRun(next); await ops.flush(); },
        perform: async (step, current) => {
          signal.throwIfAborted();
          const sources = w.sources.filter(s => s.confirmed && (kind === "task" || initial.source !== "mcp" || s.mcp));
          if (!sources.length) throw new Error("没有符合条件的已确认资料，请先导入、核对，再重新运行。");
          if (step.kind === "source") return { ...(initial.graph ? { artifact: sources.map(s=>s.text || JSON.stringify(s.tables)).join("\n\n").slice(0,50000) } : {}), note: `已读取 ${sources.length} 份已确认资料；未发起新的外部取数。` };
          if (step.kind === "condition") return { note: step.instruction };
          if (step.kind === "deliver") return { note: "候选成果已准备好，等待你验收。" };
          const result = await request({ action: step.kind === "review" ? "review" : "draft", instruction: `目标：${current.goal.slice(0, 4000)}\n当前步骤：${step.instruction}\n${current.review ? `之前的复核意见（最多3000字）：${current.review.slice(0, 3000)}` : ""}`, draft: current.artifact || current.base, source: initial.source }, signal);
          return step.kind === "review" ? { review: result.content, note: `已完成复核 · ${result.model}` } : { artifact: result.content, note: `已生成候选正文 · ${result.model}` };
        },
      });
    });
  }
  return { run, setRun, start, op, pause: () => { pause.current = true; }, w, ops, update, request };
}
type Execution = ReturnType<typeof useExecution>;
export function RunView({ execution, editable = false }: { execution: Execution; editable?: boolean }) {
  const { run, setRun, op, start, pause, w, ops } = execution;
  const [pauseRequested, setPauseRequested] = useState(false);
  const { consent, update } = useInteraction();
  if (!run) return null;
  const stale = run.dataVersion !== w.dataVersion;
  const canResume = ["planned", "paused", "error", "interrupted", "running"].includes(run.status);
  const displayStatus = run.status === "running" && !op.working ? "已中断，可续跑" : labels[run.status];
  return <section className="interaction-run">
    <div className="interaction-section-heading"><h3>执行记录</h3><span role="status">{displayStatus}</span></div>
    <ol className="interaction-timeline">{run.steps.map((s, index) => <li key={s.id} data-status={s.status}>
      <span className="interaction-step-index">{index + 1}</span><div><strong>{s.title}</strong><small>{s.status === "running" && !op.working ? "中断，等待续跑" : labels[s.status]}{s.attempts > 1 ? ` · 第 ${s.attempts} 次尝试` : ""}</small>
        {editable && !op.working && !["done", "skipped"].includes(s.status) && canResume ? <Textarea aria-label={`步骤 ${index + 1} 要求`} value={s.instruction} maxLength={4000} onChange={e => setRun({ ...run, steps: run.steps.map(x => x.id === s.id ? { ...x, instruction: e.target.value } : x) })} /> : <p>{s.instruction}</p>}
        {s.note && <p className={s.status === "error" ? "interaction-error" : "interaction-step-note"}>{s.note}</p>}
      </div></li>)}</ol>
    {stale && <p className="interaction-error">资料版本已变化，请重新规划或新建流程。</p>}
    <div className="interaction-actions">{canResume && !op.working && <Button disabled={stale || !consent || !!ops.connectionIssue || ops.busy} onClick={() => { setPauseRequested(false); void start(run, run.retryOnce); }}>{run.status === "planned" ? "确认计划并执行" : "从未完成步骤续跑"}</Button>}
      {op.working && <Button variant="outline" disabled={pauseRequested} onClick={() => { pause(); setPauseRequested(true); }}> {pauseRequested ? "当前步骤完成后暂停" : "暂停后续步骤"}</Button>}
    </div><OperationFeedback operation={op} />
    {run.error && !op.working && <p role="alert" className="interaction-error">{run.error}</p>}
    {run.artifact && <details className="interaction-result" open={run.status === "review"}><summary>{run.status === "accepted" ? "验收时的成果 · 已写入报告" : "候选成果 · 尚未写入报告"}</summary><pre>{run.artifact}</pre></details>}
    {run.review && <details className="interaction-result" open><summary>AI 复核意见 · 请人工核对</summary><pre>{run.review}</pre></details>}
    {run.status === "review" && <Button disabled={stale || ops.busy} onClick={() => update(l => ({ ...l, proposal: { id: crypto.randomUUID(), title: "任务成果验收", runId: run.id, base: run.base, result: run.artifact, start: null, end: null, dataVersion: run.dataVersion, createdAt: new Date().toISOString() } }))}>与当前报告比较并验收</Button>}
    <ProposalReview />
  </section>;
}
export function Delegation() {
  const execution = useExecution("task"), { w, request, setRun, op, run, ops } = execution;
  const { consent } = useInteraction();
  const [goal, setGoal] = useState(run?.goal || w.prompt);
  async function plan(signal: AbortSignal) {
    const result = await request({ action: "plan", instruction: goal, draft: w.report }, signal);
    if (!result.steps) throw new Error("模型没有返回可执行计划，请重试。");
    setRun({ id: crypto.randomUUID(), source: "confirmed", retryOnce: false, goal, steps: result.steps.map(s => stepSchema.parse({ ...s, id: crypto.randomUUID() })), status: "planned", artifact: "", review: "", base: w.report, dataVersion: w.dataVersion, error: "" });
    await ops.flush();
  }
  return <div className={`delegation-studio ${run ? "has-task" : ""}`}>
    <aside className="delegation-rail"><strong>工作任务</strong><button className="delegation-current">{run ? run.goal.slice(0, 36) : "新任务"}</button><div><small>已授权资料</small>{w.sources.filter(s=>s.confirmed).map(s=><p key={s.id}>▤ {s.name}</p>)}</div><p className="delegation-local-note">任务在当前页面执行，离开后可续跑。</p></aside>
    <main className="delegation-conversation">
      {!run ? <div className="delegation-welcome"><span className="delegation-spark">✳</span><h1>今天，想一起完成什么？</h1><p>告诉我目标和验收要求。我会先给出计划，再开始处理。</p><div className="delegation-suggestions">{["整理一份日报，标出需要关注的问题", "核对资料中的数字，列出证据和缺项", "把已有报告改成可执行的行动清单"].map(text=><button key={text} onClick={()=>setGoal(text)}>{text}<span>↗</span></button>)}</div></div> : <div className="delegation-thread"><div className="delegation-user-message">{run.goal}</div><div className="delegation-assistant-message"><span className="delegation-spark">✳</span><p>{run.status === "planned" ? "这是我的执行计划。你可以调整每一步的要求，确认后我再开始。" : run.status === "accepted" ? "成果已经验收，并保存到共同报告。" : "我会沿着这份计划继续，已完成的步骤会保留。"}</p></div><RunView execution={execution} editable /></div>}
      <div className="delegation-compose-wrap"><div className="delegation-composer"><Textarea aria-label="委派目标" value={goal} maxLength={12000} disabled={op.working} onChange={e=>setGoal(e.target.value)} placeholder={run ? "调整目标后重新规划，或直接修改上方未完成的步骤…" : "描述你想交付的成果…"}/><div><span>▤ {w.sources.filter(s=>s.confirmed).length} 份资料 · {ops.connection.provider}</span><Button aria-label={run ? "调整目标并重新规划" : "提交任务目标"} disabled={!consent||!goal.trim()||op.working||ops.busy||!!ops.connectionIssue} onClick={()=>void op.run(plan)}>{run?"重新规划":"开始规划"} ↑</Button></div></div>{!run&&<OperationFeedback operation={op}/>}</div>
    </main>
    {run&&<aside className="delegation-task-info"><small>本次任务</small><h3>{run.status==="accepted"?"已交付":run.status==="review"?"等待验收":"执行计划"}</h3><div className="delegation-progress"><span style={{width:`${run.steps.filter(s=>s.status==="done").length / Math.max(1,run.steps.length)*100}%`}}/></div><p>{run.steps.filter(s=>s.status==="done").length} / {run.steps.length} 步完成</p>{run.steps.map(s=><div className="delegation-task-step" key={s.id}><span>{s.status==="done"?"✓":s.status==="running"&&op.working?"◉":"○"}</span>{s.title}</div>)}<hr/><small>交付文件</small><p>▤ report.md</p><small>运行状态</small><p>{run.status==="running"&&!op.working?"已中断，可续跑":labels[run.status]}</p></aside>}
  </div>;
}
