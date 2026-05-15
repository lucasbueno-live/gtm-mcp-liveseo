import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ToolContext } from "./registry.js";
import { helpTool } from "./help.js";
import { auditTool } from "./audit.js";
import { accountTool } from "./account.js";
import { containerTool } from "./container.js";
import { workspaceTool } from "./workspace.js";
import { versionTool } from "./version.js";
import {
  tagTool,
  triggerTool,
  variableTool,
  folderTool,
  zoneTool,
  clientTool,
  transformationTool,
  templateTool,
  gtagConfigTool,
} from "./workspaceResources.js";
import {
  builtInVariableTool,
  environmentTool,
  destinationTool,
  userPermissionTool,
  versionHeaderTool,
} from "./misc.js";

export function registerAllTools(server: McpServer, ctx: ToolContext): void {
  const tools = [
    helpTool,
    auditTool,
    accountTool,
    containerTool,
    workspaceTool,
    versionTool,
    versionHeaderTool,
    tagTool,
    triggerTool,
    variableTool,
    folderTool,
    zoneTool,
    clientTool,
    transformationTool,
    templateTool,
    gtagConfigTool,
    builtInVariableTool,
    environmentTool,
    destinationTool,
    userPermissionTool,
  ];
  for (const register of tools) register(server, ctx);
}
