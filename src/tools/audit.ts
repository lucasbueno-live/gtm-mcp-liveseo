import { z } from "zod";
import { tagmanager_v2 } from "@googleapis/tagmanager";
import { getTagManagerClient } from "../utils/client.js";
import { textResult, withGuards } from "./helpers.js";
import { ToolRegistration } from "./registry.js";

type Schema$Workspace = tagmanager_v2.Schema$Workspace;
type Schema$Tag = tagmanager_v2.Schema$Tag;
type Schema$Trigger = tagmanager_v2.Schema$Trigger;
type Schema$Variable = tagmanager_v2.Schema$Variable;
type Schema$ContainerVersionHeader =
  tagmanager_v2.Schema$ContainerVersionHeader;

export const auditTool: ToolRegistration = (server, ctx) => {
  server.tool(
    "gtm_audit_container",
    "Auditoria humana de um container GTM. Retorna relatório em markdown com: contagem de tags/triggers/variáveis, tags pausadas, tags sem trigger, triggers órfãos, variáveis não referenciadas e data da última publicação. Tudo read-only.",
    {
      accountId: z.string().describe("ID da conta GTM."),
      containerId: z.string().describe("ID do container a auditar."),
      workspaceId: z
        .string()
        .optional()
        .describe(
          "ID do workspace a auditar. Se omitido, usa o primeiro workspace listado (geralmente 'Default Workspace').",
        ),
    },
    async (params) =>
      withGuards(ctx, { action: "list" }, "gtm_audit_container", async () => {
        const tm = getTagManagerClient(await ctx.getAuth());
        const { accountId, containerId } = params;
        let workspaceId = params.workspaceId;

        if (!workspaceId) {
          const wList = await tm.accounts.containers.workspaces.list({
            parent: `accounts/${accountId}/containers/${containerId}`,
          });
          const first = (wList.data.workspace ?? [])[0] as
            | Schema$Workspace
            | undefined;
          if (!first?.workspaceId) {
            return textResult(
              `❌ Nenhum workspace encontrado no container ${containerId}.`,
            );
          }
          workspaceId = first.workspaceId;
        }

        const parent = `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`;

        const [tagsR, triggersR, variablesR, versionHeadersR, containerR] =
          await Promise.all([
            tm.accounts.containers.workspaces.tags.list({ parent }),
            tm.accounts.containers.workspaces.triggers.list({ parent }),
            tm.accounts.containers.workspaces.variables.list({ parent }),
            tm.accounts.containers.version_headers.latest({
              parent: `accounts/${accountId}/containers/${containerId}`,
            }),
            tm.accounts.containers.get({
              path: `accounts/${accountId}/containers/${containerId}`,
            }),
          ]);

        const tags: Schema$Tag[] = tagsR.data.tag ?? [];
        const triggers: Schema$Trigger[] = triggersR.data.trigger ?? [];
        const variables: Schema$Variable[] = variablesR.data.variable ?? [];
        const latestVersion =
          versionHeadersR.data as Schema$ContainerVersionHeader;

        const pausedTags = tags.filter((t) => t.paused);
        const tagsWithoutTrigger = tags.filter(
          (t) => !(t.firingTriggerId?.length ?? 0),
        );
        const usedTriggerIds = new Set(
          tags.flatMap((t) => t.firingTriggerId ?? []),
        );
        const orphanTriggers = triggers.filter(
          (t) => t.triggerId && !usedTriggerIds.has(t.triggerId),
        );

        const tagJsonAll = JSON.stringify(tags);
        const triggerJsonAll = JSON.stringify(triggers);
        const unusedVariables = variables.filter((v) => {
          const ref = `{{${v.name ?? ""}}}`;
          if (!v.name) return false;
          return !tagJsonAll.includes(ref) && !triggerJsonAll.includes(ref);
        });

        const lines: string[] = [];
        lines.push(`# Auditoria do container ${containerId}`);
        lines.push("");
        lines.push(
          `**Container:** ${containerR.data.name ?? "(sem nome)"} (${containerR.data.publicId ?? "?"})`,
        );
        lines.push(`**Workspace auditado:** ${workspaceId}`);
        if (latestVersion?.containerVersionId) {
          lines.push(
            `**Última versão publicada:** v${latestVersion.containerVersionId} — ${latestVersion.name ?? "sem nome"}`,
          );
        }
        lines.push("");
        lines.push("## Volume");
        lines.push(`- Tags: **${tags.length}**`);
        lines.push(`- Triggers: **${triggers.length}**`);
        lines.push(`- Variáveis (custom): **${variables.length}**`);
        lines.push("");
        lines.push("## Sinais de saúde");
        lines.push(`- Tags pausadas: **${pausedTags.length}**`);
        lines.push(
          `- Tags sem trigger (não disparam): **${tagsWithoutTrigger.length}**`,
        );
        lines.push(`- Triggers órfãos (sem tag usando): **${orphanTriggers.length}**`);
        lines.push(
          `- Variáveis nunca referenciadas (heurística textual): **${unusedVariables.length}**`,
        );

        if (pausedTags.length) {
          lines.push("");
          lines.push("### Tags pausadas");
          pausedTags.forEach((t) =>
            lines.push(`- \`${t.tagId}\` — ${t.name} (${t.type})`),
          );
        }
        if (tagsWithoutTrigger.length) {
          lines.push("");
          lines.push("### Tags sem trigger");
          tagsWithoutTrigger.forEach((t) =>
            lines.push(`- \`${t.tagId}\` — ${t.name} (${t.type})`),
          );
        }
        if (orphanTriggers.length) {
          lines.push("");
          lines.push("### Triggers órfãos");
          orphanTriggers.forEach((t) =>
            lines.push(`- \`${t.triggerId}\` — ${t.name} (${t.type})`),
          );
        }
        if (unusedVariables.length) {
          lines.push("");
          lines.push("### Variáveis possivelmente não usadas");
          lines.push(
            "_⚠️ Heurística textual: pode dar falso positivo se a variável for usada em código dentro de templates customizados._",
          );
          unusedVariables.forEach((v) =>
            lines.push(`- \`${v.variableId}\` — ${v.name} (${v.type})`),
          );
        }

        lines.push("");
        lines.push("## Recomendações");
        if (pausedTags.length)
          lines.push("- Reveja tags pausadas — manter pausado por muito tempo é dívida.");
        if (tagsWithoutTrigger.length)
          lines.push(
            "- Tags sem trigger não disparam — defina trigger ou remova.",
          );
        if (orphanTriggers.length)
          lines.push(
            "- Triggers órfãos podem ser removidos pra limpar o container.",
          );
        if (
          !pausedTags.length &&
          !tagsWithoutTrigger.length &&
          !orphanTriggers.length &&
          !unusedVariables.length
        )
          lines.push("- Nada de óbvio a corrigir. Container saudável. ✅");

        return textResult(lines.join("\n"));
      }),
  );
};
