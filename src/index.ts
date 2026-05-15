#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getAuthorizedClient } from "./auth/oauth.js";
import { resolveConfig } from "./utils/config.js";
import { registerAllTools } from "./tools/index.js";
import { logStderr } from "./utils/logger.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(usage());
    return;
  }

  if (args.includes("--logout")) {
    const { clearCredentials, getTokenFilePath } = await import(
      "./auth/tokenStore.js"
    );
    await clearCredentials();
    logStderr(`Token removido (${getTokenFilePath()}). Próxima execução vai pedir login.`);
    return;
  }

  const config = await resolveConfig(args);

  const server = new McpServer({
    name: "liveseo-gtm-mcp",
    version: "0.1.0",
  });

  registerAllTools(server, {
    getAuth: () => getAuthorizedClient(config),
    config,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logStderr("✅ Servidor MCP conectado via stdio. Aguardando comandos do Claude.");
}

function usage(): string {
  return `liveSEO GTM MCP server

Uso:
  npx @liveseo/gtm-mcp [opções]

Opções:
  --write         Habilita operações de escrita (criar, editar, remover, publicar).
                  Sem essa flag, apenas operações de leitura são permitidas.
  --logout        Remove o token salvo em ~/.gtm-mcp/credentials.json e sai.
  --help, -h      Mostra esta ajuda.

Variáveis de ambiente:
  GTM_MCP_CLIENT_ID       Client ID OAuth (alternativa ao arquivo).
  GTM_MCP_CLIENT_SECRET   Client Secret OAuth.
  GTM_MCP_OAUTH_FILE      Caminho do credentials.json (default: ~/.gtm-mcp/oauth-client.json).

Documentação: https://github.com/liveseo/gtm-mcp
`;
}

main().catch((err) => {
  logStderr("❌ Erro fatal:", err instanceof Error ? err.message : err);
  if (err instanceof Error && err.stack) logStderr(err.stack);
  process.exit(1);
});
