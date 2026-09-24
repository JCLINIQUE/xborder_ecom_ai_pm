import { z } from "zod";
import { env } from "cloudflare:workers";
import {
  api,
  checkOrigin,
  HttpError,
  ownedWorkspace,
  userId,
} from "@/lib/server/storage";
import { evidence, scopeLabel, workspaceSchema } from "@/lib/ops/domain";
import { completeModel, ModelError, resolveModelConfig } from "@/lib/server/model-client";
import { workspaceMessages } from "@/lib/server/workspace-model";
const requestSchema = z.object({
  workspaceId: z.string(),
  key: z.string().trim().max(500).optional(),
  kind: z.enum(["analysis", "report"]),
  focus: z.string().max(2000).default(""),
  provider: z.enum(["deepseek", "qwen"]),
  model: z.string().trim().max(100),
  expectedRevision: z.number().int().nonnegative(),
});
export async function POST(req: Request) {
  return api(async () => {
    checkOrigin(req);
    const parsed = requestSchema.safeParse(await req.json());
    if (!parsed.success)
      throw new HttpError(400, "请填写 API Key 并选择分析任务。");
    const p = parsed.data;
    const record = await ownedWorkspace(p.workspaceId, await userId());
    const w = workspaceSchema.parse(JSON.parse(record.state));
    if (record.revision !== p.expectedRevision)
      throw new HttpError(
        409,
        "资料已变化，请重新加载并确认后再分析。尚未向模型服务发送内容。",
      );
    if (!w.sources.some((s) => s.confirmed))
      throw new HttpError(400, "先确认至少一份资料，再运行 AI。");
    const prompt = p.kind === "analysis" ? w.prompt : w.reportPrompt;
    const facts = evidence(w);
    let completion: Awaited<ReturnType<typeof completeModel>>;
    let config: ReturnType<typeof resolveModelConfig>;
    try {
      config = resolveModelConfig(env, p);
      completion = await completeModel(config, workspaceMessages(w, prompt,
        `当前重点：${p.focus}${p.kind === "report" ? `\n日报日期：${w.reportDate}\n既有分析仅作参考：${JSON.stringify(w.analyses.filter(a => a.dataVersion === w.dataVersion).slice(-4))}` : ""}`), { signal: req.signal });
    } catch (error) {
      if (error instanceof ModelError) throw new HttpError(error.status, error.message);
      throw error;
    }
    return {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      scope: scopeLabel(w) + (p.focus ? ` · ${p.focus}` : ""),
      sourceIds: facts.sources.map((s) => s.id),
      dataVersion: w.dataVersion,
      prompt,
      content:
        completion.content +
        (completion.truncated
          ? "\n\n⚠ 本次回复达到长度上限，内容可能未完成。"
          : ""),
      model: `${config.provider} / ${config.model}`,
      edited: false,
    };
  });
}
