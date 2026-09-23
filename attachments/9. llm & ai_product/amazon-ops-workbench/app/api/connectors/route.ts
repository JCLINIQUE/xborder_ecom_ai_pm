import { env } from "cloudflare:workers";
import { z } from "zod";
import { api, checkOrigin, HttpError, userId } from "@/lib/server/storage";
const schema = z.object({
  url: z.string().url(),
  token: z.string().max(500).optional(),
});
export async function POST(req: Request) {
  return api(async () => {
    checkOrigin(req);
    await userId();
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) throw new HttpError(400, "请提供有效的数据接口地址。");
    const { url: raw, token } = parsed.data;
    const url = new URL(raw);
    const allowed = (env.CONNECTOR_ALLOWED_HOSTS ?? "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443") ||
      !allowed.includes(url.hostname)
    )
      throw new HttpError(
        403,
        "此数据源未获服务端授权。请由部署管理员将可信 HTTPS 主机加入 CONNECTOR_ALLOWED_HOSTS，之后才能读取。不能直接访问本地或任意网络地址。",
      );
    const response = await fetch(url, {
      method: "GET",
      redirect: "error",
      headers: {
        Accept: "application/json,text/csv,text/plain",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok)
      throw new HttpError(
        502,
        `数据源返回 ${response.status}，请核对权限与接口。`,
      );
    const reader = response.body?.getReader();
    if (!reader) throw new HttpError(502, "数据源返回了空内容。");
    let length = 0;
    const chunks: Uint8Array[] = [];
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > 1000000)
          throw new HttpError(
            413,
            "单次连接读取上限 1 MB，请在数据源按日期分页或改为文件导入。",
          );
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    const all = new Uint8Array(length);
    let offset = 0;
    for (const c of chunks) {
      all.set(c, offset);
      offset += c.length;
    }
    return {
      text: new TextDecoder().decode(all),
      contentType: response.headers.get("content-type") ?? "text/plain",
      host: url.hostname,
    };
  });
}
