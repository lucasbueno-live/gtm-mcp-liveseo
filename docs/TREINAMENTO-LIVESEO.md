# Treinamento liveSEO — GTM via Claude (versão local)

Doc interno para o time da liveSEO se familiarizar com a versão local do MCP server de Google Tag Manager. Pré-requisito: já ter usado a versão Stape pelo menos uma vez (veja [GUIA-LIVESEO.md](GUIA-LIVESEO.md)).

## Por que migramos para a versão local

| Problema (versão Stape) | Solução (versão liveSEO) |
|---|---|
| Tokens OAuth dos clientes ficam no servidor da Stape | Tokens ficam só na sua máquina |
| Mensagens de erro em inglês cru | Tudo em PT-BR e humanizado |
| Tudo liberado por padrão (perigo pra leigo) | Readonly por padrão, escrita exige flag |
| Sem preview/confirmação em ações destrutivas | `confirm: true` obrigatório em remove/publish |
| Setup técnico com JSON manual | `npx` direto, ou `.dxt` 1-clique |
| Sem ferramentas de auditoria | Tool `gtm_audit_container` faz relatório humano |

## Setup (uma vez)

### Pré-requisitos

- Node.js 18+ instalado ([nodejs.org](https://nodejs.org/))
- Claude Desktop instalado
- Credenciais OAuth da liveSEO (peça pro Lucas o `GTM_MCP_CLIENT_ID` e `GTM_MCP_CLIENT_SECRET`)

### Configuração

1. Abra Claude Desktop → Settings → Developer → Edit Config
2. Cole/mescle esta configuração:

```json
{
  "mcpServers": {
    "gtm": {
      "command": "npx",
      "args": ["-y", "gtm-mcp-liveseo"],
      "env": {
        "GTM_MCP_CLIENT_ID": "VOCÊ_RECEBEU_DO_LUCAS",
        "GTM_MCP_CLIENT_SECRET": "VOCÊ_RECEBEU_DO_LUCAS"
      }
    }
  }
}
```

3. Salve e reinicie Claude Desktop
4. Na primeira tool, um navegador abre pra login Google — escolha a conta que tem acesso ao GTM do cliente
5. ⚠️ **Vai aparecer a tela "O Google não verificou este app"** — isso é esperado e seguro. Clique em **"Avançado"** (ou "Advanced") → **"Acessar gtm-mcp-liveseo (não seguro)"**. O app é da liveSEO e roda local na sua máquina; o aviso só existe porque não pagamos a verificação do Google (desnecessária pra ferramenta interna). Acontece **uma vez por conta**.
6. Pronto. O token fica salvo em `C:\Users\<você>\.gtm-mcp\profiles\<perfil>.json`

### Modo escrita (quando precisar)

Por padrão você só **lê** dados. Para criar/editar/remover/publicar, adicione `--write` aos args:

```json
"args": ["-y", "gtm-mcp-liveseo", "--write"]
```

E reinicie Claude. Para voltar pro modo seguro, remova `--write` e reinicie.

**Regra de bolso:**
- Auditoria, análise, exploração → modo padrão (readonly)
- Implementação de tags pra cliente → modo `--write`

## Multi-conta: trocar de email por cliente

Na liveSEO cada cliente costuma exigir um email diferente pra acessar o GTM. Aqui isso é resolvido com **perfis**: cada conta vira um perfil salvo, e você troca pelo chat sem refazer login toda vez.

**Primeira vez com um cliente** (cria o perfil):

```
Você: Loga na conta do cliente Obramax. Usa o perfil "obramax".

Claude: chama gtm_auth action=login profile="obramax"
→ Abre o navegador no SELETOR DE CONTAS do Google
→ Você escolhe/loga com o email que tem acesso ao GTM da Obramax
→ Perfil "obramax" salvo e ativo
```

**Próximas vezes** (troca instantânea, sem login):

```
Você: Troca pra conta da Velocità.
Claude: chama gtm_auth action=switch profile="velocita"
→ Perfil ativo agora é velocita (sem reabrir navegador)
```

**Comandos úteis no chat:**

| O que falar | O que o Claude faz |
|---|---|
| "qual conta tô logado?" | `gtm_auth status` |
| "lista as contas que tenho salvas" | `gtm_auth list` |
| "loga no cliente X com perfil x" | `gtm_auth login profile=x` (abre navegador) |
| "troca pro perfil x" | `gtm_auth switch profile=x` (sem login) |
| "desconecta o perfil x" | `gtm_auth logout profile=x` |

Cada perfil fica em `C:\Users\<você>\.gtm-mcp\profiles\<perfil>.json`. Várias contas ficam logadas ao mesmo tempo — você só alterna qual está ativa.

> 💡 Convenção: use o **nome do cliente** como nome do perfil (`obramax`, `velocita`, etc.). Se errar a conta e der "403 / sem acesso", peça `gtm_auth list` e troque pro perfil certo.

## Fluxo de trabalho típico

### Fluxo 1: Auditar container de um cliente

```
Você: Faz uma auditoria do container GTM-XXXXXX da conta 12345678.

Claude:
- Chama gtm_audit_container
- Retorna markdown com: tags pausadas, tags sem trigger, triggers órfãos, etc.
- Sugere quick wins de limpeza
```

### Fluxo 2: Setup de tag GA4 para novo evento

```
Você: Preciso configurar tracking de cliques no botão WhatsApp do site cliente-x.com.br.
      Faça o setup completo.

Claude (modo --write):
1. Chama gtm_help (entende contexto)
2. Lista contas, acha "cliente-x"
3. Pega container, workspace
4. Mostra plano: criar variável Click Classes, trigger, tag GA4
5. PEDE SUA CONFIRMAÇÃO antes de cada criação
6. Cria os 3 recursos no workspace (não publica)
7. Sugere quickPreview pra você validar
```

### Fluxo 3: Publicação (cuidado!)

```
Você: Publica a versão atual do workspace.

Claude:
1. Chama gtm_workspace getStatus — mostra o que vai mudar
2. PEDE CONFIRMAÇÃO ("publicar afeta o site ao vivo, confirma?")
3. Você diz "sim, confirmo, publica"
4. Claude chama gtm_workspace createVersion → gtm_version publish com confirm:true
5. Confirma sucesso e mostra o link da nova versão
```

## Boas práticas

### ✅ Faça

- Comece pedindo `gtm_help` quando for trabalhar com cliente novo
- Use `gtm_audit_container` antes de propor mudanças (entende baseline)
- Peça pro Claude **mostrar o plano antes** ("o que você vai criar?") em qualquer ação de escrita
- Confirme cliente e container nos primeiros prompts ("ok, então container GTM-XXX do cliente Y, certo?")
- Use modo `--write` só quando for de fato implementar — readonly evita acidentes

### ❌ Não faça

- Compartilhar a pasta `~/.gtm-mcp/profiles/` ou seus tokens com colegas (cada um loga o seu)
- Rodar com `--write` em demos pra cliente (use readonly)
- Publicar sem antes pedir `quickPreview` no workspace
- Confiar cegamente em IDs que o Claude inventar — sempre liste primeiro
- Mexer em containers de produção sem revisar o histórico (`gtm_version_header list`)

## Troubleshooting

### "Token expirado / 401"

```
npx gtm-mcp-liveseo --logout
```

Reabra o Claude. Vai pedir login de novo.

### "Modo readonly bloqueando"

A tool retornou: *"Operação 'remove' bloqueada: o servidor está em modo readonly"*

Edite `claude_desktop_config.json` adicionando `"--write"` em args, salve, reinicie Claude Desktop.

### "Permission denied 403"

A conta Google que você autenticou não tem acesso ao container/conta GTM. Verifique em [tagmanager.google.com](https://tagmanager.google.com) com o mesmo email.

Para autenticar com outra conta, faça logout:

```
npx gtm-mcp-liveseo --logout
```

E refaça o login.

### "Quota exceeded 429"

Esperou 1 minuto. GTM API tem rate limit por usuário. Se cair muito, peça pro Claude paginar em lotes menores.

### Erros estranhos / Claude perdido

Recarregue o contexto pedindo:

```
Chama gtm_help e me confirma quais ferramentas você tem disponíveis.
```

## Onde achar IDs

- **accountId**: [tagmanager.google.com](https://tagmanager.google.com) → URL: `tagmanager.google.com/#/admin/accounts/12345678` → o número final é o accountId.
- **containerId**: dentro da conta, clique no container → URL: `.../containers/55555555/...` → containerId.
- **workspaceId**: dentro do container, abra um workspace → URL: `.../workspaces/3` → workspaceId é o número.
- Ou: peça pro Claude `gtm_account list` e siga listando.

## Recursos extras

- [Setup OAuth Google Cloud](SETUP-GOOGLE-CLOUD.md) — referência técnica
- [Guia versão Stape](GUIA-LIVESEO.md) — caso queira voltar pra versão remota
- [GTM API docs (oficial)](https://developers.google.com/tag-platform/tag-manager/api/v2) — referência de tipos de tag/trigger

## Suporte

Dúvidas, bugs, ideias → Lucas (lucas.bueno@liveseo.com.br) ou canal #automacoes-claude no Slack.
