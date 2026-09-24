import { chmod, lstat, readFile, readdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import type { Plugin } from "vite";
import { modelConnectionIssue } from "../lib/ops/model-connection";

// Only mounted by the local development server, never included in the Worker.
export function localModelConfig(): Plugin {
  return {
    name: "local-model-config",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.split("?")[0] !== "/__local/model-config") return next();
        const send = (status: number, body: unknown) => {
          res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
          res.end(JSON.stringify(body));
        };
        try {
          const host = new URL(`http://${req.headers.host}`);
          if (!["localhost", "127.0.0.1", "[::1]"].includes(host.hostname) ||
            !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress || "") ||
            req.headers["oai-authenticated-user-id"] !== "local_seedy")
            return send(403, { error: "只能从已登录的本机工作台保存配置。" });
          if (req.method === "GET") return send(200, { available: true });
          if (req.method !== "POST") return send(405, { error: "请求方法不支持。" });
          if (req.headers.origin !== host.origin || !req.headers["content-type"]?.includes("application/json"))
            return send(403, { error: "请通过本机模型连接窗口保存。" });
          let raw = "";
          for await (const chunk of req) {
            raw += chunk.toString();
            if (Buffer.byteLength(raw) > 8192) return send(413, { error: "配置过长。" });
          }
          const input = JSON.parse(raw);
          const { provider } = input;
          const key = typeof input.key === "string" ? input.key.trim() : "";
          const model = typeof input.model === "string" ? input.model.trim() : "";
          if (!["deepseek", "qwen"].includes(provider) || key.length > 500 || model.length > 100)
            return send(400, { error: "模型配置不正确。" });
          const issue = modelConnectionIssue(model, key);
          if (issue) return send(400, { error: issue });
          if (!/^[A-Za-z0-9._~+/=-]+$/.test(key) || !/^[A-Za-z0-9._:/-]+$/.test(model))
            return send(400, { error: "密钥或模型 ID 包含无效字符，请重新核对。" });
          const names = await readdir(server.config.root);
          // A new .dev.vars would hide existing .env files from Wrangler.
          const fileName = !names.includes(".dev.vars") && names.some(name => name === ".env" || name === ".env.local")
            ? ".env.local" : ".dev.vars";
          const path = resolve(server.config.root, fileName);
          let previous = "";
          try {
            if ((await lstat(path)).isSymbolicLink()) return send(400, { error: "本地配置文件不能使用符号链接。" });
            previous = await readFile(path, "utf8");
          } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
          const prefix = provider === "deepseek" ? "DEEPSEEK" : "QWEN";
          const revision = randomUUID();
          const settings = { AI_PROVIDER: provider, MODEL_CONFIG_REVISION: revision, [`${prefix}_MODEL`]: model, [`${prefix}_API_KEY`]: key };
          let content = previous;
          for (const [name, value] of Object.entries(settings)) {
            const line = `${name}=${value}`;
            const pattern = new RegExp(`^(?:export\\s+)?${name}\\s*=.*$`, "gm");
            content = pattern.test(content) ? content.replace(pattern, () => line) : `${content.trimEnd()}\n${line}\n`;
          }
          await writeFile(path, content.trimStart(), { mode: 0o600 });
          await chmod(path, 0o600);
          send(200, { saved: true, revision, fileName });
          // Also handles first creation, which Cloudflare's change-only watcher may miss.
          setTimeout(() => { void server.restart().catch(() => {}); }, 500);
        } catch {
          send(500, { error: "未能保存本地配置，请检查文件权限后重试。" });
        }
      });
    },
  };
}
