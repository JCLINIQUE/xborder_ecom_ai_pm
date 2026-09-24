import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, stat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier)) {
    try { return next(specifier, context); } catch { return next(`${specifier}.ts`, context); }
  }
  return next(specifier, context);
} });
const { localModelConfig } = await import("../build/local-model-config.ts");
async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), "day09-local-config-test-"));
  let handler;
  localModelConfig().configureServer({ config: { root }, middlewares: { use(fn) { handler = fn; } }, restart: async () => {} });
  const request = async (input, headers = {}) => {
    const req = Readable.from([JSON.stringify(input)]);
    req.url = "/__local/model-config"; req.method = "POST";
    req.headers = { host: "localhost:5173", origin: "http://localhost:5173", "content-type": "application/json", "oai-authenticated-user-id": "local_seedy", ...headers };
    req.socket = { remoteAddress: "127.0.0.1" };
    let status, body;
    await handler(req, { writeHead(s) { status = s; }, end(text) { body = JSON.parse(text); } }, () => assert.fail("unhandled"));
    return { status, body };
  };
  try { await run(root, request); } finally { await rm(root, { recursive: true, force: true }); }
}
const input = { provider: "deepseek", model: "deepseek-flash", key: "fake-test-only-key" };
test("saves only local configuration with private permissions and a reload revision", async () => fixture(async (root, request) => {
  await writeFile(join(root, ".dev.vars"), "UNRELATED=value\nDEEPSEEK_API_KEY=old-fake-key\n");
  const result = await request(input);
  assert.equal(result.status, 200);
  assert.ok(result.body.revision);
  assert.equal(JSON.stringify(result).includes(input.key), false);
  const file = await readFile(join(root, ".dev.vars"), "utf8");
  assert.ok(file.includes("UNRELATED=value"));
  assert.ok(file.includes(`MODEL_CONFIG_REVISION=${result.body.revision}`));
  assert.equal(file.match(/DEEPSEEK_API_KEY=/g).length, 1);
  assert.equal((await stat(join(root, ".dev.vars"))).mode & 0o777, 0o600);
}));
test("preserves an existing env setup instead of creating an overriding dev.vars", async () => fixture(async (root, request) => {
  await writeFile(join(root, ".env"), "UNRELATED=value\n");
  const result = await request(input);
  assert.equal(result.body.fileName, ".env.local");
  await assert.rejects(stat(join(root, ".dev.vars")), { code: "ENOENT" });
  assert.equal(await readFile(join(root, ".env"), "utf8"), "UNRELATED=value\n");
}));
test("rejects cross-origin requests, unauthenticated callers and invalid keys", async () => fixture(async (_root, request) => {
  assert.equal((await request(input, { origin: "https://other.invalid" })).status, 403);
  assert.equal((await request(input, { "oai-authenticated-user-id": "" })).status, 403);
  assert.equal((await request({ ...input, key: "bad\nINJECTED=yes" })).status, 400);
}));
