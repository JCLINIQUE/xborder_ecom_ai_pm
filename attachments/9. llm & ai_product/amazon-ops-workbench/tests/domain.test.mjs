import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newWorkspace,
  numeric,
  dateKey,
  guessMapping,
  selectedRows,
  metricSummary,
  ratio,
  chartData,
  makeReport,
  workspaceSchema,
  evidence,
} from "../lib/ops/domain.ts";
import { escapeHtml } from "../lib/ops/export.ts";
const fixture = () => {
  const w = newWorkspace();
  const t = {
    id: "table-1",
    name: "业务报表",
    columns: [
      "日期",
      "ASIN",
      "销售额",
      "订单数",
      "访客数",
      "广告花费",
      "广告销售额",
    ],
    mapping: {
      date: "日期",
      asin: "ASIN",
      sales: "销售额",
      orders: "订单数",
      sessions: "访客数",
      spend: "广告花费",
      adSales: "广告销售额",
    },
    rows: [
      {
        日期: "2026-09-21",
        ASIN: "B01",
        销售额: "1,200.50",
        订单数: 10,
        访客数: 100,
        广告花费: 50,
        广告销售额: 200,
      },
      {
        日期: "2026-09-22",
        ASIN: "B01",
        销售额: 800,
        订单数: 5,
        访客数: 50,
        广告花费: 25,
        广告销售额: 100,
      },
      {
        日期: "2026-09-22",
        ASIN: "B02",
        销售额: 0,
        订单数: 0,
        访客数: 25,
        广告花费: "",
        广告销售额: "",
      },
    ],
  };
  w.sources = [
    {
      id: "source-1",
      name: "test.csv",
      kind: "spreadsheet",
      hash: "test",
      createdAt: new Date().toISOString(),
      text: "",
      tables: [t],
      confirmed: true,
      warnings: [],
      market: "US",
      currency: "USD",
    },
  ];
  w.selection.tableId = t.id;
  return { w, t };
};
test("starts empty, no generated/demo data", () => {
  const w = newWorkspace();
  assert.equal(w.sources.length, 0);
  assert.equal(w.charts.length, 0);
  assert.equal(w.report, "");
  assert.equal(w.analyses.length, 0);
  assert.equal(workspaceSchema.safeParse(w).success, true);
});
test("numbers preserve missing and real zero", () => {
  assert.equal(numeric(""), null);
  assert.equal(numeric(null), null);
  assert.equal(numeric("N/A"), null);
  assert.equal(numeric("0"), 0);
  assert.equal(numeric("$1,200.50"), 1200.5);
  assert.equal(numeric("(24.50)"), -24.5);
  assert.equal(numeric("3 cats"), null);
  assert.equal(numeric(Infinity), null);
});
test("date validation avoids impossible dates", () => {
  assert.equal(dateKey("2026/9/3"), "2026-09-03");
  assert.equal(dateKey("2026-02-31"), "");
  assert.equal(dateKey("not a date"), "");
});
test("field mapping recognizes actual business and rank labels", () => {
  const m = guessMapping([
    "Date",
    "(Child) ASIN",
    "Ordered Product Sales",
    "Sessions - Total",
    "自然排名",
    "关键词",
  ]);
  assert.equal(m.date, "Date");
  assert.equal(m.sales, "Ordered Product Sales");
  assert.equal(m.sessions, "Sessions - Total");
  assert.equal(m.rank, "自然排名");
  assert.equal(m.keyword, "关键词");
});
test("scope filters and no unconfirmed source contribution", () => {
  const { w } = fixture();
  w.selection.asin = "B01";
  w.selection.start = "2026-09-22";
  assert.equal(selectedRows(w).length, 1);
  w.sources[0].confirmed = false;
  assert.equal(selectedRows(w).length, 0);
});
test("ratio recomputes from totals, missing values cannot look complete", () => {
  const { t } = fixture();
  const s = metricSummary(t, t.rows);
  assert.equal(s.sales.value, 2000.5);
  assert.equal(s.spend.valid, 2);
  assert.equal(ratio(s, "spend", "adSales"), null);
  assert.equal(
    ratio(metricSummary(t, t.rows.slice(0, 2)), "spend", "adSales"),
    25,
  );
  assert.equal(ratio(metricSummary(t, []), "orders", "sessions"), null);
});
test("chart overlays use separate metrics and missing remains null", () => {
  const { t } = fixture();
  const spec = {
    id: "c",
    title: "Sales",
    tableId: t.id,
    x: "日期",
    y: "销售额",
    overlay: "广告花费",
    type: "bar",
    aggregation: "sum",
    target: null,
    note: "",
  };
  const data = chartData(spec, t.rows);
  assert.equal(data.length, 2);
  assert.equal(data[0].value, 1200.5);
  assert.equal(data[1].overlay, 25);
  assert.equal(chartData({ ...spec, y: "missing" }, t.rows)[0].value, null);
});
test("draft is explicitly not fake AI and cites source", () => {
  const { w } = fixture();
  const r = makeReport(w);
  assert.match(r, /尚未运行 AI 分析/);
  assert.match(r, /\[来源:source-1\]/);
  assert.match(r, /2,000.5/);
});
test("evidence identifies truncated details and schema strips credentials", () => {
  const { w } = fixture();
  const e = evidence(w);
  assert.equal(e.rowCount, 3);
  assert.equal(e.sources[0].tables[0].includedRows, 3);
  const safe = workspaceSchema.parse({ ...w, apiKey: "should-not-persist" });
  assert.equal("apiKey" in safe, false);
  assert.equal(escapeHtml('<script>"&'), "&lt;script&gt;&quot;&amp;");
});
