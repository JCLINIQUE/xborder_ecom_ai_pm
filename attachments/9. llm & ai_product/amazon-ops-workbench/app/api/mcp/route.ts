import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CfWorkerJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/cfworker";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { api, checkOrigin, HttpError, userId } from "@/lib/server/storage";
import { MCP_ENDPOINT, MCP_PROVIDER, MCP_READ_TOOLS } from "@/lib/ops/mcp";
import { bearerTokenSchema, redactMcpCredentials } from "@/lib/server/mcp-auth";

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("list"),
    connectionUrl: z.string().url().max(8192),
    bearerToken: bearerTokenSchema,
  }),
  z.object({
    action: z.literal("read"),
    connectionUrl: z.string().url().max(8192),
    bearerToken: bearerTokenSchema,
    tool: z.string().max(150),
    arguments: z.record(z.unknown()),
    consent: z.literal(true),
  }),
]);

async function requestBody(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "请使用工作台里的 MCP 连接入口。");
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, "缺少连接信息。");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 48000) throw new HttpError(413, "查询参数过长，请缩小范围。");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return requestSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    throw new HttpError(400, "连接信息或查询参数不完整，请重新填写。");
  }
}

function reviewed(tool: Tool) {
  return (
    Object.hasOwn(MCP_READ_TOOLS, tool.name) &&
    tool.annotations?.readOnlyHint !== false
  );
}

export async function POST(req: Request) {
  return api(async () => {
    checkOrigin(req);
    await userId();
    const body = await requestBody(req);
    const endpoint = new URL(body.connectionUrl);
    // Keep credentials restricted to the exact reviewed provider endpoint.
    if (
      `${endpoint.origin}${endpoint.pathname}` !== MCP_ENDPOINT ||
      endpoint.username ||
      endpoint.password ||
      endpoint.hash
    )
      throw new HttpError(
        403,
        "本版仅连接西柚洞察的 https://mcp.xydc.com/mcp 授权链接。",
      );
    if (body.action === "read" && !Object.hasOwn(MCP_READ_TOOLS, body.tool))
      throw new HttpError(403, "此工具不在本版的只读查询清单中。");

    const deadline = AbortSignal.timeout(45000);
    let upstreamStatus = 0;
    let transferred = 0;
    let tooLarge = false;
    let cleanup = false;
    const transport = new StreamableHTTPClientTransport(endpoint, {
      requestInit: body.bearerToken
        ? { headers: { Authorization: `Bearer ${body.bearerToken}` } }
        : undefined,
      reconnectionOptions: {
        maxRetries: 0,
        initialReconnectionDelay: 1000,
        maxReconnectionDelay: 1000,
        reconnectionDelayGrowFactor: 1,
      },
      fetch: async (url, init) => {
        if (String(url) !== endpoint.href)
          throw new Error("Blocked MCP destination");
        const signal = cleanup
          ? AbortSignal.timeout(2000)
          : AbortSignal.any([
              req.signal,
              deadline,
              ...(init?.signal ? [init.signal] : []),
            ]);
        const response = await fetch(url, {
          ...init,
          // Workers supports manual/follow, not the browser's "error" mode.
          // Never follow redirects with a credential-bearing MCP URL.
          redirect: "manual",
          signal,
        });
        if (response.status >= 300 && response.status < 400) {
          await response.body?.cancel();
          throw new HttpError(
            502,
            "数据源要求重定向，已停止连接以保护授权信息。请从平台复制正式 MCP 链接。",
          );
        }
        if ([401, 403, 429].includes(response.status))
          upstreamStatus = response.status;
        if (!response.body) return response;
        // Bounds both JSON and SSE, including a long-lived notification stream.
        const stream = response.body.pipeThrough(
          new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, controller) {
              transferred += chunk.byteLength;
              if (transferred > 2 * 1024 * 1024) {
                tooLarge = true;
                controller.error(new Error("MCP response too large"));
              } else controller.enqueue(chunk);
            },
          }),
        );
        return new Response(stream, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      },
    });
    const validator = new CfWorkerJsonSchemaValidator();
    const client = new Client(
      { name: "amazon-ops-workbench", version: "0.1.0" },
      { capabilities: {}, jsonSchemaValidator: validator },
    );
    // Never log upstream messages: a provider error may contain its secret URL.
    client.onerror = () => {};
    const options = {
      timeout: 20000,
      signal: AbortSignal.any([req.signal, deadline]),
    };
    try {
      const redact = (value: unknown) =>
        redactMcpCredentials(value, endpoint, body.bearerToken);
      await client.connect(transport, options);
      const all: Tool[] = [];
      let cursor: string | undefined;
      for (let page = 0; page < 5; page++) {
        const result = await client.listTools(
          cursor ? { cursor } : undefined,
          options,
        );
        all.push(...result.tools);
        cursor = result.nextCursor;
        if (!cursor) break;
      }
      if (cursor || all.length > 300)
        throw new HttpError(502, "数据源工具清单过大，暂时无法完整读取。");
      const allowed = all.filter(reviewed);
      if (body.action === "list") {
        return redact({
          tools: allowed.map((tool) => ({
            name: tool.name,
            title: MCP_READ_TOOLS[tool.name],
            description: tool.description ?? "",
            inputSchema: tool.inputSchema,
          })),
          excludedCount: all.length - allowed.length,
        });
      }
      const tool = allowed.find((t) => t.name === body.tool);
      if (!tool)
        throw new HttpError(
          403,
          "当前账号没有这个可用的只读查询，请重新连接。",
        );
      const validation = validator.getValidator(tool.inputSchema)(
        body.arguments,
      );
      if (!validation.valid)
        throw new HttpError(
          400,
          `查询条件不符合数据源要求：${redact(validation.errorMessage?.slice(0, 700) || "请核对必填项与格式")}`,
        );
      const result = await client.callTool(
        { name: tool.name, arguments: body.arguments },
        undefined,
        options,
      );
      if (result.isError)
        throw new HttpError(
          502,
          "数据源未完成查询。请检查站点、ASIN、日期范围及账户额度；没有导入任何数据。平台可能已消耗查询额度，请先核对再重试。",
        );
      const serialized = JSON.stringify(result);
      if (new TextEncoder().encode(serialized).byteLength > 1024 * 1024)
        throw new HttpError(
          413,
          "查询结果超过 1 MB，请缩小范围。不会截断导入，也不会自动继续翻页。",
        );
      // Do not allow an echoed credential link/token to enter saved evidence.
      return redact({
        provider: MCP_PROVIDER,
        tool: tool.name,
        title: MCP_READ_TOOLS[tool.name],
        fetchedAt: new Date().toISOString(),
        arguments: body.arguments,
        result,
      });
    } catch (error) {
      if (error instanceof HttpError) throw error;
      // Only a local diagnostic category; never log error.message/stack because
      // transports can include the credential-bearing URL there.
      console.error("mcp_connection_failure", {
        category: error instanceof Error ? error.name : "unknown",
        code:
          typeof (error as { code?: unknown })?.code === "number"
            ? (error as { code: number }).code
            : undefined,
        upstreamStatus,
      });
      if (upstreamStatus === 401 || upstreamStatus === 403)
        throw new HttpError(
          401,
          "尚未获得数据权限。请核对西柚洞察的完整 MCP 授权链接或 Bearer Token；只有 /mcp 地址无法读取。授权过期时请重新复制。",
        );
      if (upstreamStatus === 429)
        throw new HttpError(
          429,
          "数据源限流或额度不足，请查看西柚洞察控制台。系统不会自动重试。",
        );
      if (tooLarge)
        throw new HttpError(413, "数据源响应过大，请缩小查询范围后重试。");
      if (deadline.aborted || req.signal.aborted)
        throw new HttpError(
          504,
          "本次读取已中断或超时，没有导入数据。查询可能已消耗平台额度，请先核对再重试。",
        );
      throw new HttpError(
        502,
        "暂时无法完成 MCP 读取。请检查授权链接、网络和数据源状态；没有导入数据，也不会自动重试。",
      );
    } finally {
      cleanup = true;
      if (transport.sessionId)
        await transport.terminateSession().catch(() => {});
      await client.close().catch(() => {});
    }
  });
}
