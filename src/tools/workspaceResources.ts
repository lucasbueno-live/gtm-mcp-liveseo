import { TagSchema } from "../schemas/TagSchema.js";
import { TriggerSchema } from "../schemas/TriggerSchema.js";
import { VariableSchema } from "../schemas/VariableSchema.js";
import { FolderSchema } from "../schemas/FolderSchema.js";
import { ZoneSchema } from "../schemas/ZoneSchema.js";
import { ClientSchema } from "../schemas/ClientSchema.js";
import { TransformationSchema } from "../schemas/TransformationSchema.js";
import { CustomTemplateSchema } from "../schemas/CustomTemplateSchema.js";
import { GtagConfigSchema } from "../schemas/GtagConfigSchema.js";
import { createWorkspaceResourceTool } from "./workspaceResourceFactory.js";

export const tagTool = createWorkspaceResourceTool({
  toolName: "gtm_tag",
  resourceLabel: "tags",
  resourceIdParamName: "tagId",
  payloadSchema: TagSchema.omit({
    accountId: true,
    containerId: true,
    workspaceId: true,
    tagId: true,
    fingerprint: true,
  }),
  itemsPerPage: 20,
  listResultKey: "tag",
  supportsRevert: true,
  pickClient: (tm) => tm.accounts.containers.workspaces.tags as never,
});

export const triggerTool = createWorkspaceResourceTool({
  toolName: "gtm_trigger",
  resourceLabel: "triggers",
  resourceIdParamName: "triggerId",
  payloadSchema: TriggerSchema.omit({
    accountId: true,
    containerId: true,
    workspaceId: true,
    triggerId: true,
    fingerprint: true,
  }),
  listResultKey: "trigger",
  supportsRevert: true,
  pickClient: (tm) => tm.accounts.containers.workspaces.triggers as never,
});

export const variableTool = createWorkspaceResourceTool({
  toolName: "gtm_variable",
  resourceLabel: "variáveis",
  resourceIdParamName: "variableId",
  payloadSchema: VariableSchema.omit({
    accountId: true,
    containerId: true,
    workspaceId: true,
    variableId: true,
    fingerprint: true,
  }),
  listResultKey: "variable",
  supportsRevert: true,
  pickClient: (tm) => tm.accounts.containers.workspaces.variables as never,
});

export const folderTool = createWorkspaceResourceTool({
  toolName: "gtm_folder",
  resourceLabel: "folders",
  resourceIdParamName: "folderId",
  payloadSchema: FolderSchema.omit({
    accountId: true,
    containerId: true,
    workspaceId: true,
    folderId: true,
    fingerprint: true,
  }),
  listResultKey: "folder",
  pickClient: (tm) => tm.accounts.containers.workspaces.folders as never,
});

export const zoneTool = createWorkspaceResourceTool({
  toolName: "gtm_zone",
  resourceLabel: "zones",
  resourceIdParamName: "zoneId",
  payloadSchema: ZoneSchema.omit({
    accountId: true,
    containerId: true,
    workspaceId: true,
    zoneId: true,
    fingerprint: true,
  }),
  listResultKey: "zone",
  supportsRevert: true,
  pickClient: (tm) => tm.accounts.containers.workspaces.zones as never,
});

export const clientTool = createWorkspaceResourceTool({
  toolName: "gtm_client",
  resourceLabel: "clients (server-side)",
  resourceIdParamName: "clientId",
  payloadSchema: ClientSchema.omit({
    accountId: true,
    containerId: true,
    workspaceId: true,
    clientId: true,
    fingerprint: true,
  }),
  listResultKey: "client",
  supportsRevert: true,
  pickClient: (tm) => tm.accounts.containers.workspaces.clients as never,
});

export const transformationTool = createWorkspaceResourceTool({
  toolName: "gtm_transformation",
  resourceLabel: "transformations",
  resourceIdParamName: "transformationId",
  payloadSchema: TransformationSchema.omit({
    accountId: true,
    containerId: true,
    workspaceId: true,
    transformationId: true,
    fingerprint: true,
  }),
  listResultKey: "transformation",
  supportsRevert: true,
  pickClient: (tm) =>
    tm.accounts.containers.workspaces.transformations as never,
});

export const templateTool = createWorkspaceResourceTool({
  toolName: "gtm_template",
  resourceLabel: "custom templates",
  resourceIdParamName: "templateId",
  payloadSchema: CustomTemplateSchema.omit({
    accountId: true,
    containerId: true,
    workspaceId: true,
    templateId: true,
    fingerprint: true,
  }),
  listResultKey: "template",
  supportsRevert: true,
  pickClient: (tm) => tm.accounts.containers.workspaces.templates as never,
});

export const gtagConfigTool = createWorkspaceResourceTool({
  toolName: "gtm_gtag_config",
  resourceLabel: "Google tag configs",
  resourceIdParamName: "gtagConfigId",
  payloadSchema: GtagConfigSchema.omit({
    accountId: true,
    containerId: true,
    workspaceId: true,
    gtagConfigId: true,
    fingerprint: true,
  }),
  listResultKey: "gtagConfig",
  pickClient: (tm) =>
    (tm.accounts.containers.workspaces as unknown as Record<string, unknown>)
      .gtag_config as never,
});
