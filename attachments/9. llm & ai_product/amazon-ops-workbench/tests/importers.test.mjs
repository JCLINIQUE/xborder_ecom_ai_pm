import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import * as XLSX from "xlsx";
registerHooks({
  resolve(specifier, context, next) {
    return next(
      specifier === "./domain" &&
        context.parentURL?.endsWith("/lib/ops/importers.ts")
        ? "./domain.ts"
        : specifier,
      context,
    );
  },
});
const { parseFile, parseTabularText, matrixTable } =
  await import("../lib/ops/importers.ts");
test("CSV import, pending confirmation and unknown currency", async () => {
  const source = await parseFile(
    new File(["日期,ASIN,销售额\n2026-09-22,B01,35.5"], "real-format.csv"),
    () => {},
  );
  assert.equal(source.confirmed, false);
  assert.equal(source.currency, "未确定");
  assert.equal(source.tables[0].rows[0]["销售额"], "35.5");
  assert.equal(source.tables[0].mapping.asin, "ASIN");
});
test("XLSX workbook includes all sheets and ISO dates", async () => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(
      [
        ["日期", "ASIN", "销量"],
        [new Date("2026-09-22T00:00:00Z"), "B01", 2],
      ],
      { cellDates: true },
    ),
    "业务",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["关键词", "排名"],
      ["example", 12],
    ]),
    "排名",
  );
  const bytes = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const s = await parseFile(new File([bytes], "multi.xlsx"), () => {});
  assert.equal(s.tables.length, 2);
  assert.equal(s.tables[0].rows[0]["日期"], "2026-09-22");
  assert.equal(s.tables[1].mapping.rank, "排名");
});
test("ordinary TXT remains evidence, TSV becomes a table", async () => {
  const s = await parseFile(
    new File(["今天核对了广告预算，待确认后续表现。"], "memo.txt"),
    () => {},
  );
  assert.equal(s.tables.length, 0);
  assert.match(s.text, /广告预算/);
  const t = await parseTabularText("日期\tASIN\t订单数\n2026-09-22\tB01\t3");
  assert.equal(t[0].rows.length, 1);
  assert.equal(t[0].mapping.orders, "订单数");
});
test("duplicate column names never overwrite values", () => {
  const t = matrixTable(
    [
      ["a", "a", "a (2)"],
      [1, 2, 3],
    ],
    "collision",
  );
  assert.equal(new Set(t.columns).size, 3);
  assert.deepEqual(Object.values(t.rows[0]), [1, 2, 3]);
});
test("columns without headers are retained, excessive rows rejected", () => {
  const t = matrixTable([["a"], [1, 2]], "wide");
  assert.equal(t.columns.length, 2);
  assert.equal(t.rows[0]["列2"], 2);
  assert.throws(
    () =>
      matrixTable(
        Array.from({ length: 5002 }, () => [1]),
        "too long",
      ),
    /5,000/,
  );
  assert.throws(
    () => matrixTable([["a"], ["x".repeat(4001)]], "long cell"),
    /不会静默截断/,
  );
});
test("unsupported files fail clearly and cancellation does not commit", async () => {
  await assert.rejects(
    () => parseFile(new File(["text"], "old.doc"), () => {}),
    /另存为/,
  );
  const a = new AbortController();
  a.abort();
  await assert.rejects(
    () => parseFile(new File(["text"], "cancel.txt"), () => {}, a.signal),
    /abort/i,
  );
});
