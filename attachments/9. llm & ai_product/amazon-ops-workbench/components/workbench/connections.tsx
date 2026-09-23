"use client";
import { useState } from "react";
import { Plug, ShieldCheck, CloudDownload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useWorkspace, apiRequest } from "@/lib/ops/workspace-context";
import { matrixTable, parseTabularText, sha256 } from "@/lib/ops/importers";
import type { Source } from "@/lib/ops/domain";
import { PanelHeading } from "./primitives";
import { toast } from "sonner";
export function Connections({ onReview }: { onReview: () => void }) {
  const ops = useWorkspace(),
    [url, setUrl] = useState(""),
    [token, setToken] = useState(""),
    [name, setName] = useState("连接器经营数据"),
    [busy, setBusy] = useState(false),
    [consent, setConsent] = useState(false),
    [error, setError] = useState("");
  async function fetchData() {
    setBusy(true);
    setError("");
    try {
      await ops.ensure();
      const r = await apiRequest<{ text: string; host: string }>(
        "/api/connectors",
        { method: "POST", body: JSON.stringify({ url, token }) },
      );
      let tables: Source["tables"] = [],
        text = r.text;
      try {
        const json = JSON.parse(r.text);
        const rows = Array.isArray(json)
          ? json
          : Array.isArray(json.rows)
            ? json.rows
            : Array.isArray(json.data)
              ? json.data
              : null;
        if (rows?.length && typeof rows[0] === "object" && rows[0] !== null) {
          const cols = [
            ...new Set(rows.flatMap((x: object) => Object.keys(x))),
          ];
          const table = matrixTable(
            [
              cols,
              ...rows.map((x: Record<string, unknown>) =>
                cols.map((c) => x[c as string] ?? ""),
              ),
            ],
            name,
          );
          if (table) tables = [table];
          text = "";
        }
      } catch (e) {
        if (!(e instanceof SyntaxError)) throw e;
      }
      if (!tables.length) tables = await parseTabularText(r.text, name);
      const source: Source = {
        id: crypto.randomUUID(),
        name,
        kind: "connector",
        hash: await sha256(new TextEncoder().encode(r.text).buffer),
        createdAt: new Date().toISOString(),
        text,
        tables,
        confirmed: false,
        warnings: [
          `通过只读接口从 ${r.host} 获取。请核对统计周期、字段、站点和币种。`,
        ],
        market: "未确定",
        currency: "未确定",
      };
      await ops.addSource(
        source,
        new File([r.text], `${name}.txt`, { type: "text/plain" }),
      );
      toast.success("数据已读入，确认字段后才会进入报告。");
      onReview();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <PanelHeading
        title="数据渠道与连接器"
        description="文件导入和渠道读取最终进入同一份资料清单、校验流程与数据模型。"
      />
      <div className="connector-grid">
        <section className="panel">
          <Plug size={25} />
          <h3>只读 HTTP Connector</h3>
          <p>
            读取已授权接口的 JSON 行数组或 CSV。支持 Bearer
            Token，不会向外部店铺写入或执行运营动作。
          </p>
          <label className="field-label">
            资料名称
            <Input
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="field-label">
            HTTPS 数据地址
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://你的可信数据服务/报表接口"
            />
          </label>
          <label className="field-label">
            Bearer Token（如需要，仅本次会话）
            <Input
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </label>
          <label className="consent-row">
            <Checkbox
              checked={consent}
              onCheckedChange={(v) => setConsent(v === true)}
            />
            <span>
              确认这是我有权读取的数据源，并允许向该服务发起只读请求。
            </span>
          </label>
          <Button
            onClick={() => void fetchData()}
            disabled={!consent || !url || !name.trim() || busy}
          >
            <CloudDownload size={16} />
            {busy ? "读取中…" : "读取并进入校验"}
          </Button>
          {error && (
            <div role="alert" className="error-message mt-4">
              {error}
            </div>
          )}
        </section>
        <section className="panel connection-guide">
          <ShieldCheck size={25} />
          <h3>没有默认连接任何店铺</h3>
          <p>
            接口域名需先由部署管理员加入服务端白名单。Token
            不会保存在工作空间或备份中。
          </p>
          <div className="connector-status">
            <strong>Amazon SP-API / Amazon Ads</strong>
            <span>未配置</span>
          </div>
          <p>
            正式连接需要你的应用授权、账户范围和对应报表适配器。这里不会把一个“连接”按钮当成已接入亚马逊。
          </p>
          <div className="connector-status">
            <strong>MCP 数据渠道</strong>
            <span>待适配</span>
          </div>
          <p>
            可以接入，但 MCP
            只是工具调用协议，不等于已经拿到数据权限。后续适配器会把已授权的只读工具结果转为当前资料格式，复用校验、图表、AI
            和日报链路。
          </p>
          <p className="warning-note">
            第一版已实现上方 HTTP 读取；尚未实现 Amazon OAuth 或远程 MCP 握手。
          </p>
        </section>
      </div>
    </div>
  );
}
