import { bucket, db, HttpError, userId } from "@/lib/server/storage";
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const uid = await userId(),
      { id } = await ctx.params;
    const f = await db()
      .prepare(
        "SELECT object_key AS objectKey,name FROM files WHERE id=? AND user_id=?",
      )
      .bind(id, uid)
      .first<{ objectKey: string; name: string }>();
    if (!f) throw new HttpError(404, "文件不存在。");
    const obj = await bucket().get(f.objectKey);
    if (!obj) throw new HttpError(404, "原始文件不可用。");
    return new Response(obj.body, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(f.name)}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private,no-store",
      },
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof HttpError ? e.message : "文件下载暂时不可用。" },
      { status: e instanceof HttpError ? e.status : 500 },
    );
  }
}
