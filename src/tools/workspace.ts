import { z } from "zod";
import { TagSchema } from "../schemas/TagSchema.js";
import { TriggerSchema } from "../schemas/TriggerSchema.js";
import { VariableSchema } from "../schemas/VariableSchema.js";
import { FolderSchema } from "../schemas/FolderSchema.js";
import { TransformationSchema } from "../schemas/TransformationSchema.js";
import { ZoneSchema } from "../schemas/ZoneSchema.js";
import { CustomTemplateSchema } from "../schemas/CustomTemplateSchema.js";
import { BuiltInVariableSchema } from "../schemas/BuiltInVariableSchema.js";
import { GtagConfigSchema } from "../schemas/GtagConfigSchema.js";
import { WorkspaceSchema } from "../schemas/WorkspaceSchema.js";
import { getTagManagerClient } from "../utils/client.js";
import { paginateArray } from "../utils/pagination.js";
import { textResult, withGuards, requireField } from "./helpers.js";
import { ToolRegistration } from "./registry.js";

const PayloadSchema = WorkspaceSchema.omit({
  accountId: true,
  containerId: true,
  workspaceId: true,
  fingerprint: true,
});

const EntitySchema = z.union([
  z.object({ tag: TagSchema }),
  z.object({ trigger: TriggerSchema }),
  z.object({ variable: VariableSchema }),
  z.object({ folder: FolderSchema }),
  z.object({ client: TransformationSchema }),
  z.object({ transformation: TransformationSchema }),
  z.object({ zone: ZoneSchema }),
  z.object({ customTemplate: CustomTemplateSchema }),
  z.object({ builtInVariable: BuiltInVariableSchema }),
  z.object({ gtagConfig: GtagConfigSchema }),
]);

const ITEMS_PER_PAGE = 50;

export const workspaceTool: ToolRegistration = (server, ctx) => {
  server.tool(
    "gtm_workspace",
    "Gerencia workspaces GTM (rascunhos de trabalho). 'createVersion' converte o workspace em uma versão imutável — passo necessário antes de publicar. 'quickPreview' gera uma URL de preview sem publicar. 'getStatus' lista as mudanças pendentes.",
    {
      action: z.enum([
        "create",
        "get",
        "list",
        "update",
        "remove",
        "createVersion",
        "getStatus",
        "sync",
        "quickPreview",
        "resolveConflict",
      ]),
      accountId: z.string().describe("ID da conta GTM."),
      containerId: z.string().describe("ID do container."),
      workspaceId: z.string().optional().describe("ID do workspace. Obrigatório exceto em 'create' e 'list'."),
      config: PayloadSchema.optional().describe("Configuração para 'create', 'update', 'createVersion'."),
      fingerprint: z.string().optional().describe("Fingerprint para 'update' e 'resolveConflict'."),
      entity: EntitySchema.optional().describe("Entidade resolvida para 'resolveConflict'."),
      changeStatus: z
        .enum(["added", "modified", "deleted", "unmodified"])
        .optional()
        .describe("Status da mudança para 'resolveConflict'."),
      page: z.number().min(1).default(1),
      itemsPerPage: z.number().min(1).max(ITEMS_PER_PAGE).default(ITEMS_PER_PAGE),
      confirm: z.boolean().optional().describe("Obrigatório para 'remove'."),
    },
    async (params) =>
      withGuards(ctx, params, "gtm_workspace", async () => {
        const tm = getTagManagerClient(await ctx.getAuth());
        const { accountId, containerId, workspaceId, action } = params;
        const parent = `accounts/${accountId}/containers/${containerId}`;
        const path = `${parent}/workspaces/${workspaceId}`;
        switch (action) {
          case "create": {
            const config = requireField(params.config, "config", "create");
            const r = await tm.accounts.containers.workspaces.create({
              parent,
              requestBody: config,
            });
            return textResult(r.data);
          }
          case "get": {
            requireField(workspaceId, "workspaceId", "get");
            const r = await tm.accounts.containers.workspaces.get({ path });
            return textResult(r.data);
          }
          case "list": {
            let all: unknown[] = [];
            let token: string | undefined;
            do {
              const r = await tm.accounts.containers.workspaces.list({
                parent,
                pageToken: token,
              });
              all = all.concat(r.data.workspace ?? []);
              token = r.data.nextPageToken ?? undefined;
            } while (token);
            return textResult(paginateArray(all, params.page, params.itemsPerPage));
          }
          case "update": {
            requireField(workspaceId, "workspaceId", "update");
            const config = requireField(params.config, "config", "update");
            const r = await tm.accounts.containers.workspaces.update({
              path,
              fingerprint: params.fingerprint,
              requestBody: config,
            });
            return textResult(r.data);
          }
          case "remove": {
            requireField(workspaceId, "workspaceId", "remove");
            await tm.accounts.containers.workspaces.delete({ path });
            return textResult({
              success: true,
              message: `Workspace ${workspaceId} removido.`,
            });
          }
          case "createVersion": {
            requireField(workspaceId, "workspaceId", "createVersion");
            const r = await tm.accounts.containers.workspaces.create_version({
              path,
              requestBody: params.config ?? {},
            });
            return textResult(r.data);
          }
          case "getStatus": {
            requireField(workspaceId, "workspaceId", "getStatus");
            const r = await tm.accounts.containers.workspaces.getStatus({ path });
            return textResult(r.data);
          }
          case "sync": {
            requireField(workspaceId, "workspaceId", "sync");
            const r = await tm.accounts.containers.workspaces.sync({ path });
            return textResult(r.data);
          }
          case "quickPreview": {
            requireField(workspaceId, "workspaceId", "quickPreview");
            const r = await tm.accounts.containers.workspaces.quick_preview({
              path,
            });
            return textResult(r.data);
          }
          case "resolveConflict": {
            requireField(workspaceId, "workspaceId", "resolveConflict");
            const fingerprint = requireField(params.fingerprint, "fingerprint", "resolveConflict");
            const entity = requireField(params.entity, "entity", "resolveConflict");
            const changeStatus = requireField(params.changeStatus, "changeStatus", "resolveConflict");
            const entityKey = Object.keys(entity)[0];
            await tm.accounts.containers.workspaces.resolve_conflict({
              path,
              fingerprint,
              requestBody: {
                changeStatus,
                [entityKey]: (entity as Record<string, unknown>)[entityKey],
              } as never,
            });
            return textResult({
              success: true,
              message: `Conflito resolvido no workspace ${workspaceId}.`,
            });
          }
        }
      }),
  );
};
