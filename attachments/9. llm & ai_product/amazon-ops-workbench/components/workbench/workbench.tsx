"use client";
import { useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChartNoAxesCombined,
  FileText,
  FolderClock,
  Plus,
  Settings2,
  Sparkles,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { WorkspaceProvider, useWorkspace } from "@/lib/ops/workspace-context";
import { activeDataset } from "@/lib/ops/domain";
import { backup } from "@/lib/ops/export";
import { ImportPanel } from "./import-panel";
import { ReportView } from "./report-view";
import { AnalysisPanel, ConnectionDialog, DailyReport } from "./intelligence";
import { Choice, Empty, PanelHeading } from "./primitives";
import { interactionModes, type InteractionMode } from "@/lib/ops/interactions";
import { InteractionLab } from "./interactions/lab";
type Step = "import" | "data" | "analysis" | "report";
const steps = [
  {
    id: "import",
    name: "数据导入",
    description: "上传文件，确认内容",
    icon: Upload,
  },
  {
    id: "data",
    name: "数据报告",
    description: "查看数据，调整图表",
    icon: BarChart3,
  },
  {
    id: "analysis",
    name: "AI 分析",
    description: "修改要求，编辑结论",
    icon: Sparkles,
  },
  {
    id: "report",
    name: "日报导出",
    description: "编辑日报，下载文件",
    icon: FileText,
  },
] as const;
export function Workbench() {
  return (
    <WorkspaceProvider>
      <MvpWorkbench />
      <Toaster richColors position="top-center" />
    </WorkspaceProvider>
  );
}
function MvpWorkbench() {
  const ops = useWorkspace(),
    w = ops.workspace,
    [step, setStep] = useState<Step>("import"),
    [mode, setMode] = useState<InteractionMode>("form"),
    [settings, setSettings] = useState(false),
    [importSession, setImportSession] = useState(0),
    [focus, setFocus] = useState("");
  const index = steps.findIndex((s) => s.id === step),
    hasData = !!w?.sources.some((s) => s.confirmed),
    dataset = w ? activeDataset(w) : null,
    latest = ops.recent[0];
  function analyze(focus: string) {
    setFocus(focus);
    setStep("analysis");
  }
  if (step === "analysis" && mode !== "form") return (
    <div className={`immersive-workbench immersive-${mode}`}>
      <header className="immersive-toolbar"><strong>{mode === "terminal" ? ">_ AI 分析 / Terminal" : `AI 分析 / ${ { editor: "Editor", workflow: "Workflow", delegate: "Tasks", canvas: "Canvas" }[mode]}`}</strong><div>
        <Choice label="AI 交互方式" value={mode} options={interactionModes.map(m => ({ value: m.id, label: m.title }))} onChange={value => setMode(value as InteractionMode)} />
        <Button variant="ghost" size="sm" onClick={() => setStep("import")}>资料</Button>
        <Button variant="ghost" size="sm" onClick={() => setSettings(true)}>模型连接</Button>
        <Button variant="ghost" size="sm" onClick={() => { setMode("form"); setStep("analysis"); }}>返回步骤式工作台</Button>
      </div></header>
      <main className="immersive-main">
        {ops.saveError && <div role="alert" className="interaction-error">{ops.saveError}<Button variant="ghost" onClick={() => void ops.flush().catch(ops.notifyError)}>重试保存</Button>{w && <Button variant="ghost" onClick={() => backup(w)}>下载备份</Button>}</div>}
        <InteractionLab mode={mode} onSettings={() => setSettings(true)} onImport={() => setStep("import")} />
      </main>
      <footer className="immersive-status"><span>{ops.saveStatus}</span><span>{mode === "terminal" ? "Enter 执行 · ↑ ↓ 历史 · Ctrl+C 停止" : mode === "editor" ? "⌘/Ctrl+K 编辑 · ⌘/Ctrl+S 保存" : "AI 分析 · 共用资料与成果"}</span></footer>
      <ConnectionDialog open={settings} onOpenChange={setSettings} />
    </div>
  );
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "238px" } as React.CSSProperties}
    >
      <Sidebar className="ops-sidebar mvp-sidebar">
        <SidebarHeader className="ops-sidebar-header">
          <div className="brand">
            <span className="brand-icon">
              <ChartNoAxesCombined size={22} />
            </span>
            <div>
              <strong>亚马逊精品运营工作台</strong>
              <small>同一份资料，多种 AI 协作方式</small>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="mvp-sidebar-content">
          <SidebarMenu>
            {steps.map((s, i) => (
              <SidebarMenuItem key={s.id}>
                <SidebarMenuButton
                  isActive={step === s.id}
                  onClick={() => setStep(s.id)}
                  className="mvp-step"
                >
                  <span className="mvp-step-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <strong>{s.name}</strong>
                    <small>{s.description}</small>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="mvp-sidebar-footer">
          <span>
            <Check size={13} />
            {ops.saveStatus}
          </span>
          <p>资料与修改自动保存</p>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0 bg-background">
        <header className="topbar ops-topbar no-print">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden" />
            <strong>{steps[index].name}</strong>
          </div>
          <div className="flex flex-wrap gap-2">
            {step === "analysis" && <Choice label="AI 交互方式" value={mode} options={interactionModes.map(m => ({ value: m.id, label: m.title }))} onChange={value => { setMode(value as InteractionMode); setStep("analysis"); }} />}
            {w && (
              <Button
                variant="ghost"
                size="sm"
                disabled={ops.busy}
                onClick={() =>
                  void ops
                    .create()
                    .then(() => {
                      setFocus("");
                      setImportSession((n) => n + 1);
                      setStep("import");
                    })
                    .catch(ops.notifyError)
                }
              >
                <Plus size={14} />
                新建一份
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettings(true)}
            >
              <Settings2 size={14} />
              模型连接
            </Button>
          </div>
        </header>
        <main className="workspace-main mvp-main">
          {ops.saveError && (
            <div className="error-message no-print mb-4">
              {ops.saveError}
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void ops.flush().catch(ops.notifyError)}
                >
                  重试保存
                </Button>
                {w && (
                  <Button variant="outline" size="sm" onClick={() => backup(w)}>
                    下载当前备份
                  </Button>
                )}
              </div>
            </div>
          )}
          {ops.loadError && (
            <div className="warning-note no-print">
              {ops.loadError}
              <Button
                variant="link"
                size="sm"
                onClick={() => void ops.refresh()}
              >
                重试
              </Button>
            </div>
          )}
          {step === "import" && (
            <>
              <div className="mvp-intro">
                <div>
                  <h1>导入今天要分析的数据</h1>
                  <p>从文件或文字开始。确认内容后，再生成图表、分析和日报。</p>
                </div>
                {latest && latest.id !== w?.id && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      void ops
                        .open(latest.id)
                        .then(() => setStep("data"))
                        .catch(ops.notifyError)
                    }
                    disabled={ops.busy}
                  >
                    <FolderClock size={15} />
                    恢复上次数据
                  </Button>
                )}
              </div>
              <ImportPanel key={importSession} onReport={() => setStep("data")} />
            </>
          )}
          {step === "data" &&
            (dataset ? (
              <ReportView
                mode="overview"
                onImport={() => setStep("import")}
                onAnalyze={analyze}
              />
            ) : hasData ? (
              <div className="space-y-5">
                <PanelHeading
                  title="数据报告"
                  description="这些资料以文字形式呈现，你可以修正内容，再交给 AI 分析。"
                >
                  <Button onClick={() => analyze("")}>
                    <Sparkles size={15} />
                    开始分析
                  </Button>
                </PanelHeading>
                <div className="warning-note">
                  当前没有可绘图的结构化表格。需要图表时，可补充 Excel /
                  CSV，或在导入页把核对后的文字整理成表格。
                </div>
                {w?.sources
                  .filter((s) => s.confirmed)
                  .map((s) => (
                    <section className="panel" key={s.id}>
                      <PanelHeading
                        title={s.name}
                        description="确认后的文字 · 可编辑"
                      />
                      <Textarea
                        value={s.text}
                        maxLength={150000}
                        className="min-h-56 leading-7"
                        onChange={(e) =>
                          ops.update((w) => ({
                            ...w,
                            sources: w.sources.map((x) =>
                              x.id === s.id
                                ? { ...x, text: e.target.value }
                                : x,
                            ),
                            dataVersion: w.dataVersion + 1,
                          }))
                        }
                      />
                    </section>
                  ))}
              </div>
            ) : (
              <Empty
                title="先确认一份资料"
                description="导入后核对原文或字段，即可在这里查看数据报告。"
                onImport={() => setStep("import")}
              />
            ))}
          {step === "analysis" && mode === "form" && (
            <AnalysisPanel
              focus={focus}
              onSettings={() => setSettings(true)}
              onReport={() => setStep("report")}
              onImport={() => setStep("import")}
            />
          )}
          {step === "analysis" && mode !== "form" && <InteractionLab mode={mode} onSettings={() => setSettings(true)} onImport={() => setStep("import")} />}
          {step === "report" && (
            <DailyReport
              onImport={() => setStep("import")}
              onSettings={() => setSettings(true)}
            />
          )}
          {step !== "report" && (
            <div className="mvp-next no-print">
              <span>
                {hasData
                  ? `${w?.sources.filter((s) => s.confirmed).length} 份资料已确认`
                  : "请先导入并确认资料"}
              </span>
              <Button
                disabled={!hasData}
                onClick={() => setStep(steps[index + 1].id)}
              >
                下一步：{steps[index + 1].name}
                <ArrowRight size={15} />
              </Button>
            </div>
          )}
        </main>
      </SidebarInset>
      <ConnectionDialog open={settings} onOpenChange={setSettings} />
    </SidebarProvider>
  );
}
