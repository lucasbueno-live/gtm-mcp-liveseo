/**
 * Credenciais OAuth do app Desktop "gtm-liveseo-mcp", INJETADAS EM
 * BUILD TIME (esbuild --define) a partir de `oauth-embed.json`
 * (gitignored, presente só na máquina de quem publica) ou das envs
 * GTM_EMBED_CLIENT_ID / GTM_EMBED_CLIENT_SECRET.
 *
 * No código-fonte público (GitHub) estes valores ficam VAZIOS — por
 * isso o secret scanner não bloqueia. No pacote publicado no npm eles
 * vêm embutidos no bundle, fazendo `npx -y gtm-mcp-liveseo` funcionar
 * sem nenhuma configuração.
 *
 * Para app OAuth do tipo Desktop o Google trata o "client secret"
 * como NÃO confidencial (não há como escondê-lo num CLI distribuído —
 * mesmo modelo do `gcloud`). O que protege o acesso é a consent
 * screen + escopos + o token individual de cada pessoa.
 *
 * Em último caso, ainda pode ser sobrescrito em runtime por
 * GTM_MCP_CLIENT_ID/SECRET ou ~/.gtm-mcp/oauth-client.json
 * (ver utils/config.ts).
 */
declare const __EMBEDDED_CLIENT_ID__: string | undefined;
declare const __EMBEDDED_CLIENT_SECRET__: string | undefined;

export const EMBEDDED_CLIENT_ID: string =
  typeof __EMBEDDED_CLIENT_ID__ !== "undefined" ? __EMBEDDED_CLIENT_ID__ : "";

export const EMBEDDED_CLIENT_SECRET: string =
  typeof __EMBEDDED_CLIENT_SECRET__ !== "undefined"
    ? __EMBEDDED_CLIENT_SECRET__
    : "";

export const HAS_EMBEDDED_CREDENTIALS =
  EMBEDDED_CLIENT_ID.length > 0 && EMBEDDED_CLIENT_SECRET.length > 0;
