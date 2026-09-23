"use client";
import { useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileText,
  Plus,
  UploadCloud,
  TriangleAlert,
  X,
} from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWorkspace } from "@/lib/ops/workspace-context";
import { parseFile, parseTabularText, sha256 } from "@/lib/ops/importers";
import { fields, dateKey, type Field, type Source } from "@/lib/ops/domain";
import { Choice, PanelHeading } from "./primitives";
import { toast } from "sonner";
import { McpImport } from "./mcp-import";

export function ImportPanel({ onReport }: { onReport: () => void }) {
  const ops = useWorkspace(),
    w = ops.workspace;
  const input = useRef<HTMLInputElement>(null),
    abort = useRef<AbortController | null>(null);
  const [selected, setSelected] = useState(""),
    [progress, setProgress] = useState<{
      message: string;
      percent: number;
    } | null>(null),
    [error, setError] = useState(""),
    [paste, setPaste] = useState(false),
    [pasted, setPasted] = useState(""),
    [pastedName, setPastedName] = useState("运营记录"),
    [working, setWorking] = useState(false),
    [editing, setEditing] = useState<Source | null>(null),
    [tableIndex, setTableIndex] = useState(0);
  const source = editing ?? w?.sources.find((s) => s.id === selected) ?? null;
  function edit(s: Source) {
    setSelected(s.id);
    setEditing(structuredClone(s));
    setTableIndex(0);
  }
  async function importFiles(files: FileList | null) {
    if (!files) return;
    setError("");
    setWorking(true);
    abort.current = new AbortController();
    try {
      const target = await ops.ensure();
      for (const f of Array.from(files)) {
        if (abort.current.signal.aborted) break;
        const source = await parseFile(
          f,
          (message, percent) => setProgress({ message, percent }),
          abort.current.signal,
        );
        setProgress({ message: "保存原始文件与解析结果", percent: 100 });
        await ops.addSource(source, f, target.id);
        edit(source);
      }
      toast.success("导入完成，请核对内容后确认。");
    } catch (e) {
      setError(
        (e as Error).name === "AbortError"
          ? "已取消。此前完成的文件仍保留。"
          : (e as Error).message,
      );
    } finally {
      setWorking(false);
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  }
  async function addText() {
    setWorking(true);
    try {
      if (!pasted.trim()) return;
      const tables = await parseTabularText(pasted);
      const source: Source = {
        id: crypto.randomUUID(),
        name: pastedName.trim() || "运营记录",
        kind: "text",
        hash: await sha256(new TextEncoder().encode(pasted).buffer),
        createdAt: new Date().toISOString(),
        text: pasted,
        tables,
        confirmed: false,
        warnings: ["请核对粘贴的内容；只有确认后才参与分析。"],
        market: "未确定",
        currency: "未确定",
      };
      await ops.addSource(
        source,
        new File([pasted], `${source.name}.txt`, { type: "text/plain" }),
      );
      setPaste(false);
      setPasted("");
      edit(source);
    } catch (e) {
      ops.notifyError(e);
    } finally {
      setWorking(false);
    }
  }
  async function confirm() {
    if (!source) return;
    setWorking(true);
    try {
      if (!source.currency.trim() || !source.market.trim())
        throw new Error("请填写站点与币种；未知时填写“未确定”。");
      for (const table of source.tables) {
        const values = Object.values(table.mapping).filter(Boolean);
        if (new Set(values).size !== values.length)
          throw new Error("同一列不能映射到多个指标，请检查映射。");
      }
      ops.update((w) => ({
        ...w,
        sources: w.sources.map((s) =>
          s.id === source.id
            ? { ...source, fileId: s.fileId, confirmed: true }
            : s,
        ),
        selection: source.tables.length
          ? {
              tableId: source.tables[tableIndex]?.id ?? source.tables[0].id,
              asin: "",
              keyword: "",
              start: "",
              end: "",
            }
          : w.selection,
        dataVersion: w.dataVersion + 1,
      }));
      await ops.flush();
      setEditing(null);
      toast.success("已确认，数据报告使用的是你的真实数据。");
      onReport();
    } catch (e) {
      ops.notifyError(e);
    } finally {
      setWorking(false);
    }
  }
  const t = source?.tables[tableIndex];
  return (
    <div className="space-y-5">
      <PanelHeading
        title="导入与校验数据"
        description="原始资料保留；字段、口径和识别结果由你确认后，再参与报告。"
      >
        <McpImport
          disabled={working}
          onImport={async (source, file) => {
            setWorking(true);
            try {
              const target = await ops.ensure();
              await ops.addSource(source, file, target.id);
              edit(source);
              toast.success("MCP 结果已保存，请核对字段后确认。");
            } finally {
              setWorking(false);
            }
          }}
        />
        <Button
          variant="outline"
          onClick={() => setPaste(true)}
          disabled={working}
        >
          <FileText size={15} />
          粘贴文字 / 表格
        </Button>
        <Button onClick={() => input.current?.click()} disabled={working}>
          <Plus size={15} />
          导入文件
        </Button>
      </PanelHeading>
      <input
        ref={input}
        type="file"
        multiple
        className="sr-only"
        accept=".xlsx,.xls,.csv,.tsv,.txt,.md,.docx,.pdf,.png,.jpg,.jpeg,.webp,.bmp"
        onChange={(e) => void importFiles(e.target.files)}
      />
      <div
        className={`compact-upload ${working ? "is-busy" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!working) void importFiles(e.dataTransfer.files);
        }}
      >
        <UploadCloud size={27} />
        <div>
          <strong>拖入运营报表、截图或文字资料</strong>
          <p>
            Excel / CSV · 截图 OCR · TXT · Word (.docx) · PDF · 每份不超过 10 MB
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => input.current?.click()}
          disabled={working}
        >
          选择文件
        </Button>
      </div>
      {progress && (
        <div className="panel">
          <div className="flex justify-between gap-3">
            <span role="status">{progress.message}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => abort.current?.abort()}
            >
              <X size={14} />
              取消
            </Button>
          </div>
          <Progress value={progress.percent} className="mt-3" />
        </div>
      )}
      {error && (
        <div role="alert" className="error-message">
          {error}
        </div>
      )}
      <div className="import-layout">
        <section className="panel source-list">
          <PanelHeading
            title="资料清单"
            description={`${w?.sources.length ?? 0} 份资料`}
          />
          {!w?.sources.length && (
            <p className="muted text-sm leading-7">
              还没有资料。导入后自动保存，下次打开可以恢复。
            </p>
          )}
          {w?.sources.map((s) => (
            <button
              key={s.id}
              className={`source-item ${source?.id === s.id ? "selected" : ""}`}
              onClick={() => edit(s)}
            >
              <FileText size={18} />
              <div>
                <strong>{s.name}</strong>
                <small>
                  {s.mcp ? "MCP · " : ""}
                  {s.confirmed ? "已确认" : "待校验"} ·{" "}
                  {s.tables.reduce((n, t) => n + t.rows.length, 0)} 行结构化数据
                </small>
              </div>
              {s.confirmed && (
                <CheckCircle2 size={15} className="text-emerald-600" />
              )}
            </button>
          ))}
        </section>
        <section className="panel min-w-0">
          {!source ? (
            <div className="review-empty">
              <FileText size={29} />
              <h3>在这里核对你的数据</h3>
              <p>
                选择一份已导入的资料，检查字段和原文。文字资料不会自动变成数字指标。
              </p>
            </div>
          ) : (
            <>
              <PanelHeading
                title={source.name}
                description={
                  source.confirmed
                    ? "已确认的资料 · 修改后需重新确认"
                    : "待人工校验 · 尚未进入报告"
                }
              >
                {source.fileId && (
                  <Button asChild variant="outline" size="sm">
                    <a href={`/api/files/${source.fileId}`}>
                      <Download size={14} />
                      原文件
                    </a>
                  </Button>
                )}
              </PanelHeading>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <label className="field-label">
                  站点
                  <Input
                    value={source.market}
                    maxLength={30}
                    onChange={(e) =>
                      setEditing({ ...source, market: e.target.value })
                    }
                  />
                </label>
                <label className="field-label">
                  币种
                  <Input
                    value={source.currency}
                    maxLength={10}
                    onChange={(e) =>
                      setEditing({ ...source, currency: e.target.value })
                    }
                  />
                </label>
              </div>
              {source.warnings.length > 0 && (
                <div className="warning-note">
                  <TriangleAlert size={15} />
                  <div>
                    {source.warnings.map((s, i) => (
                      <p key={i}>{s}</p>
                    ))}
                  </div>
                </div>
              )}
              <Tabs
                defaultValue={source.tables.length ? "table" : "text"}
                key={source.id}
              >
                <TabsList>
                  <TabsTrigger value="table">
                    表格与字段映射 ({source.tables.length})
                  </TabsTrigger>
                  <TabsTrigger value="text">提取原文</TabsTrigger>
                </TabsList>
                <TabsContent value="table">
                  {source.tables.length ? (
                    <>
                      <Choice
                        label="工作表"
                        value={String(tableIndex)}
                        onChange={(v) => setTableIndex(Number(v))}
                        options={source.tables.map((t, i) => ({
                          value: String(i),
                          label: `${t.name} · ${t.rows.length} 行`,
                        }))}
                      />
                      {t && (
                        <>
                          <div className="mapping-grid">
                            {(Object.entries(fields) as [Field, string][]).map(
                              ([field, label]) => (
                                <label key={field} className="field-label">
                                  {label}
                                  <Choice
                                    label={label}
                                    value={t.mapping[field] ?? ""}
                                    onChange={(v) =>
                                      setEditing({
                                        ...source,
                                        tables: source.tables.map((x, i) =>
                                          i === tableIndex
                                            ? {
                                                ...x,
                                                mapping: {
                                                  ...x.mapping,
                                                  [field]: v,
                                                },
                                              }
                                            : x,
                                        ),
                                      })
                                    }
                                    options={[
                                      { value: "", label: "不映射 / 未提供" },
                                      ...t.columns.map((c) => ({
                                        value: c,
                                        label: c,
                                      })),
                                    ]}
                                  />
                                </label>
                              ),
                            )}
                          </div>
                          {t.mapping.date &&
                            t.rows.some(
                              (r) =>
                                r[t.mapping.date!] &&
                                !dateKey(r[t.mapping.date!]),
                            ) && (
                              <p className="warning-note">
                                部分日期无法按 YYYY-MM-DD
                                读取；日期筛选会排除这些行。请修正源文件或去掉日期筛选。
                              </p>
                            )}
                          <div className="data-table-wrap">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  {t.columns.map((c) => (
                                    <TableHead key={c}>{c}</TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {t.rows.slice(0, 8).map((r, i) => (
                                  <TableRow key={i}>
                                    {t.columns.map((c) => (
                                      <TableCell key={c}>
                                        {String(r[c] ?? "—")}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          <p className="text-xs muted mt-2">
                            预览前 8 行，共 {t.rows.length}{" "}
                            行。每行应为同一统计粒度；请去掉合计行以免重复计数。
                          </p>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="review-empty small">
                      <p>
                        未识别到结构化表格。这份资料仍可作为 AI 分析的文字证据。
                      </p>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            const tables = await parseTabularText(source.text);
                            if (!tables.length)
                              throw new Error(
                                "没有找到带表头的 CSV / 制表符表格。请先在原文中整理格式，或上传 Excel。",
                              );
                            setEditing({ ...source, tables });
                            setTableIndex(0);
                          } catch (e) {
                            ops.notifyError(e);
                          }
                        }}
                      >
                        尝试按 CSV / 表格识别
                      </Button>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="text">
                  <Textarea
                    value={source.text}
                    maxLength={150000}
                    onChange={(e) =>
                      setEditing({ ...source, text: e.target.value })
                    }
                    className="min-h-72 font-mono text-xs"
                    placeholder="此文件以表格数据导入，没有单独的文字内容。"
                  />
                  <p className="text-xs muted mt-2">
                    OCR /
                    文档识别结果可修正。原始文件不变；修改原文不会自动修改已有表格。
                  </p>
                </TabsContent>
              </Tabs>
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(null);
                    setSelected("");
                  }}
                >
                  暂不确认
                </Button>
                <Button onClick={() => void confirm()} disabled={working}>
                  <CheckCircle2 size={15} />
                  确认并查看报告
                  <ArrowRight size={15} />
                </Button>
              </div>
            </>
          )}
        </section>
      </div>
      <Dialog open={paste} onOpenChange={setPaste}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>粘贴运营记录或表格</DialogTitle>
            <DialogDescription>
              CSV / 制表符格式可生成表格；普通文字作为分析依据。最多 15 万字符。
            </DialogDescription>
          </DialogHeader>
          <Input
            aria-label="资料名称"
            value={pastedName}
            maxLength={100}
            onChange={(e) => setPastedName(e.target.value)}
          />
          <Textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            maxLength={150000}
            className="min-h-64"
            placeholder="例如从 Excel 复制包含表头的几列数据，或粘贴运营记录…"
          />
          <Button
            onClick={() => void addText()}
            disabled={working || !pasted.trim()}
          >
            导入并校验
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
