import { createInterface } from "node:readline/promises";
import { stdin, stdout, platform, env } from "node:process";
import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { resolveConfig } from "../utils/config.js";
import { loginProfile } from "../auth/oauth.js";
import { sanitizeProfileName, setActiveProfileName } from "../auth/tokenStore.js";
import { c, banner } from "./theme.js";

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
    line(banner());
    line("");
    line(c.bold("Vou te guiar em 3 passos:"));
    line(c.orange("  1)") + " Você faz login com sua conta Google (navegador)");
    line(c.orange("  2)") + " Eu salvo o acesso só na " + c.bold("SUA") + " máquina");
    line(c.orange("  3)") + " Eu configuro o Claude Desktop e/ou o Cursor");
    line("");
    line(
      c.gray("Pré-requisito: seu email precisa ter sido liberado pelo time (test user).") ,
    );
    line("");

    // --- Onde instalar ---
    line(c.bold("Onde você quer usar?"));
    line("  " + c.orange("[1]") + " Claude Desktop");
    line("  " + c.orange("[2]") + " Cursor");
    line("  " + c.orange("[3]") + " Ambos");
    const destAns = (
      await rl.question(c.orange("→ ") + "Escolha (1/2/3). Enter = 1: ")
    ).trim();
    const targets: Target[] =
      destAns === "2"
        ? ["cursor"]
        : destAns === "3"
          ? ["claude", "cursor"]
          : ["claude"];

    const profRaw = await rl.question(
      c.orange("→ ") +
        "Nome do perfil (ex.: nome do cliente). " +
        c.gray("Enter = 'default'") +
        ": ",
    );
    const profile = sanitizeProfileName(profRaw || "default");

    const writeAns = (
      await rl.question(
        c.orange("→ ") +
          "Vai precisar CRIAR/EDITAR tags (modo escrita)? " +
          c.gray("Padrão é só leitura. [s/N]") +
          ": ",
      )
    )
      .trim()
      .toLowerCase();
    const write = writeAns === "s" || writeAns === "sim" || writeAns === "y";

    line("");
    line(
      c.gray("Destino: ") +
        c.bold(targets.map(appLabel).join(" + ")) +
        c.gray("  |  Perfil: ") +
        c.bold(profile) +
        c.gray("  |  Modo: ") +
        (write ? c.orangeBold("ESCRITA") : c.bold("somente leitura")),
    );
    line("");
    line(c.orangeBold("Passo 1/3") + c.gray(" — login Google (abre o navegador)"));
    line(c.gray("  • Escolha a conta com acesso ao GTM do cliente"));
    line(
      c.gray('  • Tela amarela "O Google não verificou este app": clique em'),
    );
    line(
      c.gray('    "Avançado" → "Acessar gtm-liveseo-mcp"') +
        c.gray(" (seguro — o app é da"),
    );
    line(c.gray("    liveSEO e roda só na sua máquina)"));
    line(c.gray("  • Permita o acesso ao Tag Manager"));
    line("");
    await rl.question(c.orange("→ ") + "Pressione Enter para abrir o navegador… ");

    const config = await resolveConfig(write ? ["--write"] : []);
    const { email } = await loginProfile(config, profile);
    await setActiveProfileName(profile);

    line("");
    line(
      c.orangeBold("Passo 2/3") +
        " " +
        c.green("✓") +
        " Conectado como " +
        c.bold(email ?? "sua conta Google"),
    );
    line(c.gray("   Acesso salvo em ~/.gtm-mcp/profiles/ (só nesta máquina)."));
    line("");

    const entry = buildServerEntry(write, profile);

    line(c.orangeBold("Passo 3/3") + c.gray(" — configuração"));
    line("");
    const auto = (
      await rl.question(
        c.orange("→ ") +
          `Quer que eu já configure ${targets.map(appLabel).join(" e ")} pra você? ` +
          c.gray("[S/n]") +
          ": ",
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
        line(c.green("✓ ") + c.bold(label) + " configurado");
        line(c.gray(`   ${cfgPath}`));
        line(c.gray(`   backup do anterior em ${cfgPath}.bak (se existia)`));
      } else {
        const snippet = JSON.stringify(
          { mcpServers: { gtm: entry } },
          null,
          2,
        );
        line(c.orange("— ") + c.bold(label) + c.gray(` — cole no arquivo:`));
        line(c.gray(`  ${cfgPath}`));
        line(c.gray('  (se já tiver outros servidores, junte só a parte "gtm")'));
        line("");
        line(snippet);
        line("");
      }
    }

    line("");
    line(c.orangeBold("→ Agora FECHE e ABRA de novo:"));
    for (const t of targets) line("   " + c.orange("•") + " " + appLabel(t));
    line(
      c.gray('Depois é só pedir, ex.: ') + c.bold('"liste minhas contas do GTM"'),
    );
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
