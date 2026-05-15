import { z } from "zod";
import { textResult } from "./helpers.js";
import { ToolRegistration } from "./registry.js";

const HELP_TEXT = `# liveSEO GTM MCP — Guia rápido

Esta é a versão liveSEO do MCP server pro Google Tag Manager. Roda local na máquina do usuário (sem servidor terceiro), com mensagens em PT-BR e modo readonly por padrão.

## Fluxo recomendado

1. **Descobrir IDs** — sempre comece com:
   - \`gtm_account\` action=list — lista contas que você tem acesso
   - \`gtm_container\` action=list — lista containers de uma conta
   - \`gtm_workspace\` action=list — lista workspaces de um container

2. **Explorar conteúdo (read-only):**
   - \`gtm_tag\`, \`gtm_trigger\`, \`gtm_variable\` action=list — vê o que existe no workspace
   - \`gtm_version\` action=live — vê o que está publicado AO VIVO no site
   - \`gtm_version_header\` action=list — vê histórico de versões

3. **Auditar:**
   - \`gtm_audit_container\` — relatório humanizado sobre saúde do container

4. **Editar (precisa --write):**
   - \`gtm_tag\`/\`gtm_trigger\`/\`gtm_variable\` com action=create/update/remove
   - Mudanças ficam no workspace (rascunho). Não afetam o site até publicar.

5. **Publicar (afeta site ao vivo):**
   - \`gtm_workspace\` action=createVersion — congela workspace numa versão
   - \`gtm_version\` action=publish — publica a versão (afeta o site)

## Regras de segurança

- 🔒 **Modo readonly por padrão**: pra criar/editar/remover, o servidor precisa rodar com \`--write\`. Se aparecer erro "modo readonly", peça ao usuário pra reiniciar com --write.
- ⚠️ **Confirmação obrigatória em destrutivos**: ações \`remove\`, \`delete\` e \`publish\` exigem \`confirm: true\` no payload. NUNCA presuma confirmação — sempre peça ao usuário.
- 🔁 **Fingerprint**: \`update\`, \`revert\` e \`publish\` exigem fingerprint atualizado (pega via \`get\`). Se der erro de conflito 409, faça \`get\` de novo pra pegar o fingerprint novo.

## Padrões comuns

- **Tag GA4 page_view**: \`gtm_tag\` create com type="gaawe", parâmetros measurementId e event_name="page_view".
- **Trigger clique em classe CSS**: \`gtm_trigger\` create com type="cl" + filtro \`{{Click Classes}}\` contém "X".
- **Variável Data Layer**: \`gtm_variable\` create com type="v" + parâmetro name="dataLayerKey".

## Pra usuários leigos

Quando o usuário pedir algo em linguagem natural:
1. Identifique o cliente/site → peça ou descubra o accountId e containerId.
2. Se for ação destrutiva ou publicação, **sempre confirme antes de executar** mostrando o JSON que você vai enviar.
3. Quando achar erros, traduza em linguagem humana — não despeje o JSON cru no usuário.
4. Em auditorias, prefira relatórios em markdown com bullet points em PT-BR.
`;

export const helpTool: ToolRegistration = (server) => {
  server.tool(
    "gtm_help",
    "Mostra o guia rápido de uso desse MCP. CHAME ESSA TOOL PRIMEIRO em uma nova conversa pra entender o fluxo recomendado, as regras de segurança e os padrões comuns.",
    {
      topic: z
        .enum(["overview", "flow", "safety", "patterns"])
        .optional()
        .describe("Tópico específico. Sem param, retorna o guia completo."),
    },
    async () => textResult(HELP_TEXT),
  );
};
