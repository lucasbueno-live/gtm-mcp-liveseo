import { z } from "zod";
import { EnvironmentSchema } from "../schemas/EnvironmentSchema.js";
import { UserPermissionSchema } from "../schemas/UserPermissionSchema.js";
import { getTagManagerClient } from "../utils/client.js";
import { paginateArray } from "../utils/pagination.js";
import { textResult, withGuards, requireField } from "./helpers.js";
import { ToolRegistration } from "./registry.js";

const ITEMS = 50;

export const builtInVariableTool: ToolRegistration = (server, ctx) => {
  server.tool(
    "gtm_built_in_variable",
    "Habilita ou desabilita variáveis built-in num workspace (Page URL, Click Classes, etc.). Use 'list' pra ver as disponíveis. 'create' aceita um array de types pra habilitar várias de uma vez.",
    {
      action: z.enum(["create", "list", "remove", "revert"]),
      accountId: z.string(),
      containerId: z.string(),
      workspaceId: z.string(),
      type: z.string().optional().describe("Tipo único pra 'revert'."),
      types: z.array(z.string()).optional().describe("Tipos pra 'create' e 'remove'."),
      page: z.number().min(1).default(1),
      itemsPerPage: z.number().min(1).max(ITEMS).default(ITEMS),
      confirm: z.boolean().optional().describe("Obrigatório para 'remove'."),
    },
    async (params) =>
      withGuards(ctx, params, "gtm_built_in_variable", async () => {
        const tm = getTagManagerClient(await ctx.getAuth());
        const { accountId, containerId, workspaceId, action } = params;
        const parent = `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`;
        const path = `${parent}/built_in_variables`;
        switch (action) {
          case "create": {
            const types = requireField(params.types, "types", "create");
            const r = await tm.accounts.containers.workspaces.built_in_variables.create({
              parent,
              type: types,
            });
            return textResult(r.data);
          }
          case "list": {
            let all: unknown[] = [];
            let token: string | undefined;
            do {
              const r = await tm.accounts.containers.workspaces.built_in_variables.list({
                parent,
                pageToken: token,
              });
              all = all.concat(r.data.builtInVariable ?? []);
              token = r.data.nextPageToken ?? undefined;
            } while (token);
            return textResult(paginateArray(all, params.page, params.itemsPerPage));
          }
          case "remove": {
            const types = requireField(params.types, "types", "remove");
            await tm.accounts.containers.workspaces.built_in_variables.delete({
              path,
              type: types,
            });
            return textResult({ success: true, message: "Built-in variables removidas." });
          }
          case "revert": {
            const type = requireField(params.type, "type", "revert");
            const r = await tm.accounts.containers.workspaces.built_in_variables.revert({
              path,
              type,
            });
            return textResult(r.data);
          }
        }
      }),
  );
};

const EnvPayload = EnvironmentSchema.omit({
  accountId: true,
  containerId: true,
  environmentId: true,
  fingerprint: true,
});

export const environmentTool: ToolRegistration = (server, ctx) => {
  server.tool(
    "gtm_environment",
    "Gerencia environments do container (Live, Latest, custom). Use 'reauthorize' pra renovar a auth de um environment.",
    {
      action: z.enum(["create", "get", "list", "update", "remove", "reauthorize"]),
      accountId: z.string(),
      containerId: z.string(),
      environmentId: z.string().optional(),
      config: EnvPayload.optional(),
      fingerprint: z.string().optional(),
      page: z.number().min(1).default(1),
      itemsPerPage: z.number().min(1).max(ITEMS).default(ITEMS),
      confirm: z.boolean().optional(),
    },
    async (params) =>
      withGuards(ctx, params, "gtm_environment", async () => {
        const tm = getTagManagerClient(await ctx.getAuth());
        const { accountId, containerId, environmentId, action } = params;
        const parent = `accounts/${accountId}/containers/${containerId}`;
        const path = `${parent}/environments/${environmentId}`;
        switch (action) {
          case "create": {
            const config = requireField(params.config, "config", "create");
            const r = await tm.accounts.containers.environments.create({
              parent,
              requestBody: config,
            });
            return textResult(r.data);
          }
          case "get": {
            requireField(environmentId, "environmentId", "get");
            const r = await tm.accounts.containers.environments.get({ path });
            return textResult(r.data);
          }
          case "list": {
            let all: unknown[] = [];
            let token: string | undefined;
            do {
              const r = await tm.accounts.containers.environments.list({
                parent,
                pageToken: token,
              });
              all = all.concat(r.data.environment ?? []);
              token = r.data.nextPageToken ?? undefined;
            } while (token);
            return textResult(paginateArray(all, params.page, params.itemsPerPage));
          }
          case "update": {
            requireField(environmentId, "environmentId", "update");
            const config = requireField(params.config, "config", "update");
            const r = await tm.accounts.containers.environments.update({
              path,
              fingerprint: params.fingerprint,
              requestBody: config,
            });
            return textResult(r.data);
          }
          case "remove": {
            requireField(environmentId, "environmentId", "remove");
            await tm.accounts.containers.environments.delete({ path });
            return textResult({ success: true, message: `Environment ${environmentId} removido.` });
          }
          case "reauthorize": {
            requireField(environmentId, "environmentId", "reauthorize");
            const r = await tm.accounts.containers.environments.reauthorize({
              path,
              requestBody: params.config ?? {},
            });
            return textResult(r.data);
          }
        }
      }),
  );
};

export const destinationTool: ToolRegistration = (server, ctx) => {
  server.tool(
    "gtm_destination",
    "Lista destinations (Google tag IDs) ligados a um container, conecta ou desconecta um destino.",
    {
      action: z.enum(["get", "list", "link", "unlink"]),
      accountId: z.string(),
      containerId: z.string(),
      destinationId: z.string().optional(),
      allowUserPermissionFeatureUpdate: z.boolean().optional(),
      page: z.number().min(1).default(1),
      itemsPerPage: z.number().min(1).max(ITEMS).default(ITEMS),
      confirm: z.boolean().optional(),
    },
    async (params) =>
      withGuards(ctx, params, "gtm_destination", async () => {
        const tm = getTagManagerClient(await ctx.getAuth());
        const { accountId, containerId, destinationId, action } = params;
        const parent = `accounts/${accountId}/containers/${containerId}`;
        switch (action) {
          case "get": {
            requireField(destinationId, "destinationId", "get");
            const r = await tm.accounts.containers.destinations.get({
              path: `${parent}/destinations/${destinationId}`,
            });
            return textResult(r.data);
          }
          case "list": {
            const r = await tm.accounts.containers.destinations.list({ parent });
            const items = (r.data as { destination?: unknown[] }).destination ?? [];
            return textResult(paginateArray(items, params.page, params.itemsPerPage));
          }
          case "link": {
            const id = requireField(destinationId, "destinationId", "link");
            const r = await tm.accounts.containers.destinations.link({
              parent,
              destinationId: id,
              allowUserPermissionFeatureUpdate: params.allowUserPermissionFeatureUpdate,
            });
            return textResult(r.data);
          }
          case "unlink": {
            const id = requireField(destinationId, "destinationId", "unlink");
            await tm.accounts.containers.destinations.link({
              parent,
              destinationId: id,
            });
            return textResult({ success: true, message: `Destination ${id} desconectado.` });
          }
        }
      }),
  );
};

export const userPermissionTool: ToolRegistration = (server, ctx) => {
  server.tool(
    "gtm_user_permission",
    "Gerencia permissões de usuário em uma conta GTM. Ações destrutivas (remove, update) afetam acesso de pessoas reais — use com cuidado.",
    {
      action: z.enum(["create", "get", "list", "update", "remove"]),
      accountId: z.string(),
      userPermissionId: z.string().optional(),
      config: UserPermissionSchema.optional(),
      page: z.number().min(1).default(1),
      itemsPerPage: z.number().min(1).max(ITEMS).default(ITEMS),
      confirm: z.boolean().optional(),
    },
    async (params) =>
      withGuards(ctx, params, "gtm_user_permission", async () => {
        const tm = getTagManagerClient(await ctx.getAuth());
        const { accountId, userPermissionId, action } = params;
        const parent = `accounts/${accountId}`;
        const path = `${parent}/user_permissions/${userPermissionId}`;
        switch (action) {
          case "create": {
            const config = requireField(params.config, "config", "create");
            const r = await tm.accounts.user_permissions.create({
              parent,
              requestBody: config,
            });
            return textResult(r.data);
          }
          case "get": {
            requireField(userPermissionId, "userPermissionId", "get");
            const r = await tm.accounts.user_permissions.get({ path });
            return textResult(r.data);
          }
          case "list": {
            let all: unknown[] = [];
            let token: string | undefined;
            do {
              const r = await tm.accounts.user_permissions.list({
                parent,
                pageToken: token,
              });
              all = all.concat(r.data.userPermission ?? []);
              token = r.data.nextPageToken ?? undefined;
            } while (token);
            return textResult(paginateArray(all, params.page, params.itemsPerPage));
          }
          case "update": {
            requireField(userPermissionId, "userPermissionId", "update");
            const config = requireField(params.config, "config", "update");
            const r = await tm.accounts.user_permissions.update({
              path,
              requestBody: config,
            });
            return textResult(r.data);
          }
          case "remove": {
            requireField(userPermissionId, "userPermissionId", "remove");
            await tm.accounts.user_permissions.delete({ path });
            return textResult({ success: true, message: `Permissão ${userPermissionId} removida.` });
          }
        }
      }),
  );
};

export const versionHeaderTool: ToolRegistration = (server, ctx) => {
  server.tool(
    "gtm_version_header",
    "Lista os headers (resumos) das versões publicadas de um container. Use 'latest' pra pegar a mais recente, 'list' pra ver o histórico.",
    {
      action: z.enum(["list", "latest"]),
      accountId: z.string(),
      containerId: z.string(),
      includeDeleted: z.boolean().default(false),
      page: z.number().min(1).default(1),
      itemsPerPage: z.number().min(1).max(ITEMS).default(ITEMS),
      confirm: z.boolean().optional(),
    },
    async (params) =>
      withGuards(ctx, params, "gtm_version_header", async () => {
        const tm = getTagManagerClient(await ctx.getAuth());
        const { accountId, containerId, action } = params;
        const parent = `accounts/${accountId}/containers/${containerId}`;
        switch (action) {
          case "list": {
            let all: unknown[] = [];
            let token: string | undefined;
            do {
              const r = await tm.accounts.containers.version_headers.list({
                parent,
                includeDeleted: params.includeDeleted,
                pageToken: token,
              });
              all = all.concat(r.data.containerVersionHeader ?? []);
              token = r.data.nextPageToken ?? undefined;
            } while (token);
            return textResult(paginateArray(all, params.page, params.itemsPerPage));
          }
          case "latest": {
            const r = await tm.accounts.containers.version_headers.latest({ parent });
            return textResult(r.data);
          }
        }
      }),
  );
};
