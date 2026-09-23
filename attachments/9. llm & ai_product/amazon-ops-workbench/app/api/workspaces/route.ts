import { api, checkOrigin, db, HttpError, userId } from "@/lib/server/storage";
import { workspaceSchema } from "@/lib/ops/domain";
export async function GET() {
  return api(async () => {
    const uid = await userId();
    const r = await db()
      .prepare(
        "SELECT id,name,updated_at AS updatedAt,revision FROM workspaces WHERE user_id=? ORDER BY updated_at DESC LIMIT 50",
      )
      .bind(uid)
      .all();
    return { workspaces: r.results };
  });
}
export async function POST(req: Request) {
  return api(async () => {
    checkOrigin(req);
    const uid = await userId();
    const raw = await req.text();
    if (raw.length > 1500000)
      throw new HttpError(413, "资料过大，请拆分为多份日报。");
    const parsed = workspaceSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) throw new HttpError(400, "本次资料格式不正确。");
    const w = parsed.data;
    if (w.sources.length || w.analyses.length)
      throw new HttpError(400, "请先新建一份日报，再导入资料。");
    await db()
      .prepare(
        "INSERT INTO workspaces (id,user_id,name,state,revision,updated_at) VALUES (?,?,?,?,0,?)",
      )
      .bind(w.id, uid, w.name, JSON.stringify(w), w.updatedAt)
      .run();
    return { workspace: w, revision: 0 };
  });
}
