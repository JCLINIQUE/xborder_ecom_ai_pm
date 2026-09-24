import { env } from "cloudflare:workers";
import { z } from "zod";
import { api, checkOrigin, HttpError, userId } from "@/lib/server/storage";
import { completeModel, ModelError, resolveModelConfig } from "@/lib/server/model-client";
const schema = z.object({ provider: z.enum(["deepseek", "qwen"]), model: z.string().max(100), key: z.string().max(500).optional() });
export async function POST(req: Request) {
  return api(async () => {
    checkOrigin(req); await userId();
    const input = schema.safeParse(await req.json());
    if (!input.success) throw new HttpError(400, "请核对模型连接信息。");
    try {
      const config = resolveModelConfig(env, input.data);
      await completeModel(config, [{ role: "user", content: "请只回复 OK。" }], { maxTokens: 32, timeoutMs: 30000 });
      return { ok: true, model: config.model };
    } catch (error) {
      if (error instanceof ModelError) throw new HttpError(error.status, error.message);
      throw error;
    }
  });
}
