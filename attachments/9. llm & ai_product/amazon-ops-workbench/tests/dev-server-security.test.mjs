import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer as createHttpServer } from "node:http";
import { createServer } from "vite";
import { privateFileAccess } from "../build/dev-server-security.ts";

test("development HTTP routes cannot serve private configuration files", async () => {
  const root = await mkdtemp(join(tmpdir(), "workbench-private-files-test-"));
  const secret = "fixture-only-not-a-real-credential";
  const protectedFiles = [
    ".dev.vars", ".dev.vars.local", ".dev.vars.backup",
    "nested/.dev.vars.production", ".env", ".env.local", "private.pem", ".git/config",
  ];
  let vite;
  let http;
  try {
    for (const file of protectedFiles) {
      await mkdir(join(root, file, ".."), { recursive: true });
      await writeFile(join(root, file), secret);
    }
    await writeFile(join(root, "ordinary.txt"), "ordinary project asset");
    vite = await createServer({
      root, configFile: false, envFile: false, publicDir: false, logLevel: "silent",
      cacheDir: join(root, ".cache"),
      server: { middlewareMode: true, watch: null, fs: privateFileAccess },
    });
    http = createHttpServer(vite.middlewares);
    await new Promise((resolve, reject) => {
      http.once("error", reject);
      http.listen(0, "127.0.0.1", resolve);
    });
    const origin = `http://127.0.0.1:${http.address().port}`;
    for (const file of protectedFiles) {
      const absolute = join(root, file).replaceAll("\\", "/");
      for (const path of [`/${file}`, `/@fs/${absolute}`]) {
        const response = await fetch(`${origin}${path}`);
        assert.equal(response.status, 403, path);
        assert.equal((await response.text()).includes(secret), false, path);
      }
    }
    for (const path of [
      "/%2edev%2evars", "/.dev.vars?raw", "/.dev.vars?url", "/.dev.vars?import",
      `/@fs/${root}/%2edev%2evars?raw`,
    ]) {
      const response = await fetch(`${origin}${path}`);
      assert.equal(response.status, 403, path);
      assert.equal((await response.text()).includes(secret), false, path);
    }
    const asset = await fetch(`${origin}/ordinary.txt`);
    assert.equal(asset.status, 200);
    assert.equal(await asset.text(), "ordinary project asset");
  } finally {
    if (http?.listening) {
      http.closeAllConnections();
      await new Promise((resolve, reject) => http.close(error => error ? reject(error) : resolve()));
    }
    if (vite) await vite.close();
    await rm(root, { recursive: true, force: true });
  }
});
