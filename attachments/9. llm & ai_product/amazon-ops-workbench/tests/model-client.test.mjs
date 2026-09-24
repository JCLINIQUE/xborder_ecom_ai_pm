import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier)) {
    try { return next(specifier, context); } catch { return next(`${specifier}.ts`, context); }
  }
  return next(specifier, context);
} });
const { completeModel, modelConfigStatus, resolveModelConfig } = await import("../lib/server/model-client.ts");
const config = { provider: "deepseek", model: "deepseek-flash", key: "test-only-fake-key" };
const messages = [{ role: "user", content: "synthetic test" }];
const response = (content = "OK", finish_reason = "stop") => Response.json({ choices: [{ message: { content }, finish_reason }] });

test("external cancellation prevents a request or rejects late output", async () => {
  const before = new AbortController(); before.abort();
  let called = false;
  await assert.rejects(() => completeModel(config, messages, { signal: before.signal, fetcher: async () => { called = true; return response(); } }), e => e.status === 499);
  assert.equal(called, false);
  const late = new AbortController();
  await assert.rejects(() => completeModel(config, messages, { signal: late.signal, fetcher: async () => { late.abort(); return response("late result"); } }), e => e.status === 499);
});

test("local keys stay server-side; temporary keys override only their selected provider", () => {
  const env = { DEEPSEEK_API_KEY: "local-deepseek-key", DEEPSEEK_MODEL: "deepseek-flash", QWEN_API_KEY: "local-qwen-key" };
  const status = modelConfigStatus(env);
  assert.equal(status.providers.deepseek.configured, true);
  assert.equal(JSON.stringify(status).includes("local-deepseek-key"), false);
  assert.equal(resolveModelConfig(env, { provider: "deepseek" }).key, "local-deepseek-key");
  assert.equal(resolveModelConfig(env, { provider: "qwen" }).key, "local-qwen-key");
  assert.equal(resolveModelConfig(env, { provider: "deepseek", key: "temporary-key" }).key, "temporary-key");
  assert.throws(() => resolveModelConfig({}, { provider: "deepseek" }), /API Key/);
  assert.throws(() => resolveModelConfig(env, { provider: "deepseek", model: "deepseek_flash" }), /短横线/);
});

test("uses Workers-compatible manual redirects, disables thinking and returns final content", async () => {
  const result = await completeModel(config, messages, { fetcher: async (url, init) => {
    assert.equal(url, "https://api.deepseek.com/chat/completions");
    assert.equal(init.redirect, "manual");
    assert.equal(new Headers(init.headers).get("Authorization"), `Bearer ${config.key}`);
    assert.deepEqual(JSON.parse(init.body).thinking, { type: "disabled" });
    return response();
  } });
  assert.deepEqual(result, { content: "OK", truncated: false });
});

test("never follows a redirect or exposes provider bodies and credentials", async () => {
  let calls = 0;
  await assert.rejects(completeModel(config, messages, { fetcher: async () => {
    calls++; return new Response("secret-key", { status: 302, headers: { Location: "https://untrusted.invalid" } });
  } }), error => error.status === 502 && /重定向/.test(error.message));
  assert.equal(calls, 1);
  for (const status of [400, 401, 402, 403, 404, 429, 500]) {
    await assert.rejects(completeModel(config, messages, { fetcher: async () => new Response(config.key, { status }) }), error =>
      error.status === (status === 429 ? 429 : 502) && !error.message.includes(config.key));
  }
});

test("reports network, invalid JSON and reasoning-only replies clearly", async () => {
  await assert.rejects(completeModel(config, messages, { fetcher: async () => { throw new TypeError(config.key); } }), /无法连接模型服务/);
  await assert.rejects(completeModel(config, messages, { fetcher: async () => new Response("not-json") }), /无法读取/);
  await assert.rejects(completeModel(config, messages, { fetcher: async () => response("", "length") }), /正文前/);
  assert.equal((await completeModel(config, messages, { fetcher: async () => response("partial", "length") })).truncated, true);
});

test("timeout also covers reading the response body", async () => {
  await assert.rejects(completeModel(config, messages, { timeoutMs: 10, fetcher: async (_url, init) => ({
    ok: true, status: 200,
    json: async () => { await new Promise(resolve => setTimeout(resolve, 30)); init.signal.throwIfAborted(); },
  }) }), error => error.status === 504 && /超时/.test(error.message));
});
