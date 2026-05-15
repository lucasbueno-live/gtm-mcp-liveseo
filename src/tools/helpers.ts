import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  createErrorResponse,
  WriteModeError,
  ConfirmationRequiredError,
} from "../utils/errors.js";
import { classifyAction, ToolContext } from "./registry.js";
import { logStderr } from "../utils/logger.js";

export interface ActionParams {
  action: string;
  confirm?: boolean;
}

export async function withGuards(
  ctx: ToolContext,
  params: ActionParams,
  toolName: string,
  exec: () => Promise<CallToolResult>,
): Promise<CallToolResult> {
  const { action } = params;
  const { isWrite, isDestructive } = classifyAction(action);

  logStderr(`tool=${toolName} action=${action} readonly=${ctx.config.readonly}`);

  try {
    if (isWrite && ctx.config.readonly) {
      throw new WriteModeError(action);
    }
    if (isDestructive && !params.confirm) {
      throw new ConfirmationRequiredError(action);
    }
    return await exec();
  } catch (error) {
    return createErrorResponse(
      `Erro em ${toolName}.${action}`,
      error,
    );
  }
}

export function textResult(data: unknown): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function requireField<T>(
  value: T | undefined | null,
  fieldName: string,
  action: string,
): T {
  if (value === undefined || value === null || value === "") {
    throw new Error(
      `Campo '${fieldName}' é obrigatório para a ação '${action}'.`,
    );
  }
  return value;
}
