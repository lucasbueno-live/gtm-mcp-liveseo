import { z } from "zod";
import { ContainerVersionSchema } from "../schemas/ContainerVersionSchema.js";
import { getTagManagerClient } from "../utils/client.js";
import {
  processVersionData,
  VERSION_ITEMS_PER_PAGE,
  ResourceType,
} from "../utils/versionPagination.js";
import { textResult, withGuards, requireField } from "./helpers.js";
import { ToolRegistration } from "./registry.js";

const PayloadSchema = ContainerVersionSchema.omit({
  accountId: true,
  containerId: true,
  containerVersionId: true,
});

export const versionTool: ToolRegistration = (server, ctx) => {
  server.tool(
    "gtm_version",
    "Gerencia versões de container (snapshots imutáveis do GTM). 'live' retorna a versão atualmente publicada. 'publish' publica uma versão (afeta o site ao vivo — exige confirm: true). Para vistas grandes use resourceType + paginação.",
    {
      action: z.enum([
        "get",
        "live",
        "publish",
        "remove",
        "setLatest",
        "undelete",
        "update",
      ]),
      accountId: z.string().describe("ID da conta GTM."),
      containerId: z.string().describe("ID do container."),
      containerVersionId: z
        .string()
        .optional()
        .describe("ID da versão. Obrigatório exceto em 'live'."),
      config: PayloadSchema.optional().describe("Configuração para 'update'."),
      fingerprint: z.string().optional().describe("Fingerprint para 'publish' e 'update'."),
      resourceType: z
        .enum([
          "tag",
          "trigger",
          "variable",
          "folder",
          "builtInVariable",
          "zone",
          "customTemplate",
          "client",
          "gtagConfig",
          "transformation",
        ])
        .optional()
        .describe("Filtra um tipo específico de recurso ao retornar a versão (apenas em 'get' e 'live')."),
      page: z.number().min(1).default(1),
      itemsPerPage: z.number().min(1).max(VERSION_ITEMS_PER_PAGE).default(VERSION_ITEMS_PER_PAGE),
      includeSummary: z.boolean().default(true),
      confirm: z.boolean().optional().describe("Obrigatório para 'remove' e 'publish'."),
    },
    async (params) =>
      withGuards(ctx, { action: params.action, confirm: params.confirm }, "gtm_version", async () => {
        const tm = getTagManagerClient(await ctx.getAuth());
        const { accountId, containerId, containerVersionId, action } = params;
        const parent = `accounts/${accountId}/containers/${containerId}`;
        switch (action) {
          case "get": {
            const id = requireField(containerVersionId, "containerVersionId", "get");
            const r = await tm.accounts.containers.versions.get({
              path: `${parent}/versions/${id}`,
            });
            return textResult(
              processVersionData(
                r.data,
                params.resourceType as ResourceType | undefined,
                params.page,
                params.itemsPerPage,
                params.includeSummary,
              ),
            );
          }
          case "live": {
            const r = await tm.accounts.containers.versions.live({ parent });
            return textResult(
              processVersionData(
                r.data,
                params.resourceType as ResourceType | undefined,
                params.page,
                params.itemsPerPage,
                params.includeSummary,
              ),
            );
          }
          case "publish": {
            const id = requireField(containerVersionId, "containerVersionId", "publish");
            const r = await tm.accounts.containers.versions.publish({
              path: `${parent}/versions/${id}`,
              fingerprint: params.fingerprint,
            });
            return textResult(r.data);
          }
          case "remove": {
            const id = requireField(containerVersionId, "containerVersionId", "remove");
            await tm.accounts.containers.versions.delete({
              path: `${parent}/versions/${id}`,
            });
            return textResult({
              success: true,
              message: `Versão ${id} removida.`,
            });
          }
          case "setLatest": {
            const id = requireField(containerVersionId, "containerVersionId", "setLatest");
            const r = await tm.accounts.containers.versions.set_latest({
              path: `${parent}/versions/${id}`,
            });
            return textResult(r.data);
          }
          case "undelete": {
            const id = requireField(containerVersionId, "containerVersionId", "undelete");
            const r = await tm.accounts.containers.versions.undelete({
              path: `${parent}/versions/${id}`,
            });
            return textResult(r.data);
          }
          case "update": {
            const id = requireField(containerVersionId, "containerVersionId", "update");
            const config = requireField(params.config, "config", "update");
            const fingerprint = requireField(params.fingerprint, "fingerprint", "update");
            const r = await tm.accounts.containers.versions.update({
              path: `${parent}/versions/${id}`,
              fingerprint,
              requestBody: config,
            });
            return textResult(r.data);
          }
        }
      }),
  );
};
