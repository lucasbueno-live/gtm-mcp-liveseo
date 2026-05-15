import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { logStderr } from "./logger.js";
import {
  EMBEDDED_CLIENT_ID,
  EMBEDDED_CLIENT_SECRET,
} from "../auth/embeddedCredentials.js";

export interface ServerConfig {
  clientId: string;
  clientSecret: string;
  readonly: boolean;
}

interface InstalledCredentialsFile {
  installed?: {
    client_id?: string;
    client_secret?: string;
  };
  web?: {
    client_id?: string;
    client_secret?: string;
  };
}

const DEFAULT_PATHS = [
  process.env.GTM_MCP_OAUTH_FILE,
  join(homedir(), ".gtm-mcp", "oauth-client.json"),
];

export async function resolveConfig(args: string[]): Promise<ServerConfig> {
  const readonly = !args.includes("--write");
  if (!readonly) {
    logStderr(
      "⚠️  Modo --write ativo. Operações destrutivas (criar/editar/remover/publicar) estão habilitadas.",
    );
  } else {
    logStderr("🔒 Modo readonly ativo. Para habilitar escrita rode com --write.");
  }

  const envId = process.env.GTM_MCP_CLIENT_ID;
  const envSecret = process.env.GTM_MCP_CLIENT_SECRET;
  if (envId && envSecret) {
    return { clientId: envId, clientSecret: envSecret, readonly };
  }

  const fromFile = await loadFromFile();
  if (fromFile) {
    return { ...fromFile, readonly };
  }

  // Fallback padrão: credenciais embutidas. Faz o `npx gtm-mcp-liveseo`
  // funcionar sem nenhuma configuração — o usuário só faz o login Google.
  return {
    clientId: EMBEDDED_CLIENT_ID,
    clientSecret: EMBEDDED_CLIENT_SECRET,
    readonly,
  };
}

async function loadFromFile(): Promise<Pick<
  ServerConfig,
  "clientId" | "clientSecret"
> | null> {
  for (const path of DEFAULT_PATHS) {
    if (!path) continue;
    try {
      const raw = await fs.readFile(path, "utf-8");
      const parsed = JSON.parse(raw) as InstalledCredentialsFile;
      const section = parsed.installed ?? parsed.web;
      if (section?.client_id && section?.client_secret) {
        logStderr(`Credenciais OAuth carregadas de ${path}`);
        return {
          clientId: section.client_id,
          clientSecret: section.client_secret,
        };
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        logStderr(`Falha ao ler credenciais em ${path}:`, err);
      }
    }
  }
  return null;
}
