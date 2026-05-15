import { createServer } from "node:http";
import { AddressInfo } from "node:net";
import { OAuth2Client } from "google-auth-library";
import open from "open";
import { loadCredentials, saveCredentials } from "./tokenStore.js";
import { logStderr } from "../utils/logger.js";

const SCOPES = [
  "https://www.googleapis.com/auth/tagmanager.readonly",
  "https://www.googleapis.com/auth/tagmanager.edit.containers",
  "https://www.googleapis.com/auth/tagmanager.edit.containerversions",
  "https://www.googleapis.com/auth/tagmanager.delete.containers",
  "https://www.googleapis.com/auth/tagmanager.manage.accounts",
  "https://www.googleapis.com/auth/tagmanager.manage.users",
  "https://www.googleapis.com/auth/tagmanager.publish",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

const READONLY_SCOPES = [
  "https://www.googleapis.com/auth/tagmanager.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  readonly: boolean;
}

let cachedClient: OAuth2Client | null = null;

export function resetClient(): void {
  cachedClient = null;
}

export async function getAuthorizedClient(
  config: OAuthConfig,
): Promise<OAuth2Client> {
  if (cachedClient) {
    return cachedClient;
  }

  const stored = await loadCredentials();
  const client = new OAuth2Client({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
  });

  if (stored?.refresh_token) {
    client.setCredentials(stored);
    try {
      await client.getAccessToken();
      cachedClient = client;
      attachAutoSave(client);
      return client;
    } catch {
      logStderr(
        "Token salvo expirou ou foi revogado. Iniciando nova autenticação.",
      );
    }
  }

  const fresh = await runInteractiveFlow(config);
  cachedClient = fresh;
  return fresh;
}

function attachAutoSave(client: OAuth2Client): void {
  client.on("tokens", (tokens) => {
    void (async () => {
      const existing = (await loadCredentials()) ?? {};
      await saveCredentials({ ...existing, ...tokens });
    })();
  });
}

async function runInteractiveFlow(
  config: OAuthConfig,
): Promise<OAuth2Client> {
  const { port, redirectUri, code } = await waitForCode((url) => {
    const client = new OAuth2Client({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: url,
    });
    const authUrl = client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: config.readonly ? READONLY_SCOPES : SCOPES,
    });
    logStderr(`\n🔐 Abrindo navegador para login Google em ${url} …`);
    logStderr(`Se não abrir sozinho, acesse manualmente:\n${authUrl}\n`);
    void open(authUrl).catch(() => {
      logStderr(
        "Não consegui abrir o navegador automaticamente. Copie a URL acima.",
      );
    });
  });

  const client = new OAuth2Client({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri,
  });

  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  await saveCredentials(tokens);
  attachAutoSave(client);

  logStderr(`✅ Autenticação concluída. Token salvo. (porta ${port})`);
  return client;
}

interface AuthCodeResult {
  port: number;
  redirectUri: string;
  code: string;
}

function waitForCode(
  onListening: (redirectUri: string) => void,
): Promise<AuthCodeResult> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      try {
        const url = new URL(req.url ?? "/", `http://localhost`);
        if (url.pathname !== "/oauth/callback") {
          res.writeHead(404).end("Not found");
          return;
        }
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");
        if (error) {
          res
            .writeHead(400, { "Content-Type": "text/html; charset=utf-8" })
            .end(renderResult(false, `Erro: ${error}`));
          server.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }
        if (!code) {
          res
            .writeHead(400, { "Content-Type": "text/html; charset=utf-8" })
            .end(renderResult(false, "Código de autorização não recebido."));
          return;
        }
        res
          .writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
          .end(renderResult(true));
        const address = server.address() as AddressInfo;
        const port = address.port;
        server.close();
        resolve({
          port,
          redirectUri: `http://localhost:${port}/oauth/callback`,
          code,
        });
      } catch (err) {
        reject(err);
      }
    });

    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as AddressInfo;
      const redirectUri = `http://localhost:${address.port}/oauth/callback`;
      onListening(redirectUri);
    });
  });
}

function renderResult(ok: boolean, message?: string): string {
  const title = ok ? "Autenticação concluída" : "Falha na autenticação";
  const body = ok
    ? "Você pode fechar esta aba e voltar para o Claude."
    : message ?? "Algo deu errado.";
  const color = ok ? "#16a34a" : "#dc2626";
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>liveSEO GTM MCP — ${title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 480px; margin: 80px auto; padding: 24px; color: #0f172a; }
  h1 { color: ${color}; }
  p { line-height: 1.6; }
</style>
</head>
<body>
  <h1>${title}</h1>
  <p>${body}</p>
</body>
</html>`;
}
