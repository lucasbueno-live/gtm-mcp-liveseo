// Build com esbuild, injetando as credenciais OAuth embutidas
// (esbuild --define) a partir de oauth-embed.json (gitignored) ou
// das envs GTM_EMBED_CLIENT_ID / GTM_EMBED_CLIENT_SECRET.
//
// No GitHub o código-fonte fica sem secret (scanner não bloqueia);
// no pacote npm as credenciais entram no bundle.
import { build } from "esbuild";
import { readFileSync } from "node:fs";

function loadEmbed() {
  let id = process.env.GTM_EMBED_CLIENT_ID ?? "";
  let secret = process.env.GTM_EMBED_CLIENT_SECRET ?? "";
  if (!id || !secret) {
    try {
      const raw = JSON.parse(readFileSync("oauth-embed.json", "utf-8"));
      const s = raw.installed ?? raw.web ?? raw;
      id = id || s.client_id || "";
      secret = secret || s.client_secret || "";
    } catch {
      // sem arquivo e sem env → build "limpo" (creds vazias).
      // Útil pra quem clona o repo público só pra desenvolver.
    }
  }
  return { id, secret };
}

const { id, secret } = loadEmbed();

if (id && secret) {
  console.error(`[build] credenciais embutidas: ${id.slice(0, 16)}…`);
} else {
  console.error(
    "[build] AVISO: build sem credenciais embutidas. O pacote exigirá " +
      "GTM_MCP_CLIENT_ID/SECRET ou ~/.gtm-mcp/oauth-client.json em runtime. " +
      "Para publicar no npm, tenha oauth-embed.json na raiz.",
  );
}

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "esm",
  outfile: "dist/index.js",
  packages: "external",
  define: {
    __EMBEDDED_CLIENT_ID__: JSON.stringify(id),
    __EMBEDDED_CLIENT_SECRET__: JSON.stringify(secret),
  },
});

console.error("[build] OK -> dist/index.js");
