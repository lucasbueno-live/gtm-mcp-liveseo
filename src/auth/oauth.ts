import { createServer } from "node:http";
import { AddressInfo } from "node:net";
import { OAuth2Client } from "google-auth-library";
import open from "open";
import {
  loadProfile,
  saveProfile,
  ProfileData,
  StoredCredentials,
} from "./tokenStore.js";
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

const clientCache = new Map<string, OAuth2Client>();

export function resetClient(profile?: string): void {
  if (profile) clientCache.delete(profile);
  else clientCache.clear();
}

/**
 * Retorna um OAuth2Client autenticado para o perfil indicado.
 * Reutiliza o token salvo (refresh) se existir; senão dispara o
 * fluxo interativo no navegador (com seletor de conta Google).
 */
export async function getAuthorizedClient(
  config: OAuthConfig,
  profile: string,
): Promise<OAuth2Client> {
  const cached = clientCache.get(profile);
  if (cached) return cached;

  const stored = await loadProfile(profile);
  if (stored?.tokens?.refresh_token) {
    const client = new OAuth2Client({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    });
    client.setCredentials(stored.tokens);
    try {
      await client.getAccessToken();
      attachAutoSave(client, profile, stored);
      clientCache.set(profile, client);
      return client;
    } catch {
      logStderr(
        `[${profile}] Token salvo expirou ou foi revogado. Iniciando nova autenticação.`,
      );
    }
  }

  const fresh = await runInteractiveFlow(config, profile);
  clientCache.set(profile, fresh);
  return fresh;
}

/**
 * Força o fluxo interativo (login) para um perfil, mesmo que já
 * exista token. Usado pela tool gtm_auth action=login.
 */
export async function loginProfile(
  config: OAuthConfig,
  profile: string,
): Promise<{ client: OAuth2Client; email?: string }> {
  resetClient(profile);
  const client = await runInteractiveFlow(config, profile);
  clientCache.set(profile, client);
  const data = await loadProfile(profile);
  return { client, email: data?.email };
}

function attachAutoSave(
  client: OAuth2Client,
  profile: string,
  base: ProfileData,
): void {
  client.on("tokens", (tokens) => {
    void (async () => {
      const existing = (await loadProfile(profile)) ?? base;
      await saveProfile(profile, {
        ...existing,
        tokens: { ...existing.tokens, ...tokens },
      });
    })();
  });
}

async function fetchUserInfo(
  accessToken: string,
): Promise<{ email?: string; name?: string }> {
  try {
    const res = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return {};
    const json = (await res.json()) as { email?: string; name?: string };
    return { email: json.email, name: json.name };
  } catch {
    return {};
  }
}

async function runInteractiveFlow(
  config: OAuthConfig,
  profile: string,
): Promise<OAuth2Client> {
  const { redirectUri, code } = await waitForCode((url) => {
    const client = new OAuth2Client({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: url,
    });
    const authUrl = client.generateAuthUrl({
      access_type: "offline",
      // select_account: SEMPRE mostra o seletor de contas Google,
      // pra cada pessoa escolher o email do cliente certo.
      prompt: "select_account consent",
      scope: config.readonly ? READONLY_SCOPES : SCOPES,
    });
    logStderr(
      `\n🔐 [perfil: ${profile}] Abrindo navegador para escolher a conta Google…`,
    );
    logStderr(`Se não abrir sozinho, acesse:\n${authUrl}\n`);
    void open(authUrl).catch(() => {
      logStderr("Não consegui abrir o navegador. Copie a URL acima.");
    });
  });

  const client = new OAuth2Client({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri,
  });

  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const info = tokens.access_token
    ? await fetchUserInfo(tokens.access_token)
    : {};

  const data: ProfileData = {
    email: info.email,
    name: info.name,
    tokens: tokens as StoredCredentials,
  };
  await saveProfile(profile, data);
  attachAutoSave(client, profile, data);

  logStderr(
    `✅ [perfil: ${profile}] Autenticado como ${info.email ?? "conta Google"}. Token salvo.`,
  );
  return client;
}

interface AuthCodeResult {
  redirectUri: string;
  code: string;
}

function waitForCode(
  onListening: (redirectUri: string) => void,
): Promise<AuthCodeResult> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      try {
        const url = new URL(req.url ?? "/", "http://localhost");
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
        server.close();
        resolve({
          redirectUri: `http://localhost:${address.port}/oauth/callback`,
          code,
        });
      } catch (err) {
        reject(err);
      }
    });

    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as AddressInfo;
      onListening(`http://localhost:${address.port}/oauth/callback`);
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
<head><meta charset="utf-8" /><title>liveSEO GTM MCP — ${title}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:480px;margin:80px auto;padding:24px;color:#0f172a}h1{color:${color}}p{line-height:1.6}</style>
</head><body><h1>${title}</h1><p>${body}</p></body></html>`;
}
