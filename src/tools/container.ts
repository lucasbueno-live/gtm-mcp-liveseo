import { z } from "zod";
import { CombineConfigSchema } from "../schemas/CombineConfigSchema.js";
import { ContainerSchema } from "../schemas/ContainerSchema.js";
import { MoveTagIdConfigSchema } from "../schemas/MoveTagIdConfigSchema.js";
import { getTagManagerClient } from "../utils/client.js";
import { paginateArray } from "../utils/pagination.js";
import { textResult, withGuards, requireField } from "./helpers.js";
import { ToolRegistration } from "./registry.js";

const ContainerPayload = ContainerSchema.omit({
  accountId: true,
  containerId: true,
  fingerprint: true,
});

const ITEMS_PER_PAGE = 50;

export const containerTool: ToolRegistration = (server, ctx) => {
  server.tool(
    "gtm_container",
    "Gerencia containers GTM dentro de uma conta. Use 'list' para descobrir IDs. 'snippet' retorna o código de instalação. 'remove' e 'combine' são destrutivos.",
    {
      action: z.enum([
        "create",
        "get",
        "list",
        "update",
        "remove",
        "combine",
        "lookup",
        "moveTagId",
        "snippet",
      ]),
      accountId: z.string().describe("ID da conta GTM."),
      containerId: z.string().optional().describe("ID do container. Obrigatório exceto em 'list', 'create' e 'lookup'."),
      destinationId: z.string().optional().describe("destinationId para 'lookup'."),
      config: ContainerPayload.optional().describe("Configuração para 'create' e 'update'."),
      combineConfig: CombineConfigSchema.omit({ accountId: true })
        .optional()
        .describe("Configuração para 'combine'."),
      moveTagIdConfig: MoveTagIdConfigSchema.omit({
        accountId: true,
        containerId: true,
      })
        .optional()
        .describe("Configuração para 'moveTagId'."),
      fingerprint: z.string().optional().describe("Fingerprint pra 'update'."),
      page: z.number().min(1).default(1),
      itemsPerPage: z.number().min(1).max(ITEMS_PER_PAGE).default(ITEMS_PER_PAGE),
      confirm: z.boolean().optional().describe("Obrigatório para 'remove'."),
    },
    async (params) =>
      withGuards(ctx, params, "gtm_container", async () => {
        const tm = getTagManagerClient(await ctx.getAuth());
        const { accountId, containerId, action } = params;
        switch (action) {
          case "list": {
            const r = await tm.accounts.containers.list({
              parent: `accounts/${accountId}`,
            });
            return textResult(
              paginateArray(r.data.container ?? [], params.page, params.itemsPerPage),
            );
          }
          case "get": {
            const id = requireField(containerId, "containerId", "get");
            const r = await tm.accounts.containers.get({
              path: `accounts/${accountId}/containers/${id}`,
            });
            return textResult(r.data);
          }
          case "create": {
            const config = requireField(params.config, "config", "create");
            const r = await tm.accounts.containers.create({
              parent: `accounts/${accountId}`,
              requestBody: config,
            });
            return textResult(r.data);
          }
          case "update": {
            const id = requireField(containerId, "containerId", "update");
            const config = requireField(params.config, "config", "update");
            const r = await tm.accounts.containers.update({
              path: `accounts/${accountId}/containers/${id}`,
              fingerprint: params.fingerprint ?? undefined,
              requestBody: config,
            });
            return textResult(r.data);
          }
          case "remove": {
            const id = requireField(containerId, "containerId", "remove");
            await tm.accounts.containers.delete({
              path: `accounts/${accountId}/containers/${id}`,
            });
            return textResult({ success: true, message: `Container ${id} removido.` });
          }
          case "snippet": {
            const id = requireField(containerId, "containerId", "snippet");
            const r = await tm.accounts.containers.snippet({
              path: `accounts/${accountId}/containers/${id}`,
            });
            return textResult(r.data);
          }
          case "lookup": {
            const destId = requireField(params.destinationId, "destinationId", "lookup");
            const r = await tm.accounts.containers.lookup({
              destinationId: destId,
            });
            return textResult(r.data);
          }
          case "combine": {
            const id = requireField(containerId, "containerId", "combine");
            const config = requireField(params.combineConfig, "combineConfig", "combine");
            const r = await tm.accounts.containers.combine({
              path: `accounts/${accountId}/containers/${id}`,
              ...config,
            });
            return textResult(r.data);
          }
          case "moveTagId": {
            const id = requireField(containerId, "containerId", "moveTagId");
            const cfg = requireField(params.moveTagIdConfig, "moveTagIdConfig", "moveTagId");
            const r = await tm.accounts.containers.move_tag_id({
              path: `accounts/${accountId}/containers/${id}`,
              ...cfg,
            });
            return textResult(r.data);
          }
        }
      }),
  );
};
