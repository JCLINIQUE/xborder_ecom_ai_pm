import { sourceSchema, type Source } from "./domain";
import { matrixTable, parseTabularText, sha256 } from "./importers";
import type { McpReadResult } from "./mcp";

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Adapter only: this does not fetch, merge queries, or modify workspace state.
// Reuse Source, matrixTable, the review screen, and downstream report actions.
export async function prepareMcpImport(
  read: McpReadResult,
): Promise<{ source: Source; file: File; raw: string }> {
  const tables: Source["tables"] = [];
  const warnings = [
    "西柚洞察外部数据，不等同于店铺后台实际销售、订单或访客数据。流量得分不能映射成访客数。",
    "只包含本次查询返回的范围或页码；不会自动读取其他页，也不保证覆盖全部数据。请核对统计口径。",
  ];
  let skippedNested = false;
  function collect(value: unknown, path: string, depth = 0) {
    if (depth > 6) {
      skippedNested = true;
      return;
    }
    if (Array.isArray(value)) {
      if (value.length && value.every(record)) {
        if (tables.length >= 20)
          throw new Error("返回超过 20 张表，请缩小查询范围。没有截断导入。");
        if (value.length > 5000)
          throw new Error(
            "本次返回超过 5,000 行，请减少每页数量或缩小日期范围。",
          );
        const columns = [...new Set(value.flatMap((row) => Object.keys(row)))];
        const table = matrixTable(
          [
            columns,
            ...value.map((row) =>
              columns.map((key) => {
                const cell = row[key];
                return typeof cell === "object" && cell !== null
                  ? JSON.stringify(cell)
                  : (cell ?? null);
              }),
            ),
          ],
          path.slice(0, 150),
        );
        if (table) {
          // Provider data must not silently inherit shop-sales KPI semantics.
          table.mapping = {};
          tables.push(table);
        }
      }
      return;
    }
    if (record(value)) {
      for (const [key, nested] of Object.entries(value)) {
        if (Array.isArray(nested) || record(nested))
          collect(nested, `${path}.${key}`, depth + 1);
      }
    }
  }
  const textBlocks = (read.result.content ?? [])
    .filter((item) => item.type === "text" && typeof item.text === "string")
    .map((item) => item.text!);
  const structured = read.result.structuredContent;
  if (structured) collect(structured, read.title);
  else {
    for (const [i, text] of textBlocks.entries()) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        /* prose / CSV */
      }
      if (parsed !== undefined)
        collect(
          parsed,
          `${read.title}${textBlocks.length > 1 ? ` ${i + 1}` : ""}`,
        );
      else {
        const parsedTables = await parseTabularText(text, read.title);
        for (const table of parsedTables) {
          table.mapping = {};
          tables.push(table);
        }
      }
    }
  }
  if (skippedNested)
    warnings.push(
      "部分数据嵌套较深，未转换为表格。请查看完整原始响应，不要将已识别表格视为全部数据。",
    );
  if ((read.result.content ?? []).some((c) => c.type !== "text"))
    warnings.push(
      "响应含图片、资源链接或其他非文字内容；本版不自动下载这些附件。原始响应中保留其引用。",
    );
  const content = structured
    ? JSON.stringify(structured, null, 2)
    : textBlocks.join("\n\n");
  if (!content?.trim())
    throw new Error("数据源没有返回可导入的文字或表格。没有创建空资料。");
  const context = `来源：西柚洞察 MCP（外部数据，非店铺实际经营报表）\n查询：${read.title}\n读取时间：${read.fetchedAt}\n查询条件：${JSON.stringify(read.arguments)}\n\n`;
  let text = context + content;
  if (text.length > 150000) {
    if (!tables.length)
      throw new Error("文字结果超过 150,000 字符，请缩小查询范围后再导入。");
    text =
      context +
      "结果已转换为表格；完整响应超过文字材料上限，请下载原始响应查看。";
    warnings.push(
      "完整 JSON 只保存在原始响应文件中，不全部发送给 AI；已识别的表格仍完整保留。",
    );
  }
  const raw = JSON.stringify(read, null, 2);
  const file = new File([raw], `西柚洞察-${read.tool}.json`, {
    type: "application/json",
  });
  const source = sourceSchema.parse({
    id: crypto.randomUUID(),
    name: `西柚洞察 · ${read.title}`,
    kind: "connector",
    hash: await sha256(await file.arrayBuffer()),
    createdAt: read.fetchedAt,
    text,
    tables,
    confirmed: false,
    warnings,
    market:
      typeof read.arguments.country === "string"
        ? read.arguments.country
        : "未确定",
    currency: "未确定",
    mcp: {
      provider: read.provider,
      tool: read.tool,
      fetchedAt: read.fetchedAt,
      query: JSON.stringify(read.arguments),
    },
  });
  return { source, file, raw };
}
