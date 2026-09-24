import { env } from "cloudflare:workers";
import { api, userId } from "@/lib/server/storage";
import { modelConfigStatus } from "@/lib/server/model-client";
export async function GET() {
  return api(async () => { await userId(); return modelConfigStatus(env); });
}
