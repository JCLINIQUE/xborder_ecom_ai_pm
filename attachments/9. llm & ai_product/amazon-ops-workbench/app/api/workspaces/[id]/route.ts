import {
  api,
  checkOrigin,
  db,
  HttpError,
  ownedWorkspace,
  userId,
} from "@/lib/server/storage";
import { workspaceSchema } from "@/lib/ops/domain";
type Context = { params: Promise<{ id: string }> };
export async function GET(req: Request, ctx: Context) {
  return api(async () => {
    const { id } = await ctx.params;
    const row = await ownedWorkspace(id, await userId());
    return {
      workspace: workspaceSchema.parse(JSON.parse(row.state)),
      revision: row.revision,
    };
  });
}
export async function PUT(req: Request, ctx: Context) {
  return api(async () => {
    checkOrigin(req);
    const { id } = await ctx.params;
    const uid = await userId();
    const raw = await req.text();
    if (new TextEncoder().encode(raw).length > 1500000)
      throw new HttpError(
        413,
        "本次资料超过 1.5 MB 的结构化数据上限，请拆分本次资料。原文件可单独下载。",
      );
    const body = JSON.parse(raw);
    const result = workspaceSchema.safeParse(body.workspace);
    if (
      !result.success ||
      result.data.id !== id ||
      !Number.isInteger(body.revision)
    )
      throw new HttpError(400, "保存的数据格式不正确。");
    const w = result.data;
    await ownedWorkspace(id, uid);
    const fileRows = await db()
      .prepare("SELECT id FROM files WHERE workspace_id=? AND user_id=?")
      .bind(id, uid)
      .all<{ id: string }>();
    const allowed = new Set(fileRows.results.map((f) => f.id));
    if (w.sources.some((s) => s.fileId && !allowed.has(s.fileId)) || w.interaction.canvas.assets.some(a => !allowed.has(a.fileId)) || w.interaction.canvas.requests.some(r => !allowed.has(r.fileId)))
      throw new HttpError(400, "引用的原始文件不属于本次资料。");
    const update = await db()
      .prepare(
        "UPDATE workspaces SET state=?,name=?,revision=revision+1,updated_at=? WHERE id=? AND user_id=? AND revision=?",
      )
      .bind(
        JSON.stringify(w),
        w.name,
        new Date().toISOString(),
        id,
        uid,
        body.revision,
      )
      .run();
    if (!update.meta.changes)
      throw new HttpError(
        409,
        "另一个页面已更新本次资料。请下载当前备份，再重新打开，以免覆盖其他修改。",
      );
    return { revision: body.revision + 1 };
  });
}
