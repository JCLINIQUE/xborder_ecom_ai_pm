import { z } from "zod";
import { env } from "cloudflare:workers";
import { api, checkOrigin, HttpError, ownedWorkspace, userId } from "@/lib/server/storage";
import { workspaceSchema } from "@/lib/ops/domain";
import { planSchema } from "@/lib/ops/interactions";
import { completeModel, ModelError, resolveModelConfig } from "@/lib/server/model-client";
import { workspaceMessages } from "@/lib/server/workspace-model";

const schema = z.object({
  workspaceId: z.string(), expectedRevision: z.number().int().nonnegative(),
  provider: z.enum(["deepseek", "qwen"]), model: z.string().max(100), key: z.string().max(500).optional(),
  action: z.enum(["draft", "rewrite", "plan", "review", "ask"]),
  instruction: z.string().trim().min(1).max(12000), draft: z.string().max(150000).default(""),
  source: z.enum(["confirmed", "mcp"]).default("confirmed"),
  selection: z.object({ start: z.number().int().nonnegative(), end: z.number().int().nonnegative() }).optional(),
});
export async function POST(req: Request) {
  return api(async () => {
    checkOrigin(req);
    const uid = await userId();
    const raw = await req.text();
    if (new TextEncoder().encode(raw).length > 800000) throw new HttpError(413, "本次修改内容过长，请缩小范围。");
    let parsed;
    try { parsed = schema.safeParse(JSON.parse(raw)); } catch { throw new HttpError(400, "请求格式不正确。"); }
    if (!parsed.success) throw new HttpError(400, "请核对任务要求、正文长度和模型配置。");
    const p = parsed.data;
    const record = await ownedWorkspace(p.workspaceId, uid);
    if (record.revision !== p.expectedRevision) throw new HttpError(409, "资料版本已变化，请重新打开后再执行。本次未调用模型。");
    const w = workspaceSchema.parse(JSON.parse(record.state));
    if (p.source === "mcp") {
      w.sources = w.sources.filter(s => s.confirmed && s.mcp);
      if (!w.sources.some(s => s.tables.some(t => t.id === w.selection.tableId)))
        w.selection.tableId = w.sources.flatMap(s => s.tables)[0]?.id || "";
    }
    if (!w.sources.some(s => s.confirmed)) throw new HttpError(400, p.source === "mcp" ? "尚无已导入并确认的 MCP 资料。请先通过数据导入连接、读取和核对。" : "请先导入并确认一份资料。");
    if (p.selection && (p.selection.end <= p.selection.start || p.selection.end > p.draft.length))
      throw new HttpError(400, "文字选区已失效，请重新选择。");
    let context = p.draft ? `<untrusted_draft>\n${p.draft}\n</untrusted_draft>` : "";
    let instruction = p.instruction;
    if (p.action === "plan") instruction += '\n请为这项文字报告任务安排 1–5 个可执行步骤，至少含一个 write 步骤，可用 review 检查成果。不要规划联网、图片处理或系统文件操作。只返回 JSON：{"steps":[{"title":"简短标题","instruction":"明确要求","kind":"write或review"}]}。write 要产出完整候选正文，review 只产出检查意见。';
    if (p.action === "rewrite") {
      instruction += p.selection ? "\n只输出替换选中文字的内容，不重复未选区域，不附加修改说明。" : "\n输出修改后的完整正文，不附加修改说明。";
      if (p.selection) context += `\n<selected_text>\n${p.draft.slice(p.selection.start, p.selection.end)}\n</selected_text>`;
    }
    if (p.action === "draft") instruction += "\n输出完整候选正文，用 Markdown 排版；不要描述自己准备做什么。";
    if (p.action === "review") instruction += "\n仅输出验收意见：已满足、发现的问题、待人工确认。不要重写正文，不宣称已经自动修正。";
    try {
      const config = resolveModelConfig(env, p);
      const result = await completeModel(config, workspaceMessages(w, instruction, context), { signal: req.signal });
      if (p.action === "plan") {
        let plan;
        try { plan = planSchema.parse(JSON.parse(result.content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""))); }
        catch { throw new HttpError(502, "模型返回的计划格式无法执行。请调整目标后重新规划；尚未执行任何步骤。"); }
        return { content: result.content, steps: plan.steps, dataVersion: w.dataVersion, model: `${config.provider} / ${config.model}` };
      }
      return { content: result.content + (result.truncated ? "\n\n> 回复达到长度上限，请检查内容是否完整。" : ""), dataVersion: w.dataVersion, model: `${config.provider} / ${config.model}` };
    } catch (error) {
      if (error instanceof ModelError) throw new HttpError(error.status, error.message);
      throw error;
    }
  });
}
