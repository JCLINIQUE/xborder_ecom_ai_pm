import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { Miniflare } from "miniflare";
test("actual Workers runtime rejects old redirect mode and completes the fixed model request", async () => {
  const bundle = await build({ bundle: true, write: false, format: "esm", platform: "browser", stdin: {
    resolveDir: process.cwd(), loader: "ts", contents: `
      import { completeModel, resolveModelConfig } from './lib/server/model-client.ts';
      export default { async fetch() {
        let rejected = false;
        try { new Request('https://api.deepseek.com/chat/completions', { redirect: 'error' }); }
        catch (e) { rejected = e instanceof TypeError; }
        const config = resolveModelConfig({ DEEPSEEK_API_KEY: 'fake-runtime-test-key' }, { provider: 'deepseek' });
        let protectedRequest = false;
        const result = await completeModel(config, [{ role: 'user', content: 'test' }], {
          fetcher: async (url, init) => {
            const request = new Request(url, init);
            protectedRequest = request.redirect === 'manual' && request.headers.get('Authorization') === 'Bearer fake-runtime-test-key';
            return Response.json({ choices: [{ message: { content: 'synthetic-success' }, finish_reason: 'stop' }] });
          }
        });
        return Response.json({ rejected, protectedRequest, content: result.content });
      }};
    `,
  } });
  const mf = new Miniflare({ modules: true, script: bundle.outputFiles[0].text, compatibilityDate: "2026-05-15", compatibilityFlags: ["nodejs_compat"] });
  try {
    const response = await mf.dispatchFetch("http://localhost/");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { rejected: true, protectedRequest: true, content: "synthetic-success" });
  } finally { await mf.dispose(); }
});
