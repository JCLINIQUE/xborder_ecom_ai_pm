import { z } from "zod";
import { imageCanvasSchema } from "./image-canvas";
import { graphSchema } from "./workflow-graph";

export const interactionModes = [
  { id: "form", title: "步骤式工作台", hint: "逐项填写，逐步生成" },
  { id: "canvas", title: "成果共创", hint: "选中作品的一部分，一起修改" },
  { id: "delegate", title: "任务委派", hint: "交代目标，审计划、看进度、验收" },
  { id: "workflow", title: "流程编排", hint: "规定触发、步骤、分支和错误处理" },
  { id: "editor", title: "文件式 · IDE", hint: "资料、编辑器和修改建议并排" },
  { id: "terminal", title: "命令式 · CLI", hint: "用指令操作同一份资料和成果" },
] as const;
export type InteractionMode = typeof interactionModes[number]["id"];
export const stepSchema = z.object({
  id: z.string(), title: z.string().min(1).max(100), instruction: z.string().max(4000),
  kind: z.enum(["source", "condition", "write", "review", "deliver"]),
  status: z.enum(["pending", "running", "done", "skipped", "error", "interrupted"]).default("pending"),
  branchChoice: z.enum(["yes", "no"]).optional(),
  attempts: z.number().int().min(0).max(2).default(0),
  note: z.string().max(2000).default(""),
});
export const planSchema = z.object({ steps: z.array(z.object({
  title: z.string().min(1).max(100), instruction: z.string().min(1).max(4000), kind: z.enum(["write", "review"]),
})).min(1).max(5) }).refine(plan => plan.steps.some(s => s.kind === "write"), "计划至少需要一个撰写步骤");
export const proposalSchema = z.object({
  runId: z.string().optional(),
  target: z.string().max(250).optional(),
  id: z.string(), title: z.string().max(150), base: z.string().max(150000), result: z.string().max(50000),
  start: z.number().int().nonnegative().nullable(), end: z.number().int().nonnegative().nullable(),
  dataVersion: z.number(), createdAt: z.string(),
});
const runSchema = z.object({
  graph: graphSchema.optional(),
  source: z.enum(["confirmed", "mcp"]).default("confirmed"),
  retryOnce: z.boolean().default(false),
  id: z.string(), goal: z.string().max(12000), steps: z.array(stepSchema).max(16),
  status: z.enum(["planned", "running", "paused", "review", "accepted", "error", "interrupted"]),
  artifact: z.string().max(50000).default(""), review: z.string().max(50000).default(""),
  base: z.string().max(100000), dataVersion: z.number(), error: z.string().max(2000).default(""),
});
export const interactionSchema = z.object({
  canvas: imageCanvasSchema,
  proposal: proposalSchema.nullable().default(null),
  history: z.array(z.object({ target: z.string().max(250).optional(), id: z.string(), title: z.string().max(150), content: z.string().max(150000), dataVersion: z.number().nullable().default(null), createdAt: z.string() })).max(3).default([]),
  task: runSchema.nullable().default(null),
  workflow: z.object({
    graph: graphSchema.optional(),
    trigger: z.enum(["manual", "ready"]).default("manual"),
    review: z.enum(["always", "warnings", "never"]).default("warnings"),
    onError: z.enum(["stop", "retry-once"]).default("stop"),
    instruction: z.string().max(4000).default("根据已确认资料生成一份有依据的报告，区分事实、问题、建议和待补充信息。"),
    source: z.enum(["confirmed", "mcp"]).default("confirmed"),
    run: runSchema.nullable().default(null),
  }).default({}),
  terminal: z.array(z.object({ id: z.string(), command: z.string().max(12000), output: z.string().max(6500), status: z.enum(["done", "error"]) })).max(12).default([]),
}).default({});
export type InteractionState = z.infer<typeof interactionSchema>;
export type InteractionStep = z.infer<typeof stepSchema>;
export type InteractionRun = z.infer<typeof runSchema>;
export type Proposal = z.infer<typeof proposalSchema>;
export type InteractionAction = "draft" | "rewrite" | "plan" | "review" | "ask";
export type InteractionResult = { content: string; model: string; dataVersion: number; steps?: z.infer<typeof planSchema>["steps"] };

export function acceptProposal(current: string, dataVersion: number, proposal: Proposal): string {
  if (proposal.base !== current || proposal.dataVersion !== dataVersion)
    throw new Error("正文或资料已变化，这份建议尚未应用。请基于当前版本重新生成。");
  if (proposal.start === null && proposal.end === null) return proposal.result;
  if (proposal.start === null || proposal.end === null || proposal.end <= proposal.start || proposal.end > current.length)
    throw new Error("选区已失效，请重新选择要修改的文字。");
  return current.slice(0, proposal.start) + proposal.result + current.slice(proposal.end);
}
export function parseInteractionCommand(raw: string) {
  const [name, ...rest] = raw.trim().split(/\s+/);
  if (!["/help", "/sources", "/status", "/read", "/ask", "/draft", "/rewrite", "/apply", "/discard", "/export"].includes(name))
    throw new Error("未知指令。输入 /help 查看可用命令；这里不执行系统 Shell 命令。");
  const argument = rest.join(" ");
  if (["/ask", "/draft", "/rewrite"].includes(name) && !argument)
    throw new Error(`${name} 后面需要填写你的要求。`);
  return { name, argument };
}
export function workflowSteps(config: InteractionState["workflow"], hasWarnings: boolean): InteractionStep[] {
  const review = config.review === "always" || (config.review === "warnings" && hasWarnings);
  return [
    { id: "source", title: "读取资料", kind: "source", instruction: config.source === "mcp" ? "读取已导入并确认的 MCP 资料" : "读取当前已确认资料" },
    { id: "condition", title: "检查分支条件", kind: "condition", instruction: review ? "进入复核分支" : "跳过复核分支" },
    { id: "draft", title: "模型整理", kind: "write", instruction: config.instruction },
    { id: "review", title: "检查证据与缺项", kind: "review", instruction: "检查草稿中的来源、缺失信息和未经证实的结论。只输出核对清单，不重写正文。", status: review ? "pending" : "skipped" },
    { id: "deliver", title: "交付候选成果", kind: "deliver", instruction: "等待人工验收，再写入共同报告" },
  ].map(s => stepSchema.parse(s));
}

export async function runInteractionSteps(options: {
  run: InteractionRun; retryOnce: boolean; signal: AbortSignal;
  perform: (step: InteractionStep, run: InteractionRun) => Promise<{ artifact?: string; review?: string; note?: string }>;
  persist: (run: InteractionRun) => Promise<void>;
  shouldPause: () => boolean;
}) {
  const run: InteractionRun = structuredClone(options.run);
  run.status = "running"; run.error = "";
  for (let index = 0; index < run.steps.length; index++) {
    if (["done", "skipped"].includes(run.steps[index].status)) continue;
    if (options.signal.aborted) { run.status = "interrupted"; break; }
    if (options.shouldPause()) { run.status = "paused"; break; }
    const attempts = options.retryOnce ? 2 : 1;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      run.steps[index] = { ...run.steps[index], status: "running", attempts: attempt, note: "" };
      await options.persist(structuredClone(run));
      try {
        const result = await options.perform(run.steps[index], structuredClone(run));
        options.signal.throwIfAborted();
        if (result.artifact !== undefined) run.artifact = result.artifact;
        if (result.review !== undefined) run.review = result.review;
        run.steps[index] = { ...run.steps[index], status: "done", note: result.note || "已完成" };
        run.error = "";
        await options.persist(structuredClone(run));
        break;
      } catch (error) {
        const stopped = options.signal.aborted;
        const message = stopped ? "本次请求已停止；已完成的步骤仍保留。" : (error instanceof Error ? error.message : "执行失败");
        run.steps[index] = { ...run.steps[index], status: stopped ? "interrupted" : "error", note: message.slice(0, 2000) };
        run.error = message.slice(0, 2000);
        if (stopped || attempt === attempts) {
          run.status = stopped ? "interrupted" : "error";
          await options.persist(run); return run;
        }
        await options.persist(structuredClone(run));
      }
    }
  }
  if (run.status === "running") run.status = "review";
  await options.persist(run);
  return run;
}
