"use client";
import { useState } from "react";
import {
  BarChart3,
  Plus,
  Sparkles,
  SlidersHorizontal,
  Trash2,
  ArrowRight,
} from "lucide-react";
import {
  Line,
  Bar,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWorkspace } from "@/lib/ops/workspace-context";
import {
  activeDataset,
  selectedRows,
  metricSummary,
  metricFields,
  fields,
  formatNumber,
  ratio,
  chartData,
  type ChartSpec,
  type Metric,
  type Row,
} from "@/lib/ops/domain";
import { Choice, Empty, PanelHeading } from "./primitives";
export type ReportMode = "overview" | "sales" | "ads" | "keywords" | "charts";
export function ReportView({
  mode,
  onImport,
  onAnalyze,
}: {
  mode: ReportMode;
  onImport: () => void;
  onAnalyze: (focus: string) => void;
}) {
  const ops = useWorkspace(),
    w = ops.workspace,
    d = w ? activeDataset(w) : null,
    rows = w ? selectedRows(w) : [];
  const [editing, setEditing] = useState<ChartSpec | null>(null),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(0);
  const titles = {
    overview: "数据报告",
    sales: "商品销售与转化",
    ads: "广告花费与表现",
    keywords: "每日关键词自然位追踪",
    charts: "自定义数据图表",
  };
  const needed = {
    overview: "业务报告、广告报告，或经营记录",
    sales: "含 ASIN、销售额、销量、订单数与访客数的业务报告",
    ads: "含广告花费、归因销售额、曝光和点击量的广告报告",
    keywords: "含日期、ASIN、关键词、自然排名的追踪表",
    charts: "包含分类 / 日期列和数值列的 Excel / CSV",
  };
  if (!w || !d)
    return (
      <Empty
        title={titles[mode]}
        description={`导入并确认${needed[mode]}，即可开始。也可仅导入文字资料后直接进入 AI 分析。`}
        onImport={onImport}
      />
    );
  const table = d.table,
    summary = metricSummary(table, rows),
    datasets = w.sources
      .filter((s) => s.confirmed)
      .flatMap((s) =>
        s.tables.map((t) => ({ value: t.id, label: `${s.name} / ${t.name}` })),
      );
  const fieldOptions = (col?: string) =>
    [
      ...new Set(
        table.rows.map((r) => String(r[col ?? ""] ?? "")).filter(Boolean),
      ),
    ]
      .sort()
      .map((v) => ({ value: v, label: v }));
  const metricList: readonly Metric[] =
    mode === "sales"
      ? ["sales", "units", "orders", "sessions"]
      : mode === "ads"
        ? ["spend", "adSales", "clicks", "impressions"]
        : metricFields;
  const keywordMode = mode === "keywords",
    keywordReady = !!table.mapping.keyword && !!table.mapping.rank;
  const charts = w.charts.filter((c) => c.tableId === table.id),
    filtered = rows.filter(
      (r) =>
        !query ||
        Object.values(r).some((v) =>
          String(v).toLowerCase().includes(query.toLowerCase()),
        ),
    ),
    maxPage = Math.max(0, Math.ceil(filtered.length / 20) - 1),
    safePage = Math.min(page, maxPage);
  const changeSelection = (patch: Partial<typeof w.selection>) => {
    ops.update((w) => ({ ...w, selection: { ...w.selection, ...patch } }));
    setPage(0);
  };
  function addChart() {
    const numericCol = table.columns.find((c) =>
      table.rows.some(
        (r) => typeof r[c] === "number" || /^[\d$,.%-]+$/.test(String(r[c])),
      ),
    );
    setEditing({
      id: crypto.randomUUID(),
      title: keywordMode ? "关键词排名趋势" : "新的自定义图表",
      tableId: table.id,
      x: table.mapping.date || table.columns[0],
      y: keywordMode
        ? table.mapping.rank ||
          numericCol ||
          table.columns[1] ||
          table.columns[0]
        : table.mapping.sales ||
          table.mapping.spend ||
          numericCol ||
          table.columns[0],
      overlay: "",
      type: "line",
      aggregation: keywordMode ? "last" : "sum",
      target: null,
      note: "",
    });
  }
  function saveChart() {
    if (!editing) return;
    if (!editing.title.trim()) return;
    ops.update((w) => ({
      ...w,
      charts: w.charts.some((c) => c.id === editing.id)
        ? w.charts.map((c) => (c.id === editing.id ? editing : c))
        : [...w.charts, editing],
    }));
    setEditing(null);
  }
  const displayedCols = keywordMode
    ? [
        table.mapping.date,
        table.mapping.asin,
        table.mapping.keyword,
        table.mapping.rank,
        ...table.columns,
      ].filter((x, i, a): x is string => !!x && a.indexOf(x) === i)
    : table.columns;
  return (
    <div className="space-y-5">
      <PanelHeading
        title={titles[mode]}
        description="指标来自已确认的真实资料；不同报表不自动相加，避免口径重叠。"
      >
        <Button variant="outline" onClick={addChart}>
          <Plus size={15} />
          添加图表
        </Button>
        <Button onClick={() => onAnalyze(titles[mode])}>
          <Sparkles size={15} />
          AI 辅助分析
        </Button>
      </PanelHeading>
      <section className="panel filter-panel">
        <label>
          当前表格
          <Choice
            value={w.selection.tableId}
            label="数据集"
            onChange={(v) =>
              changeSelection({
                tableId: v,
                asin: "",
                keyword: "",
                start: "",
                end: "",
              })
            }
            options={datasets}
          />
        </label>
        <label>
          商品 / ASIN
          <Choice
            value={w.selection.asin}
            label="商品"
            onChange={(v) => changeSelection({ asin: v })}
            options={[
              { value: "", label: "全部商品" },
              ...fieldOptions(table.mapping.asin),
            ]}
          />
        </label>
        {keywordMode && (
          <label>
            关键词
            <Choice
              value={w.selection.keyword}
              label="关键词"
              onChange={(v) => changeSelection({ keyword: v })}
              options={[
                { value: "", label: "全部关键词" },
                ...fieldOptions(table.mapping.keyword),
              ]}
            />
          </label>
        )}
        <label>
          开始日期
          <Input
            type="date"
            disabled={!table.mapping.date}
            value={w.selection.start}
            onChange={(e) => changeSelection({ start: e.target.value })}
          />
        </label>
        <label>
          结束日期
          <Input
            type="date"
            disabled={!table.mapping.date}
            value={w.selection.end}
            onChange={(e) => changeSelection({ end: e.target.value })}
          />
        </label>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            changeSelection({ asin: "", keyword: "", start: "", end: "" })
          }
        >
          重置筛选
        </Button>
      </section>
      <div className="data-context">
        <span className="status-dot" />
        {d.source.market} · {d.source.currency} · {rows.length} /{" "}
        {table.rows.length} 行
        <span className="ml-auto">[来源:{d.source.id.slice(0, 8)}]</span>
      </div>
      {keywordMode && !keywordReady && (
        <div className="warning-note">
          当前数据集缺少关键词或排名映射。请选择追踪表，或前往
          <Button variant="link" size="sm" onClick={onImport}>
            导入与字段校验
            <ArrowRight size={14} />
          </Button>
          。不会生成虚构排名。
        </div>
      )}
      {mode !== "charts" && !keywordMode && (
        <>
          <div className="metric-grid">
            {metricList.map((f) => (
              <button
                key={f}
                className="metric-card"
                onClick={() =>
                  onAnalyze(`分析${fields[f]}，并注明缺失记录与口径限制`)
                }
              >
                <span>
                  {fields[f]}
                  <Sparkles size={12} />
                </span>
                <strong>{formatNumber(summary[f].value)}</strong>
                <small>
                  {summary[f].valid === rows.length && rows.length
                    ? `${summary[f].valid} 行有效数据`
                    : summary[f].valid
                      ? `仅 ${summary[f].valid}/${rows.length} 行有效，请谨慎解读`
                      : "未提供 / 无有效数据"}
                </small>
              </button>
            ))}
          </div>
          <div className="ratio-strip">
            <span>
              订单 / 访客转化率{" "}
              <strong>
                {formatNumber(ratio(summary, "orders", "sessions"))}
                {ratio(summary, "orders", "sessions") !== null ? "%" : ""}
              </strong>
            </span>
            <span>
              ACOS{" "}
              <strong>
                {formatNumber(ratio(summary, "spend", "adSales"))}
                {ratio(summary, "spend", "adSales") !== null ? "%" : ""}
              </strong>
            </span>
            <small>
              仅在分子、分母完整且分母大于 0 时计算；未作跨报表关联。
            </small>
          </div>
        </>
      )}
      <section className="panel">
        <PanelHeading
          title={keywordMode ? "关键词趋势图" : "经营趋势与自定义图表"}
          description="可叠加第二指标、目标参考线和运营备注。"
        >
          <Button variant="outline" size="sm" onClick={addChart}>
            <SlidersHorizontal size={14} />
            配置图表
          </Button>
        </PanelHeading>
        {charts.length ? (
          <div className="chart-grid">
            {charts.map((c) => (
              <section className="chart-card" key={c.id}>
                <div className="flex justify-between items-start gap-2 mb-4">
                  <div>
                    <h3>{c.title}</h3>
                    <small>
                      {c.y}
                      {c.overlay ? ` / ${c.overlay}（右轴）` : ""} ·{" "}
                      {
                        {
                          sum: "求和",
                          average: "算术平均",
                          last: "取最后一条",
                        }[c.aggregation]
                      }
                    </small>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="编辑图表"
                      onClick={() => setEditing(c)}
                    >
                      <SlidersHorizontal size={14} />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="移除图表"
                      onClick={() =>
                        ops.update((w) => ({
                          ...w,
                          charts: w.charts.filter((x) => x.id !== c.id),
                        }))
                      }
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
                <OpsChart spec={c} rows={rows} />
                {chartData(c, rows).length > 100 && (
                  <small>图表显示前 100 组；全部行仍参与指标与明细。</small>
                )}
                {c.note && <p className="chart-note">运营备注：{c.note}</p>}
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3"
                  onClick={() =>
                    onAnalyze(
                      `分析图表「${c.title}」：横轴 ${c.x}，指标 ${c.y}，叠加 ${c.overlay || "无"}，按${c.aggregation}聚合。运营备注属于用户假设：${c.note}`,
                    )
                  }
                >
                  <Sparkles size={14} />
                  分析这张图
                </Button>
              </section>
            ))}
          </div>
        ) : (
          <div className="chart-empty">
            <BarChart3 size={30} />
            <div>
              <strong>选择你要看的经营趋势</strong>
              <p>根据当前报表添加图表，不会默认展示模拟曲线。</p>
            </div>
            <Button variant="outline" onClick={addChart}>
              添加第一张图表
            </Button>
          </div>
        )}
      </section>
      <section className="panel">
        <PanelHeading
          title={keywordMode ? "产品关键词明细" : "已确认的数据明细"}
          description="可搜索、分页；点击某一行的分析入口，让 AI 聚焦具体经营对象。"
        >
          <Input
            aria-label="搜索明细"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="搜索 ASIN、关键词或内容"
            className="w-60"
          />
        </PanelHeading>
        <div className="data-table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                {displayedCols.map((c) => (
                  <TableHead key={c}>{c}</TableHead>
                ))}
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(safePage * 20, safePage * 20 + 20).map((r, i) => (
                <TableRow key={`${safePage}-${i}`}>
                  {displayedCols.map((c) => (
                    <TableCell key={c}>{String(r[c] ?? "—")}</TableCell>
                  ))}
                  <TableCell>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() =>
                        onAnalyze(
                          `聚焦以下一条记录（来源 ${d.source.name} / ${table.name}）：${JSON.stringify(r).slice(0, 1800)}`,
                        )
                      }
                    >
                      AI 诊断
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!filtered.length && (
            <div className="p-8 text-center muted">
              没有符合当前筛选条件的数据
            </div>
          )}
        </div>
        <div className="pager-row">
          <span>
            共 {filtered.length} 行 · 第 {safePage + 1} / {maxPage + 1} 页
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
            >
              上一页
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={safePage === maxPage}
              onClick={() => setPage(safePage + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      </section>
      <Dialog
        open={!!editing}
        onOpenChange={(v) => {
          if (!v) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>自定义报告图表</DialogTitle>
            <DialogDescription>
              图表配置保存在当前本次报告，与分析、日报共用数据。
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <>
              <label className="field-label">
                图表名称
                <Input
                  maxLength={100}
                  value={editing.title}
                  onChange={(e) =>
                    setEditing({ ...editing, title: e.target.value })
                  }
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="field-label">
                  横轴 / 分组
                  <Choice
                    label="横轴"
                    value={editing.x}
                    onChange={(v) => setEditing({ ...editing, x: v })}
                    options={table.columns.map((c) => ({ value: c, label: c }))}
                  />
                </label>
                <label className="field-label">
                  主要指标
                  <Choice
                    label="指标"
                    value={editing.y}
                    onChange={(v) => setEditing({ ...editing, y: v })}
                    options={table.columns.map((c) => ({ value: c, label: c }))}
                  />
                </label>
                <label className="field-label">
                  叠加指标（独立右轴）
                  <Choice
                    label="叠加指标"
                    value={editing.overlay}
                    onChange={(v) => setEditing({ ...editing, overlay: v })}
                    options={[
                      { value: "", label: "不叠加" },
                      ...table.columns.map((c) => ({ value: c, label: c })),
                    ]}
                  />
                </label>
                <label className="field-label">
                  呈现方式
                  <Choice
                    label="呈现方式"
                    value={editing.type}
                    onChange={(v) =>
                      setEditing({ ...editing, type: v as "bar" | "line" })
                    }
                    options={[
                      { value: "line", label: "趋势折线" },
                      { value: "bar", label: "分组柱状图" },
                    ]}
                  />
                </label>
                <label className="field-label">
                  同组数据如何计算
                  <Choice
                    label="聚合方式"
                    value={editing.aggregation}
                    onChange={(v) =>
                      setEditing({
                        ...editing,
                        aggregation: v as ChartSpec["aggregation"],
                      })
                    }
                    options={[
                      { value: "sum", label: "求和（金额 / 数量）" },
                      { value: "average", label: "算术平均（非加权）" },
                      { value: "last", label: "原始顺序最后一条" },
                    ]}
                  />
                </label>
                <label className="field-label">
                  主指标目标线
                  <Input
                    type="number"
                    value={editing.target ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        target:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <p className="warning-note">
                排名和百分比通常不应求和；跨商品排名请先筛选 ASIN 与关键词。ACOS
                / 转化率应按原始分子分母重新计算，不能直接平均。
              </p>
              <label className="field-label">
                运营备注
                <Textarea
                  maxLength={1000}
                  value={editing.note}
                  onChange={(e) =>
                    setEditing({ ...editing, note: e.target.value })
                  }
                  placeholder="例如：9 月 20 日调整了 Coupon，需要观察后续变化。"
                />
              </label>
              <Button onClick={saveChart} disabled={!editing.title.trim()}>
                保存图表
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function OpsChart({ spec, rows }: { spec: ChartSpec; rows: Row[] }) {
  const data = chartData(spec, rows).slice(0, 100);
  return (
    <ChartContainer
      config={{
        value: { label: spec.y, color: "#ed792f" },
        overlay: { label: spec.overlay, color: "#3e8a9d" },
      }}
      className="h-64 w-full aspect-auto"
    >
      <ComposedChart
        data={data}
        margin={{ left: 0, right: 4, top: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis yAxisId="left" width={55} tickLine={false} axisLine={false} />
        {spec.overlay && (
          <YAxis
            yAxisId="right"
            orientation="right"
            width={55}
            tickLine={false}
            axisLine={false}
          />
        )}
        <Tooltip />
        <Legend />
        {spec.type === "line" ? (
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="value"
            name={spec.y}
            stroke="#ed792f"
            strokeWidth={2}
            dot={data.length < 20}
            connectNulls={false}
          />
        ) : (
          <Bar
            yAxisId="left"
            dataKey="value"
            name={spec.y}
            fill="#ed792f"
            radius={[3, 3, 0, 0]}
          />
        )}{" "}
        {spec.overlay && (
          <Line
            yAxisId="right"
            dataKey="overlay"
            name={spec.overlay}
            stroke="#3e8a9d"
            strokeWidth={2}
            dot={false}
          />
        )}{" "}
        {spec.target !== null && (
          <ReferenceLine
            yAxisId="left"
            y={spec.target}
            stroke="#bb814c"
            strokeDasharray="5 5"
            label="目标"
          />
        )}
      </ComposedChart>
    </ChartContainer>
  );
}
