"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/ops/workspace-context";
import { interactionModes, type InteractionMode } from "@/lib/ops/interactions";
import { Empty } from "../primitives";
import { CoCreation } from "./canvas";
import { Workflow } from "./workflow";
import { Delegation } from "./execution";
import { FileEditor } from "./editor";
import { CommandLine } from "./terminal";
import { InteractionProvider } from "./shared";

export function InteractionLab({ mode, onImport, onSettings }: { mode: InteractionMode; onImport: () => void; onSettings: () => void }) {
  const ops = useWorkspace(), w = ops.workspace;
  const [approval, setApproval] = useState("");
  const signature = `${w?.id}:${w?.dataVersion}:${ops.connection.provider}:${ops.connection.model}`;
  if (!w && (mode === "canvas" || mode === "workflow")) return <div className="studio-start"><h2>{mode === "canvas" ? "创建一张图片画布" : "从空白工作流开始"}</h2><p>{mode === "canvas" ? "上传图片、框选要调整的区域，保存修改要求。" : "拖入节点，配置指令，再连接执行顺序。"}</p><Button onClick={() => void ops.create().catch(ops.notifyError)}>开始{mode === "canvas" ? "共创" : "编排"}</Button></div>;
  if (!w || (!["canvas", "workflow"].includes(mode) && !w.sources.some(s => s.confirmed))) return <Empty title="用同一份资料，体验不同协作方式" description="请先导入并确认资料。切换模式后，资料、正文和修改记录会继续共用。" onImport={onImport} />;
  const current = interactionModes.find(m => m.id === mode)!;
  const consent = approval === signature;
  const immersive = mode !== "form";
  return <div className="interaction-lab">{!immersive && <div className="interaction-lab-heading"><div><small>DAY 09 / AI 交互实验室</small><h1>{current.title}</h1><p>{current.hint}</p></div><Button variant="outline" onClick={onImport}>管理共用资料</Button></div>}
    <div className="interaction-context">{mode === "canvas" ? <span>图片画布 · 原图保留 · 修改要求独立保存</span> : <><span>{w.sources.filter(s => s.confirmed).length} 份已确认资料 · 版本 {w.dataVersion} · 共用报告 {w.report.length} 字</span><label><input type="checkbox" checked={consent} onChange={e => setApproval(e.target.checked ? signature : "")} />允许将当前资料与正文发送至 {ops.connection.provider}，可能产生费用</label></>}</div>
    {mode !== "canvas" && ops.connectionIssue && <div className="warning-note">{ops.connectionIssue}<Button variant="link" onClick={onSettings}>设置模型连接</Button></div>}
    <InteractionProvider key={`${w.id}:${mode}`} value={{ ops, w, consent }}>{mode === "canvas" ? <CoCreation /> : mode === "delegate" ? <Delegation /> : mode === "workflow" ? <Workflow /> : mode === "editor" ? <FileEditor /> : <CommandLine />}</InteractionProvider>
  </div>;
}
