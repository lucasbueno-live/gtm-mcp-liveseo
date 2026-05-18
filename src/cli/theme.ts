import { stdout, env } from "node:process";

// Paleta liveSEO. Ajuste o laranja aqui se a marca mudar.
const LIVESEO_ORANGE: [number, number, number] = [242, 101, 34]; // #F26522
const GRAY: [number, number, number] = [140, 140, 140];
const GREEN: [number, number, number] = [46, 160, 67];
const YELLOW: [number, number, number] = [220, 160, 30];

// Cores só quando faz sentido (terminal interativo, sem NO_COLOR).
const useColor =
  Boolean(stdout.isTTY) &&
  !env.NO_COLOR &&
  env.TERM !== "dumb";

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
  orangeBold: (s: string): string =>
    wrap(`${BOLD}${fg(LIVESEO_ORANGE)}`, s),
  gray: (s: string): string => wrap(fg(GRAY), s),
  green: (s: string): string => wrap(fg(GREEN), s),
  yellow: (s: string): string => wrap(fg(YELLOW), s),
  bold: (s: string): string => wrap(BOLD, s),
  dim: (s: string): string => wrap(DIM, s),
};

const INNER = 50; // largura interna do banner

function row(plain: string, rendered: string): string {
  const pad = Math.max(0, INNER - plain.length);
  return (
    c.orange("│ ") + rendered + " ".repeat(pad) + c.orange(" │")
  );
}

export function banner(): string {
  const top = c.orange("╭" + "─".repeat(INNER + 2) + "╮");
  const bot = c.orange("╰" + "─".repeat(INNER + 2) + "╯");
  const empty = row("", "");
  const l1 = row(
    "liveSEO  ·  Google Tag Manager",
    c.orangeBold("liveSEO") + c.gray("  ·  ") + c.bold("Google Tag Manager"),
  );
  const l2 = row(
    "Assistente de configuração",
    c.gray("Assistente de configuração"),
  );
  const l3 = row(
    "Claude Desktop / Cursor",
    c.gray("Claude Desktop / Cursor"),
  );
  return [top, empty, l1, l2, l3, empty, bot].join("\n");
}
