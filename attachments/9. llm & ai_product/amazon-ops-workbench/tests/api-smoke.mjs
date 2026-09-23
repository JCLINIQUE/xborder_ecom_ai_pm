import assert from "node:assert/strict";
import { newWorkspace, makeReport } from "../lib/ops/domain.ts";
const root = "http://localhost:5173";
async function call(path, init = {}) {
  const r = await fetch(root + path, init);
  const text = await r.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: r.status, body };
}
assert.equal((await call("/api/workspaces")).status, 401);
const sign = await fetch(root + "/signin-with-chatgpt?return_to=/", {
  redirect: "manual",
});
assert.equal(sign.status, 302);
const cookie = sign.headers.get("set-cookie").split(";")[0];
const headers = {
  Cookie: cookie,
  "Content-Type": "application/json",
  Origin: root,
};
const w = newWorkspace();
w.id = "ops-smoke-test-20260923";
w.name = "临时接口验证（测试结束后删除）";
const create = await call("/api/workspaces", {
  method: "POST",
  headers,
  body: JSON.stringify(w),
});
assert.equal(create.status, 200, JSON.stringify(create.body));
console.log("TEST_WORKSPACE_ID=" + w.id);
const fileText = "temporary upload smoke test, not business data";
const form = new FormData();
form.append("workspaceId", w.id);
form.append(
  "file",
  new File([fileText], "test-only.txt", { type: "text/plain" }),
);
const uploaded = await call("/api/files", {
  method: "POST",
  headers: { Cookie: cookie, Origin: root },
  body: form,
});
assert.equal(uploaded.status, 200, JSON.stringify(uploaded.body));
console.log("TEST_FILE_ID=" + uploaded.body.fileId);
const fileResponse = await fetch(root + "/api/files/" + uploaded.body.fileId, {
  headers: { Cookie: cookie },
});
assert.equal(fileResponse.status, 200);
assert.equal(await fileResponse.text(), fileText);
assert.equal((await call("/api/files/" + uploaded.body.fileId)).status, 401);
w.sources = [
  {
    id: "smoke-source",
    name: "合成验证记录",
    kind: "text",
    fileId: uploaded.body.fileId,
    hash: "smoke-test-only",
    text: "仅用于接口自动化验证，不是运营数据。",
    tables: [],
    confirmed: true,
    warnings: [],
    market: "US",
    currency: "USD",
    createdAt: new Date().toISOString(),
  },
];
w.report = makeReport(w);
const save = await call("/api/workspaces/" + w.id, {
  method: "PUT",
  headers,
  body: JSON.stringify({ workspace: w, revision: 0 }),
});
assert.equal(save.status, 200, JSON.stringify(save.body));
assert.equal(save.body.revision, 1);
const restored = await call("/api/workspaces/" + w.id, { headers });
assert.equal(restored.body.workspace.report, w.report);
assert.equal(restored.body.workspace.sources[0].text, w.sources[0].text);
const conflict = await call("/api/workspaces/" + w.id, {
  method: "PUT",
  headers,
  body: JSON.stringify({ workspace: w, revision: 0 }),
});
assert.equal(conflict.status, 409);
assert.equal((await call("/api/workspaces/" + w.id)).status, 401);
assert.equal(
  (
    await call("/api/workspaces/" + w.id, {
      method: "PUT",
      headers: { ...headers, Origin: "https://not-authorized.invalid" },
      body: JSON.stringify({ workspace: w, revision: 1 }),
    })
  ).status,
  403,
);
assert.equal(
  (
    await call("/api/connectors", {
      method: "POST",
      headers,
      body: JSON.stringify({ url: "http://127.0.0.1/secret" }),
    })
  ).status,
  403,
);
assert.equal(
  (
    await call("/api/ai", {
      method: "POST",
      headers,
      body: JSON.stringify({ workspaceId: w.id, key: "", kind: "analysis" }),
    })
  ).status,
  400,
);
console.log(
  "PASS: auth, create, original upload/download, file authorization, save, restore, optimistic conflict, CSRF, connector deny, missing AI credentials",
);
