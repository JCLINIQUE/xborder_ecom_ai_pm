import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function db() {
  if (!env.DB) throw new HttpError(503, "数据存储尚未就绪，请稍后重试。");
  return env.DB;
}
export function bucket() {
  if (!env.BUCKET) throw new HttpError(503, "文件存储尚未就绪，请稍后重试。");
  return env.BUCKET;
}
export async function userId() {
  const u = await getChatGPTUser();
  if (!u)
    throw new HttpError(401, "请先登录，以便安全保存和恢复你的本次资料。");
  return u.userId;
}
export function checkOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (
    origin &&
    new URL(origin).host !== new URL(req.url).host &&
    new URL(origin).host !== req.headers.get("host")
  )
    throw new HttpError(403, "请求来源不被允许。");
}
export async function api(fn: () => Promise<unknown>) {
  try {
    return Response.json(await fn(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (!(e instanceof HttpError))
      console.error("ops_api_error", e instanceof Error ? e.name : "unknown");
    return Response.json(
      {
        error:
          e instanceof HttpError
            ? e.message
            : "服务暂时不可用。你的未保存内容仍保留在当前页面，请重试。",
      },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export async function ownedWorkspace(id: string, uid: string) {
  const r = await db()
    .prepare(
      "SELECT id, state, revision FROM workspaces WHERE id = ? AND user_id = ?",
    )
    .bind(id, uid)
    .first<{ id: string; state: string; revision: number }>();
  if (!r) throw new HttpError(404, "本次资料不存在或无权访问。");
  return r;
}
