import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OAuth2Client } from "google-auth-library";
import { ServerConfig } from "../utils/config.js";
import { Session } from "../auth/session.js";

export interface ToolContext {
  getAuth: () => Promise<OAuth2Client>;
  config: ServerConfig;
  session: Session;
}

export type ToolRegistration = (
  server: McpServer,
  ctx: ToolContext,
) => void;

const WRITE_ACTIONS = new Set([
  "create",
  "update",
  "remove",
  "delete",
  "publish",
  "createVersion",
  "combine",
  "moveTagId",
  "resolveConflict",
  "sync",
  "revert",
]);

const DESTRUCTIVE_ACTIONS = new Set(["remove", "delete", "publish"]);

export function classifyAction(action: string): {
  isWrite: boolean;
  isDestructive: boolean;
} {
  return {
    isWrite: WRITE_ACTIONS.has(action),
    isDestructive: DESTRUCTIVE_ACTIONS.has(action),
  };
}
