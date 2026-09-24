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
        "SELECT object_key AS objectKey,name,mime FROM files WHERE id=? AND user_id=?",
      )
      .bind(id, uid)
      .first<{ objectKey: string; name: string; mime: string }>();
    if (!f) throw new HttpError(404, "文件不存在。");
    const obj = await bucket().get(f.objectKey);
    if (!obj) throw new HttpError(404, "原始文件不可用。");
    const inline = new URL(req.url).searchParams.get("preview") === "1";
    if (inline && !["image/png", "image/jpeg", "image/webp"].includes(f.mime)) throw new HttpError(415, "画布只预览 PNG、JPG 和 WebP 图片。");
    return new Response(obj.body, {
      headers: {
        "Content-Type": inline ? f.mime : "application/octet-stream",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(f.name)}`,
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
