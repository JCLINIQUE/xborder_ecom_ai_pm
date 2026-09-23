"use client";
import { useRef } from "react";
import { ArrowRight, FolderClock, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/ops/workspace-context";
import { workspaceSchema } from "@/lib/ops/domain";
import { PanelHeading } from "./primitives";
import { toast } from "sonner";
export function History({
  onOpen,
  compact = false,
}: {
  onOpen: () => void;
  compact?: boolean;
}) {
  const ops = useWorkspace(),
    input = useRef<HTMLInputElement>(null);
  async function restore(file?: File) {
    if (!file) return;
    try {
      if (file.size > 1500000) throw new Error("备份文件超过 1.5 MB 上限。");
      const raw = JSON.parse(await file.text());
      if (raw.format !== "amazon-ops-workspace" || raw.version !== 1)
        throw new Error("请选择本工作台导出的 JSON 备份。");
      const backup = workspaceSchema.parse(raw.workspace);
      const created = await ops.create();
      ops.update(() => ({
        ...backup,
        id: created.id,
        name: backup.name + " · 恢复",
        sources: backup.sources.map((s) => ({
          ...s,
          fileId: undefined,
          warnings: [
            ...s.warnings,
            "从备份恢复，原始文件需另外导入或回原空间下载。",
          ],
        })),
        updatedAt: new Date().toISOString(),
      }));
      await ops.flush();
      toast.success("已恢复到新工作空间，原空间没有被覆盖。");
      onOpen();
    } catch (e) {
      ops.notifyError(e);
    } finally {
      if (input.current) input.current.value = "";
    }
  }
  return (
    <section className={compact ? "panel" : "space-y-5"}>
      <PanelHeading
        title="恢复上次的工作"
        description="数据、图表、Prompt、分析记录和未完成日报一并恢复。"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => input.current?.click()}
          disabled={ops.busy}
        >
          <Upload size={14} />从 JSON 备份恢复
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void ops.refresh()}>
          刷新
        </Button>
      </PanelHeading>
      <input
        ref={input}
        type="file"
        accept=".json"
        className="sr-only"
        onChange={(e) => void restore(e.target.files?.[0])}
      />
      {ops.loadError ? (
        <div className="warning-note">
          <p>{ops.loadError}</p>
          <a className="underline" href="/signin-with-chatgpt?return_to=/">
            登录并恢复
          </a>
        </div>
      ) : !ops.recent.length ? (
        <div className="empty-recent">
          <FolderClock size={25} />
          <div>
            <strong>暂无已保存的工作空间</strong>
            <p>导入第一份资料后，这里就会留下你的工作记录。</p>
          </div>
        </div>
      ) : (
        <div className="history-list">
          {ops.recent.map((item) => (
            <button
              disabled={ops.busy}
              className="history-item"
              key={item.id}
              onClick={() =>
                void ops.open(item.id).then(onOpen).catch(ops.notifyError)
              }
            >
              <FolderClock size={20} />
              <div>
                <strong>{item.name}</strong>
                <small>
                  {new Date(item.updatedAt).toLocaleString("zh-CN")} ·
                  数据、图表与日报
                </small>
              </div>
              <ArrowRight size={16} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
