import { z } from "zod";
import { AccountSchema } from "../schemas/AccountSchema.js";
import { getTagManagerClient } from "../utils/client.js";
import { textResult, withGuards, requireField } from "./helpers.js";
import { ToolRegistration } from "./registry.js";

const PayloadSchema = AccountSchema.omit({ accountId: true });

export const accountTool: ToolRegistration = (server, ctx) => {
  server.tool(
    "gtm_account",
    "Gerencia contas GTM. Ações: list (sempre comece por aqui pra descobrir IDs de contas), get (detalhes de uma conta), update (renomeia ou altera config).",
    {
      action: z
        .enum(["get", "list", "update"])
        .describe("Operação: 'list' (lista todas), 'get' (detalhes), 'update' (modifica)."),
      accountId: z.string().optional().describe("ID da conta GTM. Obrigatório para 'get' e 'update'."),
      config: PayloadSchema.optional().describe("Dados a atualizar (só para 'update')."),
      confirm: z.boolean().optional().describe("Não usado nessa tool (sem operação destrutiva)."),
    },
    async (params) =>
      withGuards(ctx, params, "gtm_account", async () => {
        const tm = getTagManagerClient(await ctx.getAuth());
        switch (params.action) {
          case "list": {
            const r = await tm.accounts.list({});
            return textResult(r.data);
          }
          case "get": {
            const accountId = requireField(params.accountId, "accountId", "get");
            const r = await tm.accounts.get({ path: `accounts/${accountId}` });
            return textResult(r.data);
          }
          case "update": {
            const accountId = requireField(params.accountId, "accountId", "update");
            const config = requireField(params.config, "config", "update");
            const r = await tm.accounts.update({
              path: `accounts/${accountId}`,
              requestBody: config,
            });
            return textResult(r.data);
          }
        }
      }),
  );
};
