import { test } from "node:test";
import assert from "node:assert/strict";
import { bearerTokenSchema, redactMcpCredentials } from "../lib/server/mcp-auth.ts";

test("Bearer authentication rejects header injection and oversized credentials", () => {
  assert.equal(bearerTokenSchema.parse(" mcp_test_only "), "mcp_test_only");
  assert.equal(bearerTokenSchema.parse(undefined), undefined);
  assert.equal(bearerTokenSchema.parse(""), "");
  for (const value of ["token\r\nX-Injected: yes", "Bearer test", 'test"value', "x".repeat(4097)])
    assert.equal(bearerTokenSchema.safeParse(value).success, false);
});

test("redacts credentials in discovery schemas, arguments and results without corrupting JSON", () => {
  const token = "mcp_fake_test_credential";
  const legacy = 'legacy"\\secret';
  const endpoint = new URL("https://mcp.xydc.com/mcp");
  endpoint.searchParams.set("token", legacy);
  const input = {
    tools: [{ description: `Bearer ${token}`, inputSchema: { default: token } }],
    arguments: { echoed: token },
    result: { [token]: [legacy, endpoint.href, "ordinary data", 42, null, true] },
  };
  const output = redactMcpCredentials(input, endpoint, token);
  const serialized = JSON.stringify(output);
  for (const secret of [token, JSON.stringify(legacy).slice(1, -1), endpoint.href])
    assert.equal(serialized.includes(secret), false);
  assert.deepEqual(JSON.parse(serialized).result["[授权信息已隐藏]"].slice(2), ["ordinary data", 42, null, true]);
  assert.equal(input.arguments.echoed, token);
});
