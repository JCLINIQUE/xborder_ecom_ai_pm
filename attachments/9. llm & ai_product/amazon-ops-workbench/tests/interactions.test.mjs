import { test } from "node:test";
import assert from "node:assert/strict";
import { interactionSchema, acceptProposal, parseInteractionCommand, planSchema, workflowSteps, runInteractionSteps } from "../lib/ops/interactions.ts";
import { newWorkspace, workspaceSchema } from "../lib/ops/domain.ts";
const makeRun = () => ({ id: "test", goal: "synthetic", source: "confirmed", retryOnce: false, status: "planned", artifact: "", review: "", base: "before", dataVersion: 1, error: "", steps: workflowSteps(interactionSchema.parse({}).workflow, false) });
test("old saved workspaces acquire interaction defaults without changing existing reports", () => {
  const old = newWorkspace(); delete old.interaction; old.report = "existing";
  const parsed = workspaceSchema.parse(old);
  assert.equal(parsed.report, "existing"); assert.equal(parsed.interaction.task, null);
  assert.equal(parsed.interaction.workflow.trigger, "manual");
});
test("selection accepts only the chosen substring and rejects stale text or data", () => {
  const p = { base: "头部\n旧内容\n尾部", result: "新内容", start: 3, end: 6, dataVersion: 2 };
  assert.equal(acceptProposal(p.base, 2, p), "头部\n新内容\n尾部");
  assert.throws(() => acceptProposal("已修改", 2, p), /变化/);
  assert.throws(() => acceptProposal(p.base, 3, p), /变化/);
  assert.throws(() => acceptProposal(p.base, 2, { ...p, end: 100 }), /失效/);
});
test("CLI only permits application commands and plans require bounded writing steps", () => {
  assert.deepEqual(parseInteractionCommand(" /ask 本周 情况 "), { name: "/ask", argument: "本周 情况" });
  assert.throws(() => parseInteractionCommand("rm -rf /"), /未知指令/);
  assert.throws(() => parseInteractionCommand("/draft"), /需要/);
  assert.equal(planSchema.safeParse({ steps: [{ title: "review", instruction: "check", kind: "review" }] }).success, false);
  assert.equal(planSchema.safeParse({ steps: [{ title: "write", instruction: "write", kind: "write" }] }).success, true);
});
test("workflow review branches follow explicit config and source warnings", () => {
  const cfg = interactionSchema.parse({}).workflow;
  assert.equal(workflowSteps(cfg, false)[3].status, "skipped");
  assert.equal(workflowSteps(cfg, true)[3].status, "pending");
  assert.equal(workflowSteps({ ...cfg, review: "never" }, true)[3].status, "skipped");
  assert.equal(workflowSteps({ ...cfg, review: "always" }, false)[3].status, "pending");
});
test("pause preserves completed work; resume does not rerun it or skipped branches", async () => {
  const calls = []; let pause = false;
  const common = { retryOnce: false, signal: new AbortController().signal, persist: async () => {}, perform: async s => { calls.push(s.id); pause = true; return { note: "done" }; } };
  const first = await runInteractionSteps({ ...common, run: makeRun(), shouldPause: () => pause });
  assert.equal(first.status, "paused"); assert.deepEqual(calls, ["source"]);
  const next = await runInteractionSteps({ ...common, run: first, shouldPause: () => false });
  assert.equal(next.status, "review"); assert.deepEqual(calls, ["source", "condition", "draft", "deliver"]);
});
test("retry-once stops after two failures and clears errors after recovery", async () => {
  let calls = 0;
  const options = { run: makeRun(), retryOnce: true, signal: new AbortController().signal, persist: async () => {}, shouldPause: () => false };
  const failed = await runInteractionSteps({ ...options, perform: async () => { calls++; throw new Error("synthetic failure"); } });
  assert.equal(calls, 2); assert.equal(failed.status, "error");
  calls = 0;
  const recovered = await runInteractionSteps({ ...options, perform: async () => { if (!calls++) throw new Error("temporary"); return { artifact: "draft" }; } });
  assert.equal(recovered.status, "review"); assert.equal(recovered.error, ""); assert.equal(recovered.artifact, "draft");
});
test("cancel never retries and retains only previously completed output", async () => {
  const controller = new AbortController(); let calls = 0;
  const stopped = await runInteractionSteps({ run: makeRun(), retryOnce: true, signal: controller.signal, persist: async () => {}, shouldPause: () => false,
    perform: async () => { calls++; controller.abort(); return { artifact: "must not commit" }; } });
  assert.equal(calls, 1); assert.equal(stopped.status, "interrupted"); assert.equal(stopped.artifact, "");
});
