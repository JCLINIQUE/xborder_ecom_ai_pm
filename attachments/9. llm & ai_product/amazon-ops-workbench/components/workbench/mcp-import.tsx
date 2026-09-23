"use client";
import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  CloudDownload,
  ExternalLink,
  Plug,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest } from "@/lib/ops/workspace-context";
import {
  MCP_ENDPOINT,
  mcpArguments,
  mcpDefaults,
  type McpDiscovery,
  type McpInputSchema,
  type McpReadResult,
} from "@/lib/ops/mcp";
import { prepareMcpImport } from "@/lib/ops/mcp-import";
import type { Source } from "@/lib/ops/domain";
import { Choice } from "./primitives";

const labels: Record<string, string> = {
  asin: "ASIN",
  asins: "ASIN 列表（每行一个）",
  country: "站点国家码",
  keyword: "关键词",
  keywords: "关键词列表（每行一个）",
  start_date: "开始日期",
  end_date: "结束日期",
  start_month: "开始月份",
  end_month: "结束月份",
  start_week: "开始周内的日期",
  end_week: "结束周内的日期",
  page: "页码",
  page_size: "每页数量",
  sort_field: "排序字段",
  sort_order: "排序方向",
  intent_summary: "本次查询用途（可选）",
  user_task: "要研究的问题（可选）",
};

function QueryField({
  name,
  schema,
  required,
  value,
  onChange,
}: {
  name: string;
  schema: McpInputSchema;
  required: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  const label = labels[name] || schema.title || name;
  const date = /^(start|end)_(date|week)$/.test(name);
  const month = /^(start|end)_month$/.test(name);
  const choices = schema.enum?.every((x) =>
    ["string", "number", "boolean"].includes(typeof x),
  )
    ? schema.enum
    : undefined;
  return (
    <label className="field-label min-w-0">
      <span>
        {label}
        {required && <span className="text-primary"> *</span>}
      </span>
      {choices || schema.type === "boolean" ? (
        <Choice
          label={label}
          value={value}
          onChange={onChange}
          options={[
            { value: "", label: "请选择" },
            ...(choices ?? [true, false]).map((v) => ({
              value: String(v),
              label: typeof v === "boolean" ? (v ? "是" : "否") : String(v),
            })),
          ]}
        />
      ) : schema.type === "array" ||
        schema.type === "object" ||
        !schema.type ? (
        <Textarea
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={16000}
          className="min-h-24"
          placeholder={
            schema.type === "array" && schema.items?.type === "string"
              ? "每行填写一个值"
              : "按数据源要求填写 JSON"
          }
        />
      ) : (
        <Input
          aria-label={label}
          type={
            date
              ? "date"
              : month
                ? "month"
                : schema.type === "integer" || schema.type === "number"
                  ? "number"
                  : "text"
          }
          step={schema.type === "integer" ? 1 : "any"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={8000}
          placeholder={name === "country" ? "例如 US、UK、DE" : undefined}
        />
      )}
      {schema.description && (
        <span className="text-sm font-normal text-muted-foreground leading-6 whitespace-pre-line">
          {schema.description.split("\n")[0]}
        </span>
      )}
    </label>
  );
}

export function McpImport({
  onImport,
  disabled,
}: {
  onImport: (source: Source, file: File) => Promise<void>;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [connectionUrl, setConnectionUrl] = useState("");
  const [discovery, setDiscovery] = useState<McpDiscovery | null>(null);
  const [selected, setSelected] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState<"connect" | "read" | "import" | null>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Awaited<
    ReturnType<typeof prepareMcpImport>
  > | null>(null);
  const abort = useRef<AbortController | null>(null);
  const query = discovery?.tools.find((tool) => tool.name === selected);
  useEffect(() => () => abort.current?.abort(), []);

  function changeOpen(value: boolean) {
    if (busy === "import") return;
    if (!value) {
      abort.current?.abort();
      setConnectionUrl("");
      setDiscovery(null);
      setPreview(null);
      setConsent(false);
      setError("");
    }
    setOpen(value);
  }
  function choose(name: string, tools = discovery?.tools ?? []) {
    setSelected(name);
    setFields(
      mcpDefaults(tools.find((t) => t.name === name)?.inputSchema ?? {}),
    );
    setPreview(null);
    setError("");
    setConsent(false);
  }
  async function connect() {
    setBusy("connect");
    setError("");
    setDiscovery(null);
    setPreview(null);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const result = await apiRequest<McpDiscovery>("/api/mcp", {
        method: "POST",
        body: JSON.stringify({
          action: "list",
          connectionUrl: connectionUrl.trim(),
        }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setDiscovery(result);
      choose(result.tools[0]?.name ?? "", result.tools);
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  async function read() {
    if (!query || !consent) return;
    setBusy("read");
    setError("");
    setPreview(null);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const args = mcpArguments(query.inputSchema, fields);
      const result = await apiRequest<McpReadResult>("/api/mcp", {
        method: "POST",
        body: JSON.stringify({
          action: "read",
          connectionUrl: connectionUrl.trim(),
          tool: selected,
          arguments: args,
          consent: true,
        }),
        signal: controller.signal,
      });
      const prepared = await prepareMcpImport(result);
      if (!controller.signal.aborted) setPreview(prepared);
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  async function importPreview() {
    if (!preview) return;
    setBusy("import");
    setError("");
    try {
      await onImport(preview.source, preview.file);
      setOpen(false);
      setPreview(null);
      setDiscovery(null);
      setConnectionUrl("");
      setConsent(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  const requiredFields = Object.entries(
    query?.inputSchema.properties ?? {},
  ).filter(([key]) => query?.inputSchema.required?.includes(key));
  const optionalFields = Object.entries(
    query?.inputSchema.properties ?? {},
  ).filter(([key]) => !query?.inputSchema.required?.includes(key));
  const renderField = ([name, schema]: [string, McpInputSchema]) => (
    <QueryField
      key={name}
      name={name}
      schema={schema}
      required={!!query?.inputSchema.required?.includes(name)}
      value={fields[name] ?? ""}
      onChange={(v) => {
        setFields((old) => ({ ...old, [name]: v }));
        setPreview(null);
        setConsent(false);
      }}
    />
  );
  const table = preview?.source.tables[0];
  return (
    <>
      <Button
        variant="outline"
        onClick={() => changeOpen(true)}
        disabled={disabled || !!busy}
      >
        <Plug size={15} />
        MCP 数据源
      </Button>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent
          className="sm:max-w-3xl max-h-[90dvh] overflow-y-auto"
          showCloseButton={busy !== "import"}
        >
          <DialogHeader>
            <DialogTitle>MCP 数据源 · 西柚洞察</DialogTitle>
            <DialogDescription>
              连接授权 → 选择查询 →
              预览导入。作为外部资料补充，不替代店铺经营报表。
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <strong className="text-sm">1. 连接数据源</strong>
              <span className="text-sm text-muted-foreground">
                {discovery ? "已连接（本次窗口）" : "待连接"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {MCP_ENDPOINT} · Codex 与此工作台需要分别连接。
            </p>
            <label className="field-label">
              完整 MCP 授权链接
              <Input
                type="password"
                autoComplete="off"
                spellCheck={false}
                maxLength={8192}
                disabled={!!busy}
                value={connectionUrl}
                placeholder="粘贴西柚洞察凭证管理页的完整 MCP 链接"
                onChange={(e) => {
                  setConnectionUrl(e.target.value);
                  setDiscovery(null);
                  setPreview(null);
                  setError("");
                  setConsent(false);
                }}
              />
            </label>
            <p className="text-sm text-muted-foreground leading-6">
              链接含授权码，只在此窗口使用，关闭后清空；不写入资料、Prompt
              或日报。请勿把链接粘贴进查询条件。
            </p>
            <div className="flex gap-3 flex-wrap items-center">
              <Button
                onClick={() => void connect()}
                disabled={!connectionUrl.trim() || !!busy}
              >
                {busy === "connect"
                  ? "连接中…"
                  : discovery
                    ? "重新读取查询清单"
                    : "连接并查看可用查询"}
              </Button>
              <a
                href="https://platform.xydc.com/docs/mcp-access"
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary inline-flex items-center gap-1"
              >
                如何获取授权链接 <ExternalLink size={14} />
              </a>
            </div>
          </div>
          {discovery && !discovery.tools.length && (
            <p className="warning-note">
              连接成功，但这个账号没有本版支持的只读查询。未执行查询，也未导入数据。
            </p>
          )}
          {query && (
            <div className="rounded-lg border p-4 space-y-4">
              <strong className="text-sm">2. 选择要读取的数据</strong>
              <fieldset disabled={!!busy} className="space-y-4 min-w-0">
                <Choice
                  label="查询类型"
                  value={selected}
                  onChange={(v) => choose(v)}
                  options={discovery!.tools.map((t) => ({
                    value: t.name,
                    label: t.title,
                  }))}
                />
                <p className="text-sm leading-6 text-muted-foreground">
                  {query.description.split("\n")[0]}
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {requiredFields.map(renderField)}
                </div>
                {optionalFields.length > 0 && (
                  <details>
                    <summary className="cursor-pointer text-sm text-primary">
                      更多查询条件（选填）
                    </summary>
                    <p className="text-sm text-muted-foreground my-3">
                      填写的条件会发送给西柚洞察。不要提供账户密码、联系方式或其他敏感信息。
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {optionalFields.map(renderField)}
                    </div>
                  </details>
                )}
                <label className="flex items-start gap-3 text-sm leading-6">
                  <Checkbox
                    className="mt-1"
                    checked={consent}
                    onCheckedChange={(v) => setConsent(v === true)}
                  />
                  <span>
                    允许向西柚洞察发送以上查询条件，并消耗该平台相应的查询额度。只读取一次，不自动翻页或重试，不修改店铺数据。
                  </span>
                </label>
                <Button
                  onClick={() => void read()}
                  disabled={!consent || !!busy}
                >
                  <CloudDownload size={16} />
                  {busy === "read" ? "正在读取…" : "读取并预览"}
                </Button>
              </fieldset>
              <p className="text-sm text-muted-foreground">
                本版支持 {discovery!.tools.length}{" "}
                种常用只读查询，其他工具暂不开放。
              </p>
            </div>
          )}
          {error && (
            <p role="alert" className="error-message">
              {error}
            </p>
          )}
          {(busy === "connect" || busy === "read") && (
            <Button
              variant="ghost"
              onClick={() => {
                abort.current?.abort();
                setError(
                  "已取消本次等待，没有导入数据。若查询已到达数据源，仍可能消耗平台额度。",
                );
              }}
            >
              <X size={15} />
              取消等待
            </Button>
          )}
          {preview && (
            <div className="rounded-lg border p-4 space-y-4">
              <div>
                <strong className="text-sm">3. 预览结果</strong>
                <p className="text-sm text-muted-foreground mt-2">
                  {preview.source.name} · {preview.source.tables.length} 张表 ·
                  尚未保存到资料清单
                </p>
              </div>
              {table ? (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {table.columns.slice(0, 6).map((c) => (
                            <TableHead key={c}>{c}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {table.rows.slice(0, 5).map((row, i) => (
                          <TableRow key={i}>
                            {table.columns.slice(0, 6).map((c) => (
                              <TableCell key={c} className="max-w-52 truncate">
                                {String(row[c] ?? "—")}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    仅预览第一张表前 5 行、6
                    列；导入会保留已解析的全部表格。嵌套内容保留为单元格文字，不自动合并统计。
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  返回内容将作为文字资料导入，可在校验页编辑。
                </p>
              )}
              <details>
                <summary className="cursor-pointer text-sm">
                  查看原始响应（未做 AI 分析）
                </summary>
                <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-sm">
                  {preview.raw}
                </pre>
              </details>
              <p className="warning-note text-sm">
                外部流量得分、订单估计等指标不能直接当作店铺实际数据。导入后请检查站点、币种和字段映射，再确认进入报告。
              </p>
              <Button
                onClick={() => void importPreview()}
                disabled={!!busy || disabled}
              >
                <CheckCircle2 size={16} />
                {busy === "import" ? "保存中…" : "导入这份结果，继续核对字段"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
