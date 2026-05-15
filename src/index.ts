#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { resolveConfig } from "./utils/config.js";
import { Session } from "./auth/session.js";
import { registerAllTools } from "./tools/index.js";
import { logStderr } from "./utils/logger.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(usage());
    return;
  }

  if (args[0] === "setup") {
    const { runSetup } = await import("./cli/setup.js");
    await runSetup();
    return;
  }

  if (args.includes("--logout")) {
    const { deleteProfile, getActiveProfileName } = await import(
      "./auth/tokenStore.js"
    );
    const idx = args.indexOf("--logout");
    const explicit = args[idx + 1];
    const profile =
      explicit && !explicit.startsWith("--")
        ? explicit
        : await getActiveProfileName();
    await deleteProfile(profile);
    logStderr(
      `Perfil '${profile}' removido. Próxima execução vai pedir login.`,
    );
    return;
  }

  const config = await resolveConfig(args);
  const session = await Session.create(config, process.env.GTM_MCP_PROFILE);

  const server = new McpServer({
    name: "liveseo-gtm-mcp",
    version: "0.2.0",
  });

  registerAllTools(server, {
    getAuth: () => session.getAuth(),
    config,
    session,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logStderr(
    `✅ Servidor MCP conectado (perfil inicial: ${session.getActiveProfile()}). Aguardando comandos do Claude.`,
  );
}

function usage(): string {
  return `liveSEO GTM MCP server (multi-conta)

Uso:
  npx gtm-mcp-liveseo setup     Assistente guiado (login + config do Claude)
  npx gtm-mcp-liveseo [opções]  Inicia o servidor MCP (usado pelo Claude)

Comandos:
  setup               Passo a passo no terminal: faz o login Google e
                      já escreve (ou mostra) a config do Claude Desktop.
                      É o que a pessoa roda na 1ª vez.

Opções:
  --write             Habilita operações de escrita (criar, editar, remover, publicar).
                      Sem essa flag, apenas operações de leitura são permitidas.
  --logout [perfil]   Remove o token de um perfil (default: o perfil ativo).
  --help, -h          Mostra esta ajuda.

Multi-conta:
  Cada conta Google de cliente é um "perfil" salvo em
  ~/.gtm-mcp/profiles/<perfil>.json. Troque de conta pelo chat com a
  tool gtm_auth (login/switch/list/status/logout). O login sempre abre
  o seletor de contas Google pra você escolher o email certo.

Variáveis de ambiente:
  GTM_MCP_CLIENT_ID       Client ID OAuth.
  GTM_MCP_CLIENT_SECRET   Client Secret OAuth.
  GTM_MCP_OAUTH_FILE      Caminho do credentials.json (default: ~/.gtm-mcp/oauth-client.json).
  GTM_MCP_PROFILE         Perfil inicial ao iniciar o servidor (default: 'default').

Documentação: https://github.com/lucasbueno-live/gtm-mcp-liveseo
`;
}

main().catch((err) => {
  logStderr("❌ Erro fatal:", err instanceof Error ? err.message : err);
  if (err instanceof Error && err.stack) logStderr(err.stack);
  process.exit(1);
});
