import { guessMapping, type DataTable, type Source } from "./domain";
type Progress = (message: string, percent: number) => void;
function decodeText(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  if (view[0] === 255 && view[1] === 254)
    return new TextDecoder("utf-16le", { fatal: true }).decode(bytes);
  if (view[0] === 254 && view[1] === 255)
    return new TextDecoder("utf-16be", { fatal: true }).decode(bytes);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("gb18030", { fatal: true }).decode(bytes);
  }
}
export async function sha256(bytes: ArrayBuffer) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export function matrixTable(
  matrix: unknown[][],
  name: string,
): DataTable | null {
  if (matrix.length < 2) return null;
  const width = Math.max(...matrix.map((row) => row.length));
  const header = Array.from(
    { length: width },
    (_, i) => String(matrix[0][i] ?? "").trim() || `列${i + 1}`,
  );
  if (width > 60 || matrix.length > 5001)
    throw new Error(
      "单表最多 5,000 行、60 列。请分拆文件后导入，系统不会截断数据。",
    );
  if (
    header.some((c) => c.length > 140) ||
    matrix.some((row) => row.some((v) => String(v ?? "").length > 4000))
  )
    throw new Error(
      "表头最多 140 字符，单元格最多 4,000 字符。请整理超长内容后导入，系统不会静默截断。",
    );
  const seen = new Set<string>();
  const columns = header.map((x) => {
    let name = x,
      suffix = 2;
    while (seen.has(name)) name = `${x} (${suffix++})`;
    seen.add(name);
    return name;
  });
  const rows = matrix
    .slice(1)
    .filter((r) => r.some((v) => v !== "" && v !== null && v !== undefined))
    .map((r) =>
      Object.fromEntries(
        columns.map((c, i) => [
          c,
          r[i] instanceof Date
            ? (r[i] as Date).toISOString().slice(0, 10)
            : typeof r[i] === "number"
              ? r[i]
              : String(r[i] ?? ""),
        ]),
      ),
    );
  return rows.length
    ? {
        id: crypto.randomUUID(),
        name,
        columns,
        rows,
        mapping: guessMapping(columns),
      }
    : null;
}
export async function parseTabularText(
  text: string,
  name = "粘贴的表格",
): Promise<DataTable[]> {
  const first = text.split(/\r?\n/).find((l) => l.trim()) ?? "";
  if (!/[\t,;]/.test(first)) return [];
  const XLSX = await import("xlsx");
  const wb = XLSX.read(text, { type: "string", raw: true });
  const table = matrixTable(
    XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], {
      header: 1,
      defval: "",
      raw: false,
    }),
    name,
  );
  return table && table.columns.length > 1 ? [table] : [];
}
async function recognize(
  image: File | HTMLCanvasElement,
  progress: Progress,
  signal?: AbortSignal,
) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng+chi_sim", 1, {
    logger: (m) =>
      progress(`识别文字 · ${m.status}`, Math.round((m.progress ?? 0) * 100)),
  });
  const abort = () => {
    void worker.terminate();
  };
  signal?.addEventListener("abort", abort, { once: true });
  try {
    signal?.throwIfAborted();
    const result = await worker.recognize(image);
    return result.data.text;
  } finally {
    signal?.removeEventListener("abort", abort);
    await worker.terminate();
  }
}
export async function parseFile(
  file: File,
  progress: Progress,
  signal?: AbortSignal,
): Promise<Source> {
  if (file.size > 10 * 1024 * 1024)
    throw new Error("单文件上限为 10 MB，请压缩或拆分后再导入。");
  const bytes = await file.arrayBuffer();
  signal?.throwIfAborted();
  const s: Source = {
    id: crypto.randomUUID(),
    name: file.name,
    kind: "text",
    hash: await sha256(bytes),
    createdAt: new Date().toISOString(),
    text: "",
    tables: [],
    confirmed: false,
    warnings: [],
    market: "未确定",
    currency: "未确定",
  };
  const ext = file.name.split(".").pop()?.toLowerCase();
  progress("读取文件", 10);
  if (["xlsx", "xls", "csv", "tsv"].includes(ext ?? "")) {
    s.kind = "spreadsheet";
    const XLSX = await import("xlsx");
    const wb = ["csv", "tsv"].includes(ext ?? "")
      ? XLSX.read(decodeText(bytes), { type: "string", raw: true })
      : XLSX.read(bytes, { type: "array", cellDates: true });
    if (wb.SheetNames.length > 20)
      throw new Error("一个文件最多 20 个工作表，请先分拆。");
    for (const name of wb.SheetNames) {
      const sheet = wb.Sheets[name];
      if (sheet["!ref"]) {
        const range = XLSX.utils.decode_range(sheet["!ref"]);
        if (range.e.r > 5000 || range.e.c > 59)
          throw new Error(
            "工作表超过 5,000 行或 60 列，请先分拆，不会静默截断。",
          );
      }
      const table = matrixTable(
        XLSX.utils.sheet_to_json<unknown[]>(sheet, {
          header: 1,
          defval: "",
          raw: true,
          dateNF: "yyyy-mm-dd",
        }),
        name,
      );
      if (table) s.tables.push(table);
    }
    s.warnings.push("请确认首行为表头，并检查站点、币种、日期格式和字段映射。");
  } else if (ext === "docx") {
    s.kind = "document";
    const mammoth = await import("mammoth/mammoth.browser");
    const result = await mammoth.extractRawText({ arrayBuffer: bytes });
    s.text = result.value;
    s.warnings.push(
      "Word 以文字资料导入；表格布局可能丢失。如需图表，请补充标准表格或经人工确认的 CSV。",
      ...result.messages.map((m) => m.message),
    );
  } else if (ext === "pdf") {
    s.kind = "pdf";
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).href;
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(bytes) });
    const doc = await loadingTask.promise;
    try {
      if (doc.numPages > 40)
        throw new Error("PDF 上限 40 页，请拆分文件。扫描件识别速度较慢。");
      for (let n = 1; n <= doc.numPages; n++) {
        signal?.throwIfAborted();
        progress(
          `读取 PDF 第 ${n}/${doc.numPages} 页`,
          Math.round((n / doc.numPages) * 100),
        );
        const page = await doc.getPage(n);
        const content = await page.getTextContent();
        let t = content.items
          .map((item) =>
            "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "",
          )
          .join("");
        if (t.trim().length < 5) {
          const viewport = page.getViewport({ scale: 1.6 });
          if (viewport.width * viewport.height > 12000000)
            throw new Error("PDF 页面尺寸过大，请先压缩。");
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("浏览器不支持页面识别");
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          t = await recognize(canvas, progress, signal);
          canvas.width = canvas.height = 0;
          s.warnings.push(`第 ${n} 页使用 OCR，请重点核对数字。`);
        }
        s.text += `[第 ${n} 页]\n${t}\n\n`;
        page.cleanup();
        if (s.text.length > 150000)
          throw new Error("提取文字超过 15 万字符，请拆分文件。");
      }
    } finally {
      await loadingTask.destroy();
    }
    s.warnings.push("PDF 作为文字证据保存，不自动将版面识别成可靠的经营表格。");
  } else if (["png", "jpg", "jpeg", "webp", "bmp"].includes(ext ?? "")) {
    s.kind = "image";
    s.text = await recognize(file, progress, signal);
    s.warnings.push("OCR 可能误识别小数点、币种和表格结构，务必人工核对。");
  } else if (["txt", "md"].includes(ext ?? "")) {
    s.text = decodeText(bytes);
    s.tables = await parseTabularText(s.text);
  } else
    throw new Error(
      "支持 XLSX/XLS/CSV/TSV、PNG/JPG/WEBP/BMP、TXT/MD、DOCX 和 PDF。旧版 .doc 请先另存为 .docx。",
    );
  signal?.throwIfAborted();
  if (s.text.length > 150000) throw new Error("文字超过 15 万字符，请分拆。");
  if (!s.text.trim() && !s.tables.length)
    throw new Error("没有提取到内容。请检查文件，或粘贴文字重新导入。");
  progress("解析完成，等待确认", 100);
  return s;
}
