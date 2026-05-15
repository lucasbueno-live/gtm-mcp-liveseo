import { z } from "zod";
import { textResult } from "./helpers.js";
import { ToolRegistration } from "./registry.js";
import { createErrorResponse } from "../utils/errors.js";
import { loginProfile, resetClient } from "../auth/oauth.js";
import {
  listProfiles,
  loadProfile,
  deleteProfile,
  sanitizeProfileName,
  DEFAULT_PROFILE,
} from "../auth/tokenStore.js";

export const authTool: ToolRegistration = (server, ctx) => {
  server.tool(
    "gtm_auth",
    "Gerencia QUAL conta Google está logada (multi-conta por perfil). Use quando precisar trocar de cliente: cada cliente/email vira um 'perfil' salvo. Ações: 'status' (perfil ativo), 'list' (todos os perfis e emails), 'login' (autentica um perfil — abre o navegador com o seletor de contas Google), 'switch' (troca o perfil ativo sem refazer login), 'logout' (remove o token de um perfil).",
    {
      action: z
        .enum(["status", "list", "login", "switch", "logout"])
        .describe(
          "status: mostra a conta ativa. list: lista perfis salvos. login: autentica/reautentica um perfil (abre navegador). switch: troca o perfil ativo. logout: remove um perfil.",
        ),
      profile: z
        .string()
        .optional()
        .describe(
          "Nome do perfil (ex: 'cliente-x', 'live-conta2'). Obrigatório para 'login' e 'switch'. Para 'logout' usa o ativo se omitido. Dica: use o nome do cliente como perfil.",
        ),
    },
    async ({ action, profile }) => {
      try {
        switch (action) {
          case "status": {
            const active = ctx.session.getActiveProfile();
            const data = await loadProfile(active);
            return textResult(
              `Perfil ativo: **${active}**\n` +
                `Conta Google: ${data?.email ?? "(ainda não autenticado — a próxima ação GTM vai abrir o login)"}\n` +
                `Modo: ${ctx.config.readonly ? "somente leitura" : "escrita habilitada (--write)"}`,
            );
          }

          case "list": {
            const profiles = await listProfiles();
            if (!profiles.length) {
              return textResult(
                "Nenhum perfil salvo ainda. Use action='login' com um nome de perfil pra criar o primeiro (ex: profile='cliente-x').",
              );
            }
            const lines = profiles.map(
              (p) =>
                `${p.active ? "➡️ " : "   "}**${p.name}** — ${p.email ?? "(sem email registrado)"}`,
            );
            return textResult(
              `Perfis salvos (${profiles.length}):\n${lines.join("\n")}\n\nPerfil ativo marcado com ➡️. Use action='switch' pra trocar.`,
            );
          }

          case "login": {
            if (!profile) {
              return createErrorResponse(
                "gtm_auth.login",
                new Error(
                  "Informe 'profile' (ex: 'cliente-x'). Vou abrir o navegador com o seletor de contas Google pra você escolher o email desse cliente.",
                ),
              );
            }
            const name = sanitizeProfileName(profile);
            const { email } = await loginProfile(
              ctx.session.getConfig(),
              name,
            );
            await ctx.session.setActiveProfile(name);
            return textResult(
              `✅ Perfil **${name}** autenticado como ${email ?? "conta Google"} e definido como ativo.\n` +
                `Daqui pra frente as operações GTM usam essa conta. Pra trocar depois: gtm_auth switch profile='${name}'.`,
            );
          }

          case "switch": {
            if (!profile) {
              return createErrorResponse(
                "gtm_auth.switch",
                new Error("Informe 'profile' com o nome do perfil para o qual trocar. Use gtm_auth list pra ver os disponíveis."),
              );
            }
            const name = sanitizeProfileName(profile);
            const data = await loadProfile(name);
            if (!data?.tokens?.refresh_token) {
              return textResult(
                `⚠️ O perfil **${name}** ainda não tem login salvo. Rode gtm_auth login profile='${name}' primeiro (vai abrir o navegador).`,
              );
            }
            await ctx.session.setActiveProfile(name);
            return textResult(
              `✅ Perfil ativo agora é **${name}** (${data.email ?? "conta Google"}). Sem necessidade de refazer login.`,
            );
          }

          case "logout": {
            const target = sanitizeProfileName(
              profile || ctx.session.getActiveProfile(),
            );
            await deleteProfile(target);
            resetClient(target);
            if (target === ctx.session.getActiveProfile()) {
              await ctx.session.setActiveProfile(DEFAULT_PROFILE);
            }
            return textResult(
              `🗑️ Perfil **${target}** removido (token apagado). ` +
                `A próxima operação que precisar dele vai pedir login de novo.`,
            );
          }
        }
      } catch (error) {
        return createErrorResponse(`gtm_auth.${action}`, error);
      }
    },
  );
};
