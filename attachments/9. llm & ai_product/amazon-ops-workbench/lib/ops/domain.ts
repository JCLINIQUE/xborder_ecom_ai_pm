import { z } from "zod";

export const fields = {
  date: "日期",
  asin: "ASIN / SKU",
  keyword: "关键词",
  rank: "自然排名",
  sales: "销售额",
  orders: "订单数",
  units: "销量",
  sessions: "访客数",
  spend: "广告花费",
  adSales: "广告归因销售额",
  clicks: "点击量",
  impressions: "曝光量",
} as const;
export type Field = keyof typeof fields;
export const metricFields = [
  "sales",
  "orders",
  "units",
  "sessions",
  "spend",
  "adSales",
  "clicks",
  "impressions",
] as const;
export type Metric = (typeof metricFields)[number];
export const rowSchema = z.record(
  z.string().max(150),
  z.union([z.string().max(4000), z.number().finite(), z.null()]),
);
export const tableSchema = z.object({
  id: z.string(),
  name: z.string().max(150),
  columns: z.array(z.string().max(150)).max(60),
  rows: z.array(rowSchema).max(5000),
  mapping: z
    .record(z.enum(Object.keys(fields) as [Field, ...Field[]]), z.string())
    .default({}),
});
export const sourceSchema = z.object({
  id: z.string(),
  name: z.string().max(200),
  kind: z.enum([
    "spreadsheet",
    "text",
    "document",
    "image",
    "pdf",
    "connector",
  ]),
  fileId: z.string().optional(),
  hash: z.string(),
  createdAt: z.string(),
  text: z.string().max(150000),
  tables: z.array(tableSchema).max(20),
  confirmed: z.boolean(),
  warnings: z.array(z.string()),
  market: z.string().max(30),
  currency: z.string().max(10),
  mcp: z
    .object({
      provider: z.string().max(100),
      tool: z.string().max(150),
      fetchedAt: z.string(),
      query: z.string().max(48000),
    })
    .optional(),
});
export const chartSchema = z.object({
  id: z.string(),
  title: z.string().max(100),
  tableId: z.string(),
  x: z.string(),
  y: z.string(),
  overlay: z.string(),
  type: z.enum(["line", "bar"]),
  aggregation: z.enum(["sum", "average", "last"]),
  target: z.number().nullable(),
  note: z.string().max(1000),
});
export const analysisSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  scope: z.string(),
  sourceIds: z.array(z.string()),
  dataVersion: z.number(),
  prompt: z.string().max(12000),
  content: z.string().max(50000),
  model: z.string(),
  edited: z.boolean().default(false),
});
export const workspaceSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  sources: z.array(sourceSchema).max(20),
  charts: z.array(chartSchema).max(20),
  analyses: z.array(analysisSchema).max(40),
  actions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().min(1).max(2000),
        done: z.boolean(),
        createdAt: z.string(),
      }),
    )
    .max(100)
    .default([]),
  prompt: z.string().max(12000),
  reportPrompt: z.string().max(12000),
  report: z.string().max(100000),
  reportDataVersion: z.number().nullable(),
  reportDate: z.string(),
  dataVersion: z.number(),
  selection: z.object({
    tableId: z.string(),
    asin: z.string().max(200),
    keyword: z.string().max(300).default(""),
    start: z.string(),
    end: z.string(),
  }),
  updatedAt: z.string(),
});
export type Source = z.infer<typeof sourceSchema>;
export type DataTable = z.infer<typeof tableSchema>;
export type Row = z.infer<typeof rowSchema>;
export type ChartSpec = z.infer<typeof chartSchema>;
export type Analysis = z.infer<typeof analysisSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export const DEFAULT_PROMPT =
  "你是一名亚马逊精品运营。基于所选数据与来源，按照「事实与异常 → 可能原因 → 待验证假设 → 优先行动」分析。每个事实注明来源编号和具体数值。明确区分事实与推测；不把相关性写成因果。不虚构缺失的利润、环比、库存或竞品数据。建议给出验证方法与优先级。";
export const REPORT_PROMPT =
  "生成一份简洁的中文运营日报，包括经营概览、重点问题、分析依据、今日行动和待补充数据。保留来源编号；没有依据的内容写待确认。不要捏造负责人、完成时间或行动结果。";
export function newWorkspace(): Workspace {
  return {
    id: crypto.randomUUID(),
    name: "运营日报",
    sources: [],
    charts: [],
    analyses: [],
    actions: [],
    prompt: DEFAULT_PROMPT,
    reportPrompt: REPORT_PROMPT,
    report: "",
    reportDataVersion: null,
    reportDate: new Date().toLocaleDateString("en-CA"),
    dataVersion: 0,
    selection: { tableId: "", asin: "", keyword: "", start: "", end: "" },
    updatedAt: new Date().toISOString(),
  };
}
const aliases: Record<Field, string[]> = {
  keyword: ["关键词", "keyword", "searchterm", "搜索词"],
  rank: ["自然排名", "排名", "rank", "organicrank", "自然位"],
  date: ["日期", "date", "day", "报告日期"],
  asin: [
    "asin",
    "sku",
    "子asin",
    "childasin",
    "子体asin",
    "parentsku",
    "seller-sku",
  ],
  sales: [
    "销售额",
    "销售额usd",
    "sales",
    "orderedsales",
    "orderedproductsales",
    "已订购商品销售额",
    "销售额（美元）",
  ],
  orders: ["订单数", "orders", "totalorderitems", "订单商品总数"],
  units: ["销量", "units", "unitsordered", "已订购商品数量"],
  sessions: ["访客数", "sessions", "sessions-total", "会话数", "会话总数"],
  spend: ["广告花费", "spend", "cost", "花费", "广告支出"],
  adSales: [
    "广告销售额",
    "广告归因销售额",
    "adsales",
    "7daytotalsales",
    "7天总销售额",
  ],
  clicks: ["点击量", "clicks", "点击次数"],
  impressions: ["曝光量", "impressions", "展示量", "展示次数"],
};
aliases.keyword = ["关键词", "keyword", "searchterm", "搜索词"];
aliases.rank = ["自然排名", "排名", "rank", "organicrank", "自然位"];
const normal = (s: string) => s.toLowerCase().replace(/[\s_\-()（）$]/g, "");
export function guessMapping(columns: string[]): DataTable["mapping"] {
  const mapping: DataTable["mapping"] = {};
  for (const field of Object.keys(fields) as Field[]) {
    const col = columns.find((c) =>
      aliases[field].some((a) => normal(c) === normal(a)),
    );
    if (col) mapping[field] = col;
  }
  return mapping;
}
export function numeric(v: unknown): number | null {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v).trim();
  if (!/^[\s\d,.+\-()%$€£¥￥USDCEBJPYRA]+$/i.test(s)) return null;
  s = s
    .replace(/USD|EUR|GBP|JPY|CAD|AUD|CNY/gi, "")
    .replace(/[$€£¥￥,\s%]/g, "");
  if (/^\(.*\)$/.test(s)) s = "-" + s.slice(1, -1);
  if (!s || !/^[-+]?\d*\.?\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
export function dateKey(v: unknown): string {
  const s = String(v ?? "").trim();
  const m = s.match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
  if (m) {
    const d = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    const dt = new Date(d + "T00:00:00Z");
    return Number.isNaN(dt.getTime()) || dt.toISOString().slice(0, 10) !== d
      ? ""
      : d;
  }
  return "";
}
export function activeDataset(w: Workspace) {
  for (const s of w.sources.filter((s) => s.confirmed)) {
    const t = s.tables.find((t) => t.id === w.selection.tableId);
    if (t) return { source: s, table: t };
  }
  return null;
}
export function selectedRows(w: Workspace): Row[] {
  const d = activeDataset(w);
  if (!d) return [];
  return d.table.rows.filter((r) => {
    const { date, asin, keyword } = d.table.mapping;
    const v = date ? dateKey(r[date]) : "";
    if (w.selection.asin && String(r[asin ?? ""] ?? "") !== w.selection.asin)
      return false;
    if (
      w.selection.keyword &&
      String(r[keyword ?? ""] ?? "") !== w.selection.keyword
    )
      return false;
    if (w.selection.start && (!v || v < w.selection.start)) return false;
    if (w.selection.end && (!v || v > w.selection.end)) return false;
    return true;
  });
}
export function metricSummary(table: DataTable, rows: Row[]) {
  const out = {} as Record<
    Metric,
    { value: number | null; valid: number; total: number }
  >;
  for (const field of metricFields) {
    const column = table.mapping[field];
    const vals = column
      ? rows
          .map((r) => numeric(r[column]))
          .filter((v): v is number => v !== null)
      : [];
    out[field] = {
      value: vals.length ? vals.reduce((a, b) => a + b, 0) : null,
      valid: vals.length,
      total: rows.length,
    };
  }
  return out;
}
export function ratio(
  summary: ReturnType<typeof metricSummary>,
  numerator: Metric,
  denominator: Metric,
): number | null {
  const a = summary[numerator],
    b = summary[denominator];
  return a.total > 0 &&
    a.valid === a.total &&
    b.valid === b.total &&
    b.value !== null &&
    b.value > 0 &&
    a.value !== null
    ? (a.value / b.value) * 100
    : null;
}
export function chartData(spec: ChartSpec, rows: Row[]) {
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const key = String(r[spec.x] ?? "未填写");
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const calc = (rs: Row[], col: string) => {
    const n = rs
      .map((r) => numeric(r[col]))
      .filter((n): n is number => n !== null);
    if (!n.length) return null;
    return spec.aggregation === "last"
      ? n[n.length - 1]
      : n.reduce((a, b) => a + b, 0) /
          (spec.aggregation === "average" ? n.length : 1);
  };
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "zh-CN", { numeric: true }))
    .map(([label, rs]) => ({
      label,
      value: calc(rs, spec.y),
      overlay: spec.overlay ? calc(rs, spec.overlay) : null,
    }));
}
export function formatNumber(n: number | null) {
  return n === null
    ? "—"
    : n.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}
export function scopeLabel(w: Workspace) {
  const d = activeDataset(w);
  return d
    ? `${d.source.name} / ${d.table.name} · ${w.selection.asin || "全部商品"} · ${w.selection.start || "开始"} 至 ${w.selection.end || "结束"}`
    : "已确认的文字资料";
}
export function evidence(w: Workspace) {
  const d = activeDataset(w),
    rows = selectedRows(w);
  return {
    scope: scopeLabel(w),
    dataVersion: w.dataVersion,
    currency: d?.source.currency ?? "未确定",
    market: d?.source.market ?? "未确定",
    rowCount: rows.length,
    metrics: d ? metricSummary(d.table, rows) : null,
    ratios: d
      ? {
          acos: ratio(metricSummary(d.table, rows), "spend", "adSales"),
          conversion: ratio(metricSummary(d.table, rows), "orders", "sessions"),
        }
      : null,
    selection: w.selection,
    sources: w.sources
      .filter(
        (s) =>
          s.confirmed && (s.kind !== "spreadsheet" || s.id === d?.source.id),
      )
      .map((s) => ({
        id: s.id,
        name: s.name,
        reference: `[来源:${s.id.slice(0, 8)}]`,
        ...(s.mcp
          ? {
              provenance: s.mcp,
              dataBoundary:
                "第三方外部数据，不是店铺实际经营报表；流量得分不等于访客数。",
              warnings: s.warnings,
            }
          : {}),
        text: s.text.slice(0, 12000),
        textTruncated: s.text.length > 12000,
        tables: s.tables
          .filter((t) => t.id === d?.table.id)
          .map((t) => ({
            name: t.name,
            mapping: t.mapping,
            rows: rows.slice(0, 100),
            includedRows: Math.min(rows.length, 100),
            totalSelectedRows: rows.length,
          })),
      })),
  };
}
export function makeReport(w: Workspace) {
  const d = activeDataset(w),
    rows = selectedRows(w),
    s = d ? metricSummary(d.table, rows) : null;
  return `# ${w.name} · 运营日报\n\n日期：${w.reportDate}\n范围：${scopeLabel(w)}\n币种：${d?.source.currency || "未确定"} · 站点：${d?.source.market || "未确定"}\n\n## 经营概览\n${s ? metricFields.map((f) => `- ${fields[f]}：${formatNumber(s[f].value)}${s[f].valid < s[f].total ? `（有效 ${s[f].valid}/${s[f].total} 行，数据不完整）` : ""}`).join("\n") : "暂无已确认的结构化数据；仅有文字资料。"}\n\n## 重点分析\n${
    w.analyses
      .filter((a) => a.dataVersion === w.dataVersion)
      .map((a) => `${a.content}\n（${a.model} · ${a.scope}）`)
      .join("\n\n") || "尚未运行 AI 分析。以下为待填写内容，不代表 AI 结论。"
  }\n\n## 今日行动\n- 待运营确认与补充\n\n## 数据缺口与备注\n- 未导入的指标不按零处理；当前未自动关联不同报表。\n- 同一数据集应使用相同站点、币种和统计口径；有重叠的报表不可直接相加。\n\n## 数据来源\n${w.sources
    .filter((s) => s.confirmed)
    .map(
      (s) =>
        `- [来源:${s.id.slice(0, 8)}] ${s.name}${s.mcp ? `（第三方 MCP 数据，读取于 ${s.mcp.fetchedAt}，非店铺实际经营报表）` : ""}`,
    )
    .join("\n")}`;
}
