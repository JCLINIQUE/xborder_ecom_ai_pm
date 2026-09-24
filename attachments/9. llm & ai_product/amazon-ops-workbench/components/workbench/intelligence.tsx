"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Download,
  FileText,
  KeyRound,
  Printer,
  Save,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { apiRequest, useWorkspace } from "@/lib/ops/workspace-context";
import { scopeLabel, makeReport } from "@/lib/ops/domain";
import { download, exportReport } from "@/lib/ops/export";
import { Choice, Empty, PanelHeading } from "./primitives";
import { toast } from "sonner";

export function ConnectionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const ops = useWorkspace();
  const [attempted, setAttempted] = useState(false);
  const [action, setAction] = useState<"save" | "test" | null>(null);
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  const [localSave, setLocalSave] = useState(false);
  const connectionIssue = ops.connectionIssue;
  useEffect(() => {
    if (open) void apiRequest<{ available: boolean }>("/__local/model-config")
      .then(result => setLocalSave(result.available)).catch(() => setLocalSave(false));
  }, [open]);
  function clearFeedback() { setNotice(""); setFailure(""); }
  async function testConnection() {
    setAttempted(true);
    if (connectionIssue) return;
    setAction("test"); setNotice(""); setFailure("");
    try {
      await apiRequest("/api/model-config/test", {
        method: "POST", body: JSON.stringify({ ...ops.connection, key: ops.key.trim() || undefined }),
      });
      setNotice("连接测试成功，模型已实际返回回复。可以生成分析。 " );
    } catch (error) { setFailure((error as Error).message); }
    finally { setAction(null); }
  }
  async function saveLocally() {
    setAttempted(true);
    if (connectionIssue || !ops.key.trim()) return;
    setAction("save"); setNotice(""); setFailure("");
    try {
      const saved = await apiRequest<{ revision: string; fileName: string }>("/__local/model-config", {
        method: "POST", body: JSON.stringify({ ...ops.connection, key: ops.key.trim() }),
      });
      setNotice(`已保存到本机 ${saved.fileName}，正在加载本地配置…`);
      let loaded = false;
      for (let attempt = 0; attempt < 15; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          const config = await ops.refreshModelConfig();
          if (config.revision === saved.revision && config.providers[ops.connection.provider].configured) { loaded = true; break; }
        } catch { /* Development server is restarting to load the private file. */ }
      }
      if (loaded) ops.setKey("");
      setNotice(loaded ? "已保存到本机并加载成功，刷新后也可使用。" : "文件已保存；服务重新启动后生效。");
    } catch (error) { setFailure((error as Error).message); }
    finally { setAction(null); }
  }
  return (
    <Dialog open={open} onOpenChange={value => { if (!action) onOpenChange(value); }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>模型连接</DialogTitle>
          <DialogDescription>
            可使用本机保存的密钥，也可临时填写。接口地址已自动配置。
          </DialogDescription>
        </DialogHeader>
        <label className="field-label">
          模型服务
          <Choice
            label="模型服务"
            disabled={!!action}
            value={ops.connection.provider}
            onChange={(v) => {
              clearFeedback();
              ops.setKey("");
              ops.setConnection({
                provider: v as "deepseek" | "qwen",
                model: ops.modelConfig?.providers[v as "deepseek" | "qwen"].model || "",
              });
            }}
            options={[
              { value: "deepseek", label: "DeepSeek API" },
              { value: "qwen", label: "阿里云百炼（北京地域）" },
            ]}
          />
        </label>
        <label className="field-label">
          模型名称
          <Input
            value={ops.connection.model}
            disabled={!!action}
            maxLength={100}
            onChange={(e) => { clearFeedback(); ops.setConnection({ ...ops.connection, model: e.target.value }); }}
            placeholder="填写服务商提供的模型 ID，不是 API 网址"
          />
        </label>
        <label className="field-label">
          API Key
          <Input
            type="password"
            autoComplete="off"
            maxLength={500}
            value={ops.key}
            disabled={!!action}
            onChange={(e) => { clearFeedback(); ops.setKey(e.target.value); }}
            placeholder={ops.hasServerKey ? "本机密钥已配置；留空使用本机密钥" : "填写服务商密钥，不是 API 网址"}
          />
        </label>
        <p className="text-sm muted leading-6">
          {ops.hasServerKey ? "已检测到服务端密钥，浏览器不会读取密钥内容。" : "尚未配置本机密钥。"}
          {localSave && " 点击「保存到本机」将写入 Git 忽略的 .dev.vars；已有 .env 配置时沿用 .env.local。也可直接编辑文件。"}
          {" "}临时填写的密钥刷新后清空；密钥不写入报告或下载文件。
        </p>
        <a
          className="text-xs text-primary underline"
          href={
            ops.connection.provider === "deepseek"
              ? "https://api-docs.deepseek.com/"
              : "https://help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope"
          }
          target="_blank"
          rel="noreferrer"
        >
          查看服务商模型说明 ↗
        </a>
        {attempted && connectionIssue && (
          <p role="alert" className="text-sm text-destructive">{connectionIssue}</p>
        )}
        {failure && <p role="alert" className="text-sm text-destructive">{failure}</p>}
        {notice && <p role="status" className="text-sm">{notice}</p>}
        <p className="text-sm text-muted-foreground">测试连接只发送一句“回复 OK”，不发送导入资料，可能产生少量 API 费用。</p>
        <div className="flex flex-wrap gap-2">
          {localSave && <Button variant="outline" disabled={!!action || !ops.key.trim()} onClick={() => void saveLocally()}>{action === "save" ? "正在保存…" : "保存到本机"}</Button>}
          <Button variant="outline" disabled={!!action} onClick={() => void testConnection()}>{action === "test" ? "正在测试…" : "测试连接"}</Button>
        <Button disabled={!!action} onClick={() => {
          setAttempted(true);
          if (connectionIssue) return;
          ops.setKey(ops.key.trim());
          ops.setConnection({ ...ops.connection, model: ops.connection.model.trim() });
          setAttempted(false);
          onOpenChange(false);
          toast.success("模型配置已应用。可通过「测试连接」验证，或生成分析。");
        }}>使用此配置</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AnalysisPanel({
  focus = "",
  onSettings,
  onReport,
  onImport,
}: {
  focus?: string;
  onSettings: () => void;
  onReport: () => void;
  onImport: () => void;
}) {
  const ops = useWorkspace(),
    w = ops.workspace,
    [question, setQuestion] = useState(""),
    [consent, setConsent] = useState(false);
  const connectionIssue = ops.connectionIssue;
  if (!w?.sources.some((s) => s.confirmed))
    return (
      <Empty
        title="先导入并确认资料"
        description="AI 会分析你确认过的表格或文字，不会生成模拟结论。"
        onImport={onImport}
      />
    );
  async function run() {
    try {
      await ops.analyze(
        "analysis",
        [focus, question].filter(Boolean).join("\n"),
      );
      toast.success("分析完成，可以直接修改或下载。");
    } catch (e) {
      ops.notifyError(e);
    }
  }
  return (
    <div className="space-y-5">
      <PanelHeading
        title="AI 分析"
        description="修改分析要求 → 生成分析 → 人工修改 → 下载或用于日报。"
      >
        <Button size="sm" variant="outline" onClick={onSettings}>
          <KeyRound size={14} />
          {ops.key || ops.hasServerKey ? "模型连接" : "连接 AI"}
        </Button>
      </PanelHeading>
      <section className="panel">
        <div className="scope-box">
          <span>本次分析使用</span>
          <strong>{scopeLabel(w)}</strong>
          {focus && <p>已选内容：{focus}</p>}
        </div>
        <label className="field-label">
          分析要求 / Prompt
          <Textarea
            value={w.prompt}
            maxLength={12000}
            onChange={(e) =>
              ops.update((w) => ({ ...w, prompt: e.target.value }))
            }
            className="min-h-32 leading-7"
          />
        </label>
        <label className="field-label">
          这一次补充的问题（选填）
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={1500}
            placeholder="例如：重点看广告花费上涨，但销售没有同步增长的原因。"
            className="min-h-20"
          />
        </label>
        <label className="consent-row">
          <Checkbox
            checked={consent}
            onCheckedChange={(v) => setConsent(v === true)}
          />
          <span>
            允许把所选表格摘要、最多 100
            行明细和已确认文字发送给所选模型服务，可能产生 API 费用。
          </span>
        </label>
        <Button
          disabled={ops.busy || !consent || !!connectionIssue}
          onClick={() => void run()}
        >
          <Sparkles size={15} />
          {ops.busy ? "正在分析…" : "生成分析"}
        </Button>
        {connectionIssue && <p className="text-sm text-muted-foreground mt-3">{connectionIssue}</p>}
        {ops.analysisError && <p role="alert" className="text-sm text-destructive mt-3">{ops.analysisError}</p>}
        {!connectionIssue && !consent && <p className="text-sm text-muted-foreground mt-3">勾选上方发送许可后，即可生成分析。</p>}
        {connectionIssue && (
          <Button variant="link" onClick={onSettings}>
            先填写模型连接
          </Button>
        )}
      </section>
      {!w.analyses.length ? (
        <section className="panel empty-analysis">
          <Sparkles size={23} />
          <p>生成后，分析结果会出现在这里；正文可直接修改。</p>
        </section>
      ) : (
        w.analyses
          .slice()
          .reverse()
          .map((a) => (
            <section className="panel" key={a.id}>
              <PanelHeading
                title="分析结果"
                description={
                  new Date(a.createdAt).toLocaleString("zh-CN") +
                  " · " +
                  a.model +
                  (a.edited ? " · 已人工编辑" : " · AI 初稿")
                }
              >
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!a.content.trim()}
                  onClick={() =>
                    download(
                      `分析-${w.reportDate}.md`,
                      `# 运营分析\n\n范围：${a.scope}\n状态：${a.edited ? "已人工修改" : "AI 初稿"}\n\n${a.content}`,
                      "text/markdown;charset=utf-8",
                    )
                  }
                >
                  <Download size={14} />
                  下载分析
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    ops.update((w) => ({
                      ...w,
                      report: w.report
                        ? w.report + "\n\n## 分析补充\n" + a.content
                        : makeReport({ ...w, analyses: [a] }),
                      reportDataVersion: a.dataVersion,
                    }));
                    onReport();
                  }}
                >
                  <FileText size={14} />
                  用于日报
                  <ArrowRight size={14} />
                </Button>
              </PanelHeading>
              {a.dataVersion !== w.dataVersion && (
                <div className="warning-note">
                  数据已发生变化，请核对这份较早的分析。
                </div>
              )}
              <Textarea
                aria-label="可编辑的分析结果"
                value={a.content}
                maxLength={50000}
                className="analysis-editor"
                onChange={(e) =>
                  ops.update((w) => ({
                    ...w,
                    analyses: w.analyses.map((x) =>
                      x.id === a.id
                        ? { ...x, content: e.target.value, edited: true }
                        : x,
                    ),
                  }))
                }
              />
              <p className="text-xs muted mt-3">
                来源：
                {a.sourceIds
                  .map((id) => w.sources.find((s) => s.id === id)?.name ?? id)
                  .join("、")}{" "}
                · 修改自动保存
              </p>
            </section>
          ))
      )}
    </div>
  );
}

export function DailyReport({
  onImport,
  onSettings,
}: {
  onImport: () => void;
  onSettings: () => void;
}) {
  const ops = useWorkspace(),
    w = ops.workspace,
    [confirm, setConfirm] = useState<"local" | "ai" | null>(null),
    [consent, setConsent] = useState(false);
  const connectionIssue = ops.connectionIssue;
  if (!w)
    return (
      <Empty
        title="先导入一份资料"
        description="随后可以生成日报，或把已有分析整理成可编辑、可下载的正文。"
        onImport={onImport}
      />
    );
  async function generate() {
    if (!confirm || !w) return;
    try {
      if (confirm === "ai") await ops.analyze("report");
      else {
        ops.update((w) => ({
          ...w,
          report: makeReport(w),
          reportDataVersion: w.dataVersion,
        }));
        await ops.flush();
      }
      setConfirm(null);
      toast.success("草稿已生成，可以继续修改。");
    } catch (e) {
      ops.notifyError(e);
    }
  }
  return (
    <div className="space-y-5">
      <div className="no-print">
        <PanelHeading
          title="日报导出"
          description="生成草稿，修改正文，再下载最终版本。"
        />
        <section className="panel mb-5">
          <div className="flex flex-wrap gap-4 items-end">
            <label className="field-label flex-1">
              报告标题
              <Input
                value={w.name}
                maxLength={100}
                onChange={(e) => {
                  if (e.target.value.trim())
                    ops.update((w) => ({ ...w, name: e.target.value }));
                }}
              />
            </label>
            <label className="field-label">
              日期
              <Input
                type="date"
                value={w.reportDate}
                onChange={(e) =>
                  ops.update((w) => ({ ...w, reportDate: e.target.value }))
                }
              />
            </label>
          </div>
          <label className="field-label">
            日报要求 / Prompt
            <Textarea
              value={w.reportPrompt}
              maxLength={12000}
              onChange={(e) =>
                ops.update((w) => ({ ...w, reportPrompt: e.target.value }))
              }
              className="min-h-24 leading-7"
            />
          </label>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              onClick={() => setConfirm("ai")}
              disabled={!w.sources.some((s) => s.confirmed) || ops.busy}
            >
              <Sparkles size={15} />
              生成日报
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirm("local")}
              disabled={!w.sources.some((s) => s.confirmed) || ops.busy}
            >
              不调用 AI，先整理数据摘要
            </Button>
          </div>
        </section>
        <section className="panel">
          <PanelHeading
            title="日报正文"
            description="可以直接修改；下载的是当前编辑版本。"
          >
            <Button
              variant="outline"
              size="sm"
              disabled={!w.report.trim()}
              onClick={() => exportReport(w, "md")}
            >
              <Download size={14} />
              Markdown
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!w.report.trim()}
              onClick={() => exportReport(w, "html")}
            >
              HTML
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!w.report.trim()}
              onClick={() => window.print()}
            >
              <Printer size={14} />
              PDF
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                void ops
                  .flush()
                  .then(() => toast.success("已保存"))
                  .catch(ops.notifyError)
              }
            >
              <Save size={14} />
              保存
            </Button>
          </PanelHeading>
          {w.reportDataVersion !== null &&
            w.reportDataVersion !== w.dataVersion && (
              <div className="warning-note">
                资料已更新，导出前请检查日报是否需要重新生成。
              </div>
            )}
          <Tabs defaultValue="edit">
            <TabsList>
              <TabsTrigger value="edit">编辑</TabsTrigger>
              <TabsTrigger value="preview">预览</TabsTrigger>
            </TabsList>
            <TabsContent value="edit">
              <Textarea
                className="report-editor"
                aria-label="日报正文"
                value={w.report}
                maxLength={100000}
                onChange={(e) =>
                  ops.update((w) => ({ ...w, report: e.target.value }))
                }
                placeholder="生成日报、从分析页带入内容，或直接写下今天的经营情况…"
              />
            </TabsContent>
            <TabsContent value="preview">
              <article className="report-body">
                <pre>{w.report || "还没有日报内容"}</pre>
              </article>
            </TabsContent>
          </Tabs>
        </section>
      </div>
      <article className="print-only report-body">
        <pre>{w.report}</pre>
      </article>
      <Dialog
        open={!!confirm}
        onOpenChange={(v) => {
          if (!v) setConfirm(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm === "ai" ? "生成日报" : "整理数据摘要"}
            </DialogTitle>
            <DialogDescription>
              {w.report
                ? "将替换现有正文；如果想保留当前版本，请先下载。"
                : "生成后仍可修改，下载前请检查。"}{" "}
            </DialogDescription>
          </DialogHeader>
          {confirm === "ai" ? (
            <>
              <p className="text-sm leading-7">
                使用本页的日报 Prompt、已确认资料以及你修改过的分析结果。
              </p>
              <label className="consent-row">
                <Checkbox
                  checked={consent}
                  onCheckedChange={(v) => setConsent(v === true)}
                />
                <span>
                  允许将上述内容发送给所选模型服务，可能产生 API 费用。
                </span>
              </label>
              {connectionIssue && <p className="text-sm text-muted-foreground">{connectionIssue}</p>}
              {ops.analysisError && <p role="alert" className="text-sm text-destructive">{ops.analysisError}</p>}
              {!connectionIssue && !consent && <p className="text-sm text-muted-foreground">勾选上方发送许可后，即可生成日报。</p>}
              {connectionIssue && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setConfirm(null);
                    onSettings();
                  }}
                >
                  先连接 AI
                </Button>
              )}
            </>
          ) : (
            <p className="text-sm leading-7">
              不调用模型，只把真实数据和已有分析整理为可编辑模板。这不是 AI
              分析。
            </p>
          )}
          <Button
            disabled={
              ops.busy ||
              (confirm === "ai" &&
                (!consent || !!connectionIssue))
            }
            onClick={() => void generate()}
          >
            {ops.busy ? "正在生成…" : w.report ? "确认替换并生成" : "开始生成"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
