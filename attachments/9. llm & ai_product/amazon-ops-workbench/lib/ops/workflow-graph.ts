import { z } from "zod";
import type { InteractionRun, InteractionStep } from "./interactions";
export const nodeKinds = [
  { kind: "source", title: "读取资料", icon: "DB", color: "#4885ff", description: "已确认资料 / 已导入 MCP" },
  { kind: "write", title: "大模型", icon: "AI", color: "#7856ff", description: "按指令生成或改写正文" },
  { kind: "condition", title: "条件分支", icon: "IF", color: "#e3a038", description: "根据上游结果选择路径" },
  { kind: "review", title: "内容复核", icon: "✓", color: "#20a895", description: "检查数据、证据与缺项" },
  { kind: "deliver", title: "输出结果", icon: "OUT", color: "#596579", description: "交给用户比较与接受" },
] as const;
export const graphNodeSchema = z.object({
  id: z.string(), kind: z.enum(["source", "write", "condition", "review", "deliver"]), title: z.string().min(1).max(100),
  x: z.number().min(0).max(4000), y: z.number().min(0).max(2500), instruction: z.string().max(4000).default(""),
  source: z.enum(["confirmed", "mcp"]).default("confirmed"), condition: z.enum(["warnings", "contains", "nonempty"]).default("nonempty"), value: z.string().max(200).default(""),
});
export const graphSchema = z.object({ nodes: z.array(graphNodeSchema).max(16), edges: z.array(z.object({ id: z.string(), from: z.string(), to: z.string(), port: z.enum(["next", "yes", "no"]) })).max(32) });
export type WorkflowGraph = z.infer<typeof graphSchema>;
export type GraphNode = z.infer<typeof graphNodeSchema>;
export function blankGraph(): WorkflowGraph { return { nodes: [graphNodeSchema.parse({ id: "start", kind: "source", title: "读取资料", x: 70, y: 160 }), graphNodeSchema.parse({ id: "end", kind: "deliver", title: "输出结果", x: 730, y: 160 })], edges: [] }; }
export function validateGraph(g: WorkflowGraph): string[] {
  const errors: string[] = [], map = new Map(g.nodes.map(n => [n.id,n]));
  const starts = g.nodes.filter(n => n.kind === "source"), ends = g.nodes.filter(n => n.kind === "deliver");
  if (map.size !== g.nodes.length) errors.push("节点 ID 重复。");
  if (starts.length !== 1 || ends.length !== 1) errors.push("请保留一个读取资料节点和一个输出结果节点。");
  if (!g.nodes.some(n => n.kind === "write")) errors.push("请添加至少一个大模型节点。");
  for (const e of g.edges) if (!map.has(e.from) || !map.has(e.to)) errors.push("有连接指向已删除的节点。");
  for (const n of g.nodes) {
    const outgoing = g.edges.filter(e => e.from === n.id);
    if (n.kind === "write" && !n.instruction.trim()) errors.push(`「${n.title}」还没有填写模型指令。`);
    const ports = n.kind === "condition" ? ["yes", "no"] : n.kind === "deliver" ? [] : ["next"];
    if (outgoing.some(e => !ports.includes(e.port)) || ports.some(p => outgoing.filter(e => e.port === p).length !== 1)) errors.push(`「${n.title}」${n.kind === "condition" ? "的满足、不满足两个出口都需要连接" : "需要连接到下一步"}。`);
    if (n.kind === "condition" && n.condition === "contains" && !n.value.trim()) errors.push(`「${n.title}」需要填写要查找的文字。`);
    if (n.kind === "source" && g.edges.some(e => e.to === n.id)) errors.push("读取资料节点不能有输入连接。");
  }
  const seen = new Set<string>(), active = new Set<string>();
  function walk(id: string) { if (active.has(id)) { errors.push("流程存在循环，请删除回连后再运行。"); return; } if (seen.has(id)) return; seen.add(id); active.add(id); for (const e of g.edges.filter(e=>e.from===id)) walk(e.to); active.delete(id); }
  if (starts[0]) walk(starts[0].id);
  if (seen.size !== g.nodes.length) errors.push("有节点未接入主流程，请连接或删除。");
  return [...new Set(errors)];
}
export function branchPort(n: GraphNode, text: string, hasWarnings: boolean): "yes" | "no" {
  return (n.condition === "warnings" ? hasWarnings : n.condition === "contains" ? text.includes(n.value) : !!text.trim()) ? "yes" : "no";
}
export async function runWorkflowGraph(options: { run: InteractionRun; signal: AbortSignal; warnings: boolean; shouldPause: () => boolean; persist: (r: InteractionRun)=>Promise<void>; perform: (s: InteractionStep,r: InteractionRun)=>Promise<{artifact?:string;review?:string;note?:string}> }) {
  const r = structuredClone(options.run), g = r.graph;
  if (!g) throw new Error("流程快照不存在，请从画布新建运行。");
  const errors = validateGraph(g); if (errors.length) throw new Error(errors.join("\n"));
  let id: string | undefined = g.nodes.find(n => n.kind === "source")!.id;
  let previousKind: GraphNode["kind"] | undefined;
  r.status="running"; r.error="";
  while (id) {
    const node = g.nodes.find(n=>n.id===id)!, index = r.steps.findIndex(s=>s.id===id);
    let step = r.steps[index];
    if (step.status !== "done") {
      if (options.signal.aborted) { r.status="interrupted"; break; }
      if (options.shouldPause()) { r.status="paused"; break; }
      for (let attempt=1; attempt<=(r.retryOnce ? 2 : 1); attempt++) {
        step = r.steps[index] = { ...step, status:"running", attempts:attempt, note:"" };
        await options.persist(structuredClone(r));
        try {
          if (node.kind === "condition") {
            step.branchChoice=branchPort(node,previousKind === "review" ? r.review : r.artifact,options.warnings);
            step.note=step.branchChoice === "yes" ? "条件满足 → 走满足出口" : "条件不满足 → 走不满足出口";
          } else {
            const result=await options.perform(step,structuredClone(r));
            options.signal.throwIfAborted();
            if (result.artifact !== undefined) r.artifact=result.artifact;
            if (result.review !== undefined) r.review=result.review;
            step.note=result.note || "已完成";
          }
          step.status="done"; r.error=""; await options.persist(structuredClone(r)); break;
        } catch(e) {
          step.status=options.signal.aborted ? "interrupted" : "error";
          step.note=(e instanceof Error ? e.message : "执行失败").slice(0,2000); r.error=step.note;
          if (options.signal.aborted || attempt === (r.retryOnce ? 2 : 1)) { r.status=options.signal.aborted ? "interrupted" : "error"; await options.persist(r); return r; }
        }
      }
    }
    if (node.kind === "deliver") { r.status="review"; for (const s of r.steps) if (s.status === "pending") { s.status="skipped"; s.note="当前分支未经过此节点"; } break; }
    const port=node.kind === "condition" ? step.branchChoice : "next";
    previousKind=node.kind;
    id=g.edges.find(e=>e.from===node.id && e.port===port)?.to;
  }
  await options.persist(r); return r;
}
