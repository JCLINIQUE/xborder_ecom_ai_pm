import { modelConnectionIssue, type ModelProvider, type ModelConfigStatus } from "../ops/model-connection";

export class ModelError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
type ModelEnv = Partial<Record<"AI_PROVIDER" | "MODEL_CONFIG_REVISION" | "DEEPSEEK_API_KEY" | "DEEPSEEK_MODEL" | "QWEN_API_KEY" | "QWEN_MODEL", string>>;
export function modelConfigStatus(env: ModelEnv): ModelConfigStatus {
  return {
    revision: env.MODEL_CONFIG_REVISION || "",
    defaultProvider: env.AI_PROVIDER === "qwen" ? "qwen" : "deepseek",
    providers: {
      deepseek: { configured: !!env.DEEPSEEK_API_KEY?.trim(), model: env.DEEPSEEK_MODEL?.trim() || "deepseek-flash" },
      qwen: { configured: !!env.QWEN_API_KEY?.trim(), model: env.QWEN_MODEL?.trim() || "qwen-plus" },
    },
  };
}
export function resolveModelConfig(env: ModelEnv, input: { provider: ModelProvider; model?: string; key?: string }) {
  const status = modelConfigStatus(env);
  const model = input.model?.trim() || status.providers[input.provider].model;
  const key = input.key?.trim() || (input.provider === "deepseek" ? env.DEEPSEEK_API_KEY : env.QWEN_API_KEY)?.trim() || "";
  const issue = modelConnectionIssue(model, key);
  if (issue) throw new ModelError(400, issue);
  return { provider: input.provider, model, key };
}
const endpoints = {
  deepseek: "https://api.deepseek.com/chat/completions",
  qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
};
export async function completeModel(
  config: ReturnType<typeof resolveModelConfig>,
  messages: { role: "system" | "user"; content: string }[],
  options: { fetcher?: typeof fetch; timeoutMs?: number; maxTokens?: number; signal?: AbortSignal } = {},
) {
  const deadline = AbortSignal.timeout(options.timeoutMs ?? 120000);
  const signal = options.signal ? AbortSignal.any([deadline, options.signal]) : deadline;
  try {
    signal.throwIfAborted();
    const response = await (options.fetcher ?? fetch)(endpoints[config.provider], {
      method: "POST",
      // Workers supports manual/follow only. Never forward credentials on a redirect.
      redirect: "manual",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.key}` },
      body: JSON.stringify({
        model: config.model, messages, stream: false,
        max_tokens: options.maxTokens ?? 5000,
        ...(config.provider === "deepseek" ? { thinking: { type: "disabled" } } : { enable_thinking: false }),
      }),
      signal,
    });
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      throw new ModelError(502, "模型服务返回了重定向，已停止请求以保护密钥。请检查服务商设置。");
    }
    if (!response.ok) {
      await response.body?.cancel();
      const messages: Record<number, string> = {
        400: "模型服务拒绝了请求参数。请核对模型 ID 是否属于所选服务商。",
        401: "模型服务未通过密钥验证。请确认 API Key 正确、未失效，且属于所选服务商。",
        402: "模型账户余额不足，请在服务商控制台充值后再试。",
        403: "当前密钥没有该模型的访问权限，请核对模型、账号权限和地域。",
        404: "模型或接口不存在，请核对模型 ID（例如 deepseek-flash，使用短横线）。",
        429: "模型服务限流或额度不足，请稍后重试并核对账户额度。",
      };
      throw new ModelError(response.status === 429 ? 429 : 502,
        messages[response.status] || `模型服务暂时不可用（HTTP ${response.status}），请稍后重试。`);
    }
    let body: { choices?: { message?: { content?: string }; finish_reason?: string }[] };
    try { body = await response.json(); }
    catch (error) {
      if (signal.aborted) throw error;
      throw new ModelError(502, "模型服务返回了无法读取的内容，请稍后重试。");
    }
    const choice = body?.choices?.[0];
    signal.throwIfAborted();
    const content = choice?.message?.content;
    if (typeof content !== "string" || !content.trim())
      throw new ModelError(502, choice?.finish_reason === "length"
        ? "模型在输出正文前已达到长度上限，请缩小分析范围后重试。"
        : "模型未返回分析正文，请核对模型配置后重试。");
    if (content.length > 50000) throw new ModelError(502, "模型回复过长，请缩小分析范围。");
    return { content, truncated: choice?.finish_reason === "length" };
  } catch (error) {
    if (options.signal?.aborted) throw new ModelError(499, "请求已取消；服务商可能已经消耗本次额度。");
    if (error instanceof ModelError) throw error;
    if (signal.aborted || (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)))
      throw new ModelError(504, "等待模型回复超时，请稍后重试或缩小分析范围。本次不会自动重试。");
    // Never expose fetch errors, headers, keys or user content in logs/responses.
    throw new ModelError(502, "无法连接模型服务，请检查本机网络或代理后重试。");
  }
}
