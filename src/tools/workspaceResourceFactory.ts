import { z, ZodType } from "zod";
import { tagmanager_v2 } from "@googleapis/tagmanager";
import { getTagManagerClient } from "../utils/client.js";
import { paginateArray } from "../utils/pagination.js";
import { textResult, withGuards, requireField } from "./helpers.js";
import { ToolRegistration, ToolContext } from "./registry.js";

type ResourceClient = {
  create: (args: { parent: string; requestBody: unknown }) => Promise<{ data: unknown }>;
  get: (args: { path: string }) => Promise<{ data: unknown }>;
  list: (args: { parent: string; pageToken?: string }) => Promise<{
    data: { nextPageToken?: string | null; [k: string]: unknown };
  }>;
  update?: (args: {
    path: string;
    fingerprint?: string;
    requestBody: unknown;
  }) => Promise<{ data: unknown }>;
  delete?: (args: { path: string }) => Promise<unknown>;
  revert?: (args: { path: string; fingerprint?: string }) => Promise<{ data: unknown }>;
};

export interface WorkspaceResourceOptions<TPayload> {
  toolName: string;
  resourceLabel: string;
  resourceIdParamName: string;
  payloadSchema: ZodType<TPayload>;
  itemsPerPage?: number;
  listResultKey: string;
  supportsRevert?: boolean;
  pickClient: (tm: tagmanager_v2.Tagmanager) => ResourceClient;
}

export function createWorkspaceResourceTool<TPayload>(
  opts: WorkspaceResourceOptions<TPayload>,
): ToolRegistration {
  const itemsPerPage = opts.itemsPerPage ?? 50;
  return (server, ctx: ToolContext) => {
    const actions = opts.supportsRevert
      ? (["create", "get", "list", "update", "remove", "revert"] as const)
      : (["create", "get", "list", "update", "remove"] as const);
    server.tool(
      opts.toolName,
      `Gerencia ${opts.resourceLabel} dentro de um workspace GTM. Ações: ${actions.join(", ")}. 'list' lista todos os itens (paginação client-side, ${itemsPerPage}/página).`,
      {
        action: z.enum(actions),
        accountId: z.string().describe("ID da conta GTM."),
        containerId: z.string().describe("ID do container."),
        workspaceId: z.string().describe("ID do workspace."),
        [opts.resourceIdParamName]: z.string().optional().describe(
          `ID do ${opts.resourceLabel.replace(/s$/, "")}. Obrigatório para get/update/remove/revert.`,
        ),
        config: opts.payloadSchema.optional().describe(
          `Configuração para 'create' e 'update'.`,
        ),
        fingerprint: z.string().optional().describe(
          "Fingerprint para 'update' e 'revert'.",
        ),
        page: z.number().min(1).default(1),
        itemsPerPage: z.number().min(1).max(itemsPerPage).default(itemsPerPage),
        confirm: z.boolean().optional().describe("Obrigatório para 'remove'."),
      },
      async (params) =>
        withGuards(ctx, params as { action: string; confirm?: boolean }, opts.toolName, async () => {
          const tm = getTagManagerClient(await ctx.getAuth());
          const client = opts.pickClient(tm);
          const action = params.action as string;
          const accountId = params.accountId as string;
          const containerId = params.containerId as string;
          const workspaceId = params.workspaceId as string;
          const resourceId = (params as Record<string, unknown>)[
            opts.resourceIdParamName
          ] as string | undefined;
          const parent = `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`;

          switch (action) {
            case "create": {
              const config = requireField(
                (params as Record<string, unknown>)["config"],
                "config",
                "create",
              );
              if (!client.create) throw new Error(`Operação 'create' não suportada.`);
              const r = await client.create({ parent, requestBody: config });
              return textResult(r.data);
            }
            case "get": {
              const id = requireField(resourceId, opts.resourceIdParamName, "get");
              const r = await client.get({ path: `${parent}/${opts.listResultKey}/${id}` });
              return textResult(r.data);
            }
            case "list": {
              let all: unknown[] = [];
              let pageToken: string | undefined;
              do {
                const r = await client.list({ parent, pageToken });
                const items =
                  (r.data[opts.listResultKey] as unknown[] | undefined) ?? [];
                all = all.concat(items);
                pageToken = r.data.nextPageToken ?? undefined;
              } while (pageToken);
              return textResult(
                paginateArray(all, params.page as number, params.itemsPerPage as number),
              );
            }
            case "update": {
              if (!client.update) throw new Error(`Operação 'update' não suportada.`);
              const id = requireField(resourceId, opts.resourceIdParamName, "update");
              const config = requireField(
                (params as Record<string, unknown>)["config"],
                "config",
                "update",
              );
              const r = await client.update({
                path: `${parent}/${opts.listResultKey}/${id}`,
                fingerprint: params.fingerprint as string | undefined,
                requestBody: config,
              });
              return textResult(r.data);
            }
            case "remove": {
              if (!client.delete) throw new Error(`Operação 'remove' não suportada.`);
              const id = requireField(resourceId, opts.resourceIdParamName, "remove");
              await client.delete({ path: `${parent}/${opts.listResultKey}/${id}` });
              return textResult({
                success: true,
                message: `${opts.resourceLabel} ${id} removido.`,
              });
            }
            case "revert": {
              if (!client.revert) throw new Error(`Operação 'revert' não suportada.`);
              const id = requireField(resourceId, opts.resourceIdParamName, "revert");
              const r = await client.revert({
                path: `${parent}/${opts.listResultKey}/${id}`,
                fingerprint: params.fingerprint as string | undefined,
              });
              return textResult(r.data);
            }
            default:
              throw new Error(`Ação desconhecida: ${action}`);
          }
        }),
    );
  };
}
