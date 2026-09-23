// Only these reviewed data queries are available to this MVP. MCP annotations
// alone are not an authorization boundary. Do not expose arbitrary tools/calls.
// Provider reference: https://platform.xydc.com/ (tool catalogue).
export const MCP_ENDPOINT = "https://mcp.xydc.com/mcp";
export const MCP_PROVIDER = "xyzc-mcp";
export const MCP_READ_TOOLS: Record<string, string> = {
  get_asin_info: "商品基础信息",
  get_asin_traffic: "ASIN 近 7 天流量",
  get_asin_keywords: "ASIN 近 7 天反查关键词",
  get_asin_traffic_trends: "ASIN 日流量趋势",
  get_asin_order_trends: "ASIN 月订单量趋势",
  get_keyword_info: "关键词市场指标",
  get_keyword_aba_trends: "关键词 ABA 周趋势",
  get_asin_keyword_rank_trends: "ASIN 关键词日排名趋势",
};

export type McpInputSchema = {
  type?: string | string[];
  title?: string;
  description?: string;
  enum?: unknown[];
  default?: unknown;
  properties?: Record<string, McpInputSchema>;
  required?: string[];
  items?: McpInputSchema;
  [key: string]: unknown;
};
export type McpQuery = {
  name: string;
  title: string;
  description: string;
  inputSchema: McpInputSchema;
};
export type McpDiscovery = { tools: McpQuery[]; excludedCount: number };
export type McpReadResult = {
  provider: string;
  tool: string;
  title: string;
  fetchedAt: string;
  arguments: Record<string, unknown>;
  result: {
    structuredContent?: Record<string, unknown>;
    content?: Array<{
      type: string;
      text?: string;
      [key: string]: unknown;
    }>;
  };
};

export function mcpDefaults(schema: McpInputSchema): Record<string, string> {
  return Object.fromEntries(
    Object.entries(schema.properties ?? {}).map(([key, field]) => [
      key,
      field.default === undefined
        ? ""
        : typeof field.default === "string"
          ? field.default
          : JSON.stringify(field.default),
    ]),
  );
}

export function mcpArguments(
  schema: McpInputSchema,
  fields: Record<string, string>,
) {
  const entries: [string, unknown][] = [];
  for (const [key, field] of Object.entries(schema.properties ?? {})) {
    const raw = (fields[key] ?? "").trim();
    if (!raw) {
      if (schema.required?.includes(key))
        throw new Error(`请填写 ${field.title || key}。`);
      continue;
    }
    const type = Array.isArray(field.type)
      ? field.type.find((t) => t !== "null")
      : field.type;
    let value: unknown = raw;
    if (type === "integer" || type === "number") {
      value = Number(raw);
      if (
        !Number.isFinite(value) ||
        (type === "integer" && !Number.isInteger(value))
      )
        throw new Error(
          `${field.title || key} 需要${type === "integer" ? "整数" : "数字"}。`,
        );
    } else if (type === "boolean") {
      if (!["true", "false"].includes(raw))
        throw new Error(`请选择 ${field.title || key}。`);
      value = raw === "true";
    } else if (
      type === "array" &&
      field.items?.type === "string" &&
      !raw.startsWith("[")
    ) {
      value = raw
        .split(/\r?\n/)
        .map((v) => v.trim())
        .filter(Boolean);
    } else if (type === "array" || type === "object" || !type) {
      try {
        value = JSON.parse(raw);
      } catch {
        throw new Error(`${field.title || key} 需要有效的 JSON 格式。`);
      }
    }
    entries.push([key, value]);
  }
  return Object.fromEntries(entries);
}
