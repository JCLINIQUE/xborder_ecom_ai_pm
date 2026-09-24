export type ModelProvider = "deepseek" | "qwen";
export type ModelConfigStatus = {
  revision: string;
  defaultProvider: ModelProvider;
  providers: Record<ModelProvider, { configured: boolean; model: string }>;
};

export function modelConnectionIssue(model: string, key: string, serverKey = false): string {
  const modelId = model.trim();
  const apiKey = key.trim();
  const hasKey = !!apiKey || serverKey;
  if (modelId === "deepseek_flash")
    return "模型名应为 deepseek-flash，使用短横线，不是下划线。";
  if (/https?:\/\//i.test(modelId))
    return "模型名称需要填写模型 ID，不能填写 API 网址。接口地址已自动配置。";
  if (/https?:\/\//i.test(apiKey))
    return "API Key 需要填写服务商提供的密钥，不能填写 API 网址。";
  if (/^mcp_/i.test(apiKey))
    return "这是 MCP 数据源凭据，请在「数据导入 → MCP 数据源」使用；AI 分析需要模型服务商的 API Key。";
  if (!modelId && !hasKey) return "请填写模型名称和 API Key。";
  if (!modelId) return "请填写模型名称（服务商提供的模型 ID）。";
  if (!hasKey) return "请填写 API Key，或在本地 .dev.vars 中配置密钥。";
  if (/\s/.test(modelId) || /\s/.test(apiKey))
    return "模型名称和 API Key 内不能包含空格或换行，请重新核对。";
  if (apiKey && !/^[\x21-\x7e]+$/.test(apiKey))
    return "API Key 包含无效字符，请从服务商控制台重新复制密钥。";
  return "";
}
