import {
  api,
  bucket,
  checkOrigin,
  db,
  HttpError,
  ownedWorkspace,
  userId,
} from "@/lib/server/storage";
export async function POST(req: Request) {
  return api(async () => {
    checkOrigin(req);
    const uid = await userId();
    if (Number(req.headers.get("content-length")) > 11 * 1024 * 1024)
      throw new HttpError(413, "文件过大。");
    const data = await req.formData();
    const file = data.get("file");
    const workspaceId = String(data.get("workspaceId") ?? "");
    if (!(file instanceof File) || file.size > 10 * 1024 * 1024)
      throw new HttpError(400, "请选择不超过 10 MB 的文件。");
    await ownedWorkspace(workspaceId, uid);
    const count = await db()
      .prepare("SELECT COUNT(*) AS n FROM files WHERE workspace_id=?")
      .bind(workspaceId)
      .first<{ n: number }>();
    if ((count?.n ?? 0) >= 50)
      throw new HttpError(400, "当前工作空间已达到文件上限，请新建空间。");
    const bytes = await file.arrayBuffer();
    const hash = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    )
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
    const existing = await db()
      .prepare(
        "SELECT id FROM files WHERE workspace_id=? AND user_id=? AND hash=?",
      )
      .bind(workspaceId, uid, hash)
      .first<{ id: string }>();
    if (existing) return { fileId: existing.id, hash };
    const id = crypto.randomUUID(),
      key = `${workspaceId}/${id}`;
    await bucket().put(key, bytes, {
      httpMetadata: { contentType: "application/octet-stream" },
    });
    try {
      await db()
        .prepare(
          "INSERT INTO files(id,user_id,workspace_id,name,object_key,mime,size,hash) VALUES(?,?,?,?,?,?,?,?)",
        )
        .bind(
          id,
          uid,
          workspaceId,
          file.name.slice(0, 200),
          key,
          file.type || "application/octet-stream",
          file.size,
          hash,
        )
        .run();
    } catch (e) {
      await bucket().delete(key);
      throw e;
    }
    return { fileId: id, hash };
  });
}
