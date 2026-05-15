import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { logStderr } from "./logger.js";

interface GoogleApiError {
  code?: number;
  message?: string;
  errors?: Array<{ message?: string; reason?: string }>;
}

const HUMAN_FRIENDLY_MESSAGES: Record<number, string> = {
  400: "Pedido inválido. Verifique os IDs e parâmetros enviados.",
  401: "Token expirado ou inválido. Rode o servidor de novo — ele vai pedir nova autenticação.",
  403: "Permissão negada. A conta Google autenticada não tem acesso a esse recurso no GTM, ou o modo readonly está bloqueando uma operação de escrita.",
  404: "Recurso não encontrado. Confira se o ID da conta, container ou workspace está correto.",
  409: "Conflito. Provavelmente o fingerprint está desatualizado — recarregue o recurso antes de editar.",
  429: "Limite de chamadas atingido (quota da API GTM). Espere ~1 minuto e tente de novo.",
  500: "Erro interno do Google. Tente de novo em alguns segundos.",
  503: "API do Google temporariamente indisponível. Tente de novo.",
};

export function createErrorResponse(
  context: string,
  error: unknown,
): CallToolResult {
  let userMessage = "";
  const e = error as GoogleApiError | Error | undefined;

  if (e && typeof e === "object" && "code" in e && typeof e.code === "number") {
    const apiErr = e as GoogleApiError;
    const friendly = HUMAN_FRIENDLY_MESSAGES[apiErr.code ?? 0];
    const detail =
      (apiErr.errors ?? [])
        .map((it) => it.message)
        .filter(Boolean)
        .join(" • ") || apiErr.message || "";
    userMessage = `❌ ${context}\n\n${friendly ?? `Erro ${apiErr.code} da API Google.`}\n\nDetalhes técnicos: ${detail}`;
  } else if (e instanceof Error) {
    userMessage = `❌ ${context}\n\n${e.message}`;
  } else {
    userMessage = `❌ ${context}\n\n${String(e)}`;
  }

  logStderr("Tool error:", userMessage);

  return {
    isError: true,
    content: [{ type: "text", text: userMessage }],
  };
}

export class WriteModeError extends Error {
  constructor(action: string) {
    super(
      `Operação '${action}' bloqueada: o servidor está em modo readonly. Reinicie com a flag --write para habilitar operações de escrita.`,
    );
    this.name = "WriteModeError";
  }
}

export class ConfirmationRequiredError extends Error {
  constructor(action: string) {
    super(
      `Operação destrutiva '${action}' exige confirmação explícita. Passe o parâmetro confirm: true para executar.`,
    );
    this.name = "ConfirmationRequiredError";
  }
}
