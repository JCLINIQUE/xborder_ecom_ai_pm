"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { modelConnectionIssue, type ModelConfigStatus } from "./model-connection";
import { type InteractionAction, type InteractionResult, type Proposal } from "./interactions";
import { applyDocumentProposal } from "./workspace-documents";
import {
  newWorkspace,
  type Workspace,
  type Source,
  type Analysis,
} from "./domain";
type Recent = { id: string; name: string; updatedAt: string; revision: number };
export async function apiRequest<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });
  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(
      `服务返回了无法读取的响应 (${response.status})，请稍后重试。`,
    );
  }
  if (!response.ok)
    throw new Error(
      (body as { error?: string }).error || `请求失败 (${response.status})`,
    );
  return body as T;
}
function useWorkspaceEngine() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null),
    [recent, setRecent] = useState<Recent[]>([]),
    [loadError, setLoadError] = useState(""),
    [saveStatus, setSaveStatus] = useState("尚未导入数据"),
    [saveError, setSaveError] = useState(""),
    [busy, setBusy] = useState(false),
    [key, setKey] = useState(""),
    [modelConfig, setModelConfig] = useState<ModelConfigStatus | null>(null),
    [analysisError, setAnalysisError] = useState(""),
    [connection, setConnectionState] = useState<{
      provider: "deepseek" | "qwen";
      model: string;
      userSelected?: boolean;
    }>({ provider: "deepseek", model: "" });
  function setConnection(next: { provider: "deepseek" | "qwen"; model: string }) {
    setConnectionState({ ...next, userSelected: true });
  }
  const refreshModelConfig = useCallback(async () => {
    const config = await apiRequest<ModelConfigStatus>("/api/model-config");
    setModelConfig(config);
    setConnectionState(current => current.userSelected ? {
      ...current, model: current.model || config.providers[current.provider].model,
    } : {
      provider: config.defaultProvider,
      model: config.providers[config.defaultProvider].model,
    });
    return config;
  }, []);
  const hasServerKey = !!modelConfig?.providers[connection.provider].configured;
  const connectionIssue = modelConnectionIssue(connection.model, key, hasServerKey);
  useEffect(() => { void refreshModelConfig().catch(() => {}); }, [refreshModelConfig]);
  const current = useRef<Workspace | null>(null),
    revision = useRef(0),
    generation = useRef(0),
    savedGeneration = useRef(0),
    saving = useRef<Promise<void> | null>(null),
    saveBlocked = useRef(false);
  const refresh = useCallback(async () => {
    try {
      const result = await apiRequest<{ workspaces: Recent[] }>(
        "/api/workspaces",
      );
      setRecent(result.workspaces);
      setLoadError("");
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const replace = useCallback((w: Workspace, rev: number) => {
    current.current = w;
    revision.current = rev;
    generation.current = 0;
    savedGeneration.current = 0;
    saveBlocked.current = false;
    setWorkspace(w);
    setSaveStatus("已保存");
    setSaveError("");
  }, []);
  const flush = useCallback(async function flush(): Promise<void> {
    if (saveBlocked.current)
      throw new Error("保存发生冲突，请先下载备份，再刷新页面恢复资料。");
    if (saving.current) {
      await saving.current;
      if (generation.current !== savedGeneration.current) return flush();
      return;
    }
    const run = async () => {
      while (
        current.current &&
        generation.current !== savedGeneration.current
      ) {
        const snapshot = current.current,
          gen = generation.current;
        setSaveStatus("保存中…");
        try {
          const r = await apiRequest<{ revision: number }>(
            `/api/workspaces/${snapshot.id}`,
            {
              method: "PUT",
              body: JSON.stringify({
                workspace: snapshot,
                revision: revision.current,
              }),
            },
          );
          revision.current = r.revision;
          savedGeneration.current = gen;
          setSaveError("");
          setSaveStatus("已保存");
        } catch (e) {
          const message = (e as Error).message;
          if (message.includes("另一个页面")) saveBlocked.current = true;
          setSaveStatus("保存失败");
          setSaveError(message);
          throw e;
        }
      }
    };
    const job = run();
    saving.current = job;
    try {
      await job;
    } finally {
      saving.current = null;
    }
  }, []);
  const update = useCallback((transform: (w: Workspace) => Workspace) => {
    if (!current.current) return;
    const next = {
      ...transform(current.current),
      updatedAt: new Date().toISOString(),
    };
    current.current = next;
    generation.current++;
    setWorkspace(next);
    setSaveStatus("有未保存修改");
  }, []);
  useEffect(() => {
    if (!workspace || generation.current === savedGeneration.current) return;
    const timer = setTimeout(() => {
      void flush().catch(() => {});
    }, 700);
    return () => clearTimeout(timer);
  }, [workspace, flush]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (generation.current !== savedGeneration.current) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
  async function create() {
    await flush();
    setBusy(true);
    try {
      const w = newWorkspace();
      const r = await apiRequest<{ workspace: Workspace; revision: number }>(
        "/api/workspaces",
        { method: "POST", body: JSON.stringify(w) },
      );
      replace(r.workspace, r.revision);
      await refresh();
      return r.workspace;
    } finally {
      setBusy(false);
    }
  }
  async function open(id: string) {
    await flush();
    setBusy(true);
    try {
      const r = await apiRequest<{ workspace: Workspace; revision: number }>(
        `/api/workspaces/${id}`,
      );
      replace(r.workspace, r.revision);
    } finally {
      setBusy(false);
    }
  }
  async function ensure() {
    return current.current ?? (await create());
  }
  async function addSource(
    source: Source,
    file?: File,
    expectedWorkspaceId?: string,
  ) {
    const w = await ensure();
    if (expectedWorkspaceId && w.id !== expectedWorkspaceId)
      throw new Error("导入期间切换了资料，请恢复原来的资料后重新导入。");
    if (w.sources.some((s) => s.hash === source.hash))
      throw new Error("这份文件已经导入，已阻止重复导入。");
    if (w.sources.length >= 20)
      throw new Error("一份日报最多导入 20 份资料，请新建一份日报。");
    if (file) {
      const data = new FormData();
      data.append("workspaceId", w.id);
      data.append("file", file);
      const result = await apiRequest<{ fileId: string; hash: string }>(
        "/api/files",
        { method: "POST", body: data },
      );
      source = { ...source, fileId: result.fileId, hash: result.hash };
    }
    if (current.current?.id !== w.id)
      throw new Error(
        "上传期间本次资料已切换。原文件已保存到原本次资料，请回原空间重新导入以完成解析记录。",
      );
    update((w) => ({
      ...w,
      sources: [...w.sources, source],
      dataVersion: w.dataVersion + 1,
    }));
    await flush();
    return source.id;
  }
  async function analyze(kind: "analysis" | "report", focus = "") {
    setAnalysisError("");
    if (connectionIssue) { setAnalysisError(connectionIssue); throw new Error(connectionIssue); }
    await flush();
    const w = current.current;
    if (!w) throw new Error("请先导入并确认数据。");
    setBusy(true);
    try {
      const result = await apiRequest<Analysis>("/api/ai", {
        method: "POST",
        body: JSON.stringify({
          workspaceId: w.id,
          key: key.trim() || undefined,
          kind,
          focus,
          provider: connection.provider,
          model: connection.model.trim(),
          expectedRevision: revision.current,
        }),
      });
      if (current.current?.id !== w.id)
        throw new Error("本次资料已切换，本次结果未写入。");
      if (kind === "report" && current.current.report !== w.report) {
        update((w) => ({
          ...w,
          analyses: [
            ...w.analyses,
            {
              ...result,
              scope: result.scope + " · 日报草稿（未覆盖编辑中的正文）",
            },
          ],
        }));
        await flush();
        throw new Error(
          "生成期间你编辑了日报，未覆盖你的修改。新草稿已保存在分析记录中。",
        );
      }
      if (kind === "analysis")
        update((w) => ({ ...w, analyses: [...w.analyses, result] }));
      else
        update((w) => ({
          ...w,
          report: result.content,
          reportDataVersion: result.dataVersion,
        }));
      await flush();
      return result;
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "生成失败，请重试。");
      throw error;
    } finally {
      setBusy(false);
    }
  }
  const notifyError = (e: unknown) =>
    toast.error(e instanceof Error ? e.message : "操作失败，请重试。");
  async function interact(input: {
    action: InteractionAction; instruction: string; draft?: string;
    selection?: { start: number; end: number }; source?: "confirmed" | "mcp";
  }, signal?: AbortSignal, expected?: { id: string; dataVersion: number }): Promise<InteractionResult> {
    if (connectionIssue) throw new Error(connectionIssue);
    await flush();
    const w = current.current;
    if (!w) throw new Error("请先导入并确认资料。");
    if (expected && (w.id !== expected.id || w.dataVersion !== expected.dataVersion))
      throw new Error("资料已切换或变更，请基于当前资料重新开始。");
    signal?.throwIfAborted();
    setBusy(true);
    try {
      const result = await apiRequest<InteractionResult>("/api/interactions", {
        method: "POST", signal,
        body: JSON.stringify({ ...input, workspaceId: w.id, expectedRevision: revision.current,
          key: key.trim() || undefined, provider: connection.provider, model: connection.model }),
      });
      signal?.throwIfAborted();
      if (current.current?.id !== w.id || current.current.dataVersion !== w.dataVersion)
        throw new Error("资料已切换或变更，本次结果未应用。请基于当前资料重新生成。");
      return result;
    } finally { setBusy(false); }
  }
  async function applyInteractionProposal(proposal: Proposal) {
    update(w => applyDocumentProposal(w, proposal));
    await flush();
  }
  return {
    workspace,
    recent,
    loadError,
    saveStatus,
    saveError,
    busy,
    key,
    setKey,
    connection,
    setConnection,
    hasServerKey,
    modelConfig,
    refreshModelConfig,
    connectionIssue,
    analysisError,
    refresh,
    create,
    open,
    ensure,
    update,
    flush,
    addSource,
    analyze,
    interact,
    applyInteractionProposal,
    notifyError,
  };
}
type Engine = ReturnType<typeof useWorkspaceEngine>;
const Context = createContext<Engine | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const value = useWorkspaceEngine();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error("WorkspaceProvider is required");
  return value;
}
