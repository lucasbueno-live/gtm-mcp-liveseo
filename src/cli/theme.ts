import { stdout, env } from "node:process";

// Paleta liveSEO. Ajuste aqui se a marca mudar.
const LIVESEO_ORANGE: [number, number, number] = [242, 101, 34]; // #F26522
const GRAY: [number, number, number] = [140, 140, 140];
const GREEN: [number, number, number] = [46, 160, 67];
const YELLOW: [number, number, number] = [220, 160, 30];

// Gradiente do wordmark (topo quente -> base cinza-grafite).
const GRADIENT: [number, number, number][] = [
  [255, 156, 74],
  [248, 128, 52],
  [242, 101, 34],
  [214, 96, 44],
  [176, 100, 70],
  [138, 120, 110],
];

const forceColor =
  env.FORCE_COLOR === "1" ||
  env.FORCE_COLOR === "true" ||
  env.GTM_FORCE_COLOR === "1";

const useColor =
  !env.NO_COLOR &&
  env.TERM !== "dumb" &&
  (forceColor || Boolean(stdout.isTTY));

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

function fg([r, g, b]: [number, number, number]): string {
  return `\x1b[38;2;${r};${g};${b}m`;
}
function wrap(open: string, s: string): string {
  return useColor ? `${open}${s}${RESET}` : s;
}

export const c = {
  orange: (s: string): string => wrap(fg(LIVESEO_ORANGE), s),
  orangeBold: (s: string): string => wrap(`${BOLD}${fg(LIVESEO_ORANGE)}`, s),
  gray: (s: string): string => wrap(fg(GRAY), s),
  green: (s: string): string => wrap(fg(GREEN), s),
  yellow: (s: string): string => wrap(fg(YELLOW), s),
  bold: (s: string): string => wrap(BOLD, s),
  dim: (s: string): string => wrap(DIM, s),
};

// "GTM" em block-art (estilo ANSI Shadow), 6 linhas por letra.
const G = [
  " ██████╗ ",
  "██╔════╝ ",
  "██║  ███╗",
  "██║   ██║",
  "╚██████╔╝",
  " ╚═════╝ ",
];
const T = [
  "████████╗",
  "╚══██╔══╝",
  "   ██║   ",
  "   ██║   ",
  "   ██║   ",
  "   ╚═╝   ",
];
const M = [
  "███╗   ███╗",
  "████╗ ████║",
  "██╔████╔██║",
  "██║╚██╔╝██║",
  "██║ ╚═╝ ██║",
  "╚═╝     ╚═╝",
];

function wordmarkLines(): string[] {
  const out: string[] = [];
  for (let r = 0; r < 6; r++) {
    out.push(`  ${G[r]}  ${T[r]}  ${M[r]}`);
  }
  return out;
}

// Banner compacto (fallback: sem cor, terminal estreito ou pipe).
function compactBanner(): string {
  const INNER = 50;
  const rowLine = (txt: string, rendered: string): string => {
    const pad = Math.max(0, INNER - txt.length);
    return c.orange("│ ") + rendered + " ".repeat(pad) + c.orange(" │");
  };
  const top = c.orange("╭" + "─".repeat(INNER + 2) + "╮");
  const bot = c.orange("╰" + "─".repeat(INNER + 2) + "╯");
  const empty = rowLine("", "");
  return [
    top,
    empty,
    rowLine(
      "liveSEO  ·  Google Tag Manager",
      c.orangeBold("liveSEO") + c.gray("  ·  ") + c.bold("Google Tag Manager"),
    ),
    rowLine("Assistente de configuração", c.gray("Assistente de configuração")),
    rowLine("Claude Desktop / Cursor", c.gray("Claude Desktop / Cursor")),
    empty,
    bot,
  ].join("\n");
}

export function banner(): string {
  const cols = stdout.columns ?? 80;
  if (!useColor || cols < 44) {
    return compactBanner();
  }
  const art = wordmarkLines()
    .map((ln, i) => wrap(`${BOLD}${fg(GRADIENT[i])}`, ln))
    .join("\n");
  const sub =
    "  " +
    c.orangeBold("liveSEO") +
    c.gray("  ·  ") +
    c.bold("Google Tag Manager") +
    c.gray("  ·  ") +
    c.gray("Claude / Cursor");
  return `\n${art}\n\n${sub}`;
}

export function tips(): string {
  const h = c.bold("Dicas para começar:");
  const items = [
    `${c.orange("1.")} Escolha onde usar: ${c.bold("Claude Desktop")} ou ${c.bold("Cursor")}.`,
    `${c.orange("2.")} Faça o login Google quando o ${c.bold("navegador")} abrir.`,
    `${c.orange("3.")} Use o nome do ${c.bold("cliente")} como perfil pra separar contas.`,
    `${c.orange("4.")} No fim eu configuro o app pra você — é só reabrir.`,
  ];
  return [h, ...items].join("\n");
}
