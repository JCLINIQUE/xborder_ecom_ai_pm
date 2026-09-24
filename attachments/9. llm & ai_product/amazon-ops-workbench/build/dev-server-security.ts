import type { ServerOptions } from "vite";

// Keep Vite's default private-file protections and cover Wrangler credentials.
// Git ignore rules do not prevent the development server from serving files.
export const privateFileAccess: NonNullable<ServerOptions["fs"]> = {
  strict: true,
  deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", ".dev.vars*"],
};
