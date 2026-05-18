import { createInterface } from "node:readline/promises";
import { stdin, stdout, platform, env } from "node:process";
import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { resolveConfig } from "../utils/config.js";
import { loginProfile } from "../auth/oauth.js";
import { sanitizeProfileName, setActiveProfileName } from "../auth/tokenStore.js";

type Target = "claude" | "cursor";

function claudeConfigPath(): string {
  if (platform === "win32") {
    return join(
      env.APPDATA ?? join(homedir(), "AppData", "Roaming"),
      "Claude",
      "claude_desktop_config.json",
    );
  }
  if (platform === "darwin") {
    return join(
      homedir(),
      "Library",
      "Application Support",
      "Claude",
      "claude_desktop_config.json",
    );
  }
  return join(homedir(), ".config", "Claude", "claude_desktop_config.json");
}

// Cursor usa ~/.cursor/mcp.json (global) em todos os SOs.
function cursorConfigPath(): string {
  return join(homedir(), ".cursor", "mcp.json");
}

function configPathFor(target: Target): string {
  return target === "cursor" ? cursorConfigPath() : claudeConfigPath();
}

function appLabel(target: Target): string {
  return target === "cursor" ? "Cursor" : "Claude Desktop";
}

function buildServerEntry(write: boolean, profile: string) {
  const args = ["-y", "gtm-mcp-liveseo"];
  if (write) args.push("--write");
  const entry: {
    command: string;
    args: string[];
    env?: Record<string, string>;
  } = { command: "npx", args };
  if (profile && profile !== "default") {
    entry.env = { GTM_MCP_PROFILE: profile };
  }
  return entry;
}

function line(s = ""): void {
  stdout.write(s + "\n");
}

export async function runSetup(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    line("");
    line("==============================================");
    line("  liveSEO · Google Tag Manager");
    line("  Assistente de configuração");
    line("==============================================");
    line("");
    line("Vou te guiar em 3 passos:");
    line("  1) Você faz login com sua conta Google (abre o navegador)");
    line("  2) Eu salvo o acesso só na SUA máquina");
    line("  3) Eu configuro o Claude Desktop e/ou o Cursor pra você");
    line("");
    line(
      "Pré-requisito: seu email precisa ter sido liberado pelo time (test user).",
    );
    line("");

    // --- Onde instalar ---
    line("Onde você quer usar?");
    line("  [1] Claude Desktop");
    line("  [2] Cursor");
    line("  [3] Ambos");
    const destAns = (
      await rl.question("Escolha (1/2/3). Enter = 1: ")
    ).trim();
    const targets: Target[] =
      destAns === "2"
        ? ["cursor"]
        : destAns === "3"
          ? ["claude", "cursor"]
          : ["claude"];

    const profRaw = await rl.question(
      "Nome do perfil (ex.: nome do cliente). Enter = 'default': ",
    );
    const profile = sanitizeProfileName(profRaw || "default");

    const writeAns = (
      await rl.question(
        "Vai precisar CRIAR/EDITAR tags (modo escrita)? Padrão é só leitura. [s/N]: ",
      )
    )
      .trim()
      .toLowerCase();
    const write = writeAns === "s" || writeAns === "sim" || writeAns === "y";

    line("");
    line(
      `Destino: ${targets.map(appLabel).join(" + ")}  |  Perfil: ${profile}  |  Modo: ${write ? "ESCRITA" : "somente leitura"}`,
    );
    line("");
    line("Passo 1/3 — vou abrir o navegador para o login Google.");
    line("  • Escolha a conta com acesso ao GTM do cliente");
    line('  • Tela amarela "O Google não verificou este app": clique em');
    line('    "Avançado" → "Acessar gtm-liveseo-mcp" (é seguro — o app é da');
    line("    liveSEO e roda só na sua máquina)");
    line("  • Permita o acesso ao Tag Manager");
    line("");
    await rl.question("Pressione Enter para abrir o navegador… ");

    const config = await resolveConfig(write ? ["--write"] : []);
    const { email } = await loginProfile(config, profile);
    await setActiveProfileName(profile);

    line("");
    line(`Passo 2/3 — ✅ Conectado como ${email ?? "sua conta Google"}.`);
    line("   Acesso salvo em ~/.gtm-mcp/profiles/ (só nesta máquina).");
    line("");

    const entry = buildServerEntry(write, profile);

    line("Passo 3/3 — configuração.");
    line("");
    const auto = (
      await rl.question(
        `Quer que eu já configure ${targets.map(appLabel).join(" e ")} pra você? [S/n]: `,
      )
    )
      .trim()
      .toLowerCase();
    const doAuto = auto === "" || auto === "s" || auto === "sim" || auto === "y";

    for (const target of targets) {
      const cfgPath = configPathFor(target);
      const label = appLabel(target);
      if (doAuto) {
        await mergeConfig(cfgPath, entry);
        line(`✅ ${label} configurado (${cfgPath})`);
        line(`   backup do anterior em ${cfgPath}.bak (se existia)`);
      } else {
        const snippet = JSON.stringify(
          { mcpServers: { gtm: entry } },
          null,
          2,
        );
        line(`— ${label} — cole no arquivo: ${cfgPath}`);
        line("(se já tiver outros servidores, junte só a parte \"gtm\")");
        line("");
        line(snippet);
        line("");
      }
    }

    line("");
    line("➡️  Agora FECHE e ABRA de novo:");
    for (const t of targets) line(`   • ${appLabel(t)}`);
    line('Depois é só pedir, ex.: "liste minhas contas do GTM".');
    line("");
  } finally {
    rl.close();
  }
}

async function mergeConfig(cfgPath: string, entry: object): Promise<void> {
  let current: { mcpServers?: Record<string, unknown> } = {};
  let existed = false;
  try {
    const raw = await fs.readFile(cfgPath, "utf-8");
    existed = true;
    current = JSON.parse(raw || "{}");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  if (existed) {
    await fs.writeFile(`${cfgPath}.bak`, JSON.stringify(current, null, 2));
  }
  if (!current.mcpServers || typeof current.mcpServers !== "object") {
    current.mcpServers = {};
  }
  current.mcpServers.gtm = entry;
  await fs.mkdir(dirname(cfgPath), { recursive: true });
  await fs.writeFile(cfgPath, JSON.stringify(current, null, 2), "utf-8");
}
