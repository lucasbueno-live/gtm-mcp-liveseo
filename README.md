# gtm-mcp-liveseo

MCP server local em Node.js para Google Tag Manager. Versão liveSEO do projeto `stape-io/google-tag-manager-mcp-server`, reescrita para rodar diretamente na máquina do usuário com OAuth local, descrições em PT-BR, modo readonly por padrão e auditoria humana de container.

## Diferenças vs. servidor Stape

| Característica | Stape (remoto) | liveSEO (local) |
|---|---|---|
| Hosting | Cloudflare Workers (Stape) | Local na máquina do usuário |
| Tokens OAuth | Cloudflare KV da Stape | `~/.gtm-mcp/credentials.json` local |
| Idioma das tools | Inglês | PT-BR |
| Modo seguro | — | Readonly por padrão (`--write` libera) |
| Confirmação destrutiva | — | `confirm: true` obrigatório em remove/publish |
| Tool de ajuda | — | `gtm_help` |
| Auditoria humana | — | `gtm_audit_container` |
| Mensagens de erro | Inglês cru | PT-BR humanizado |

## Pré-requisitos

- Node.js 18+
- Credenciais OAuth próprias do Google Cloud Console (siga [docs/SETUP-GOOGLE-CLOUD.md](docs/SETUP-GOOGLE-CLOUD.md))

## Instalação

### Jeito fácil — assistente (Claude Desktop ou Cursor)

No terminal (precisa de [Node.js 18+](https://nodejs.org/)):

```
npx -y gtm-mcp-liveseo setup
```

O assistente pergunta onde você usa (**Claude Desktop**, **Cursor** ou
**ambos**), faz o login Google (abre o navegador) e já escreve a
configuração pra você. Depois é só reabrir o app escolhido.

### Manual

**Claude Desktop** — `claude_desktop_config.json`
(Settings → Developer → Edit Config).
**Cursor** — `~/.cursor/mcp.json` (global) ou `.cursor/mcp.json` (projeto).

Mesmo bloco nos dois (schema `mcpServers` é idêntico):

```json
{
  "mcpServers": {
    "gtm": {
      "command": "npx",
      "args": ["-y", "gtm-mcp-liveseo"]
    }
  }
}
```

Para habilitar escrita (criar/editar/remover/publicar), adicione `--write`:

```json
{
  "mcpServers": {
    "gtm": {
      "command": "npx",
      "args": ["-y", "gtm-mcp-liveseo", "--write"]
    }
  }
}
```

Reinicie o Claude Desktop. Na primeira chamada de tool, um navegador abre pro login Google (escolha a conta com acesso ao GTM → "Avançado → Acessar"). Pronto. As credenciais OAuth do app já vêm embutidas no pacote; os tokens de cada pessoa ficam só na máquina dela em `~/.gtm-mcp/profiles/<perfil>.json` (permissões 0600).

> Avançado (opcional): dá pra sobrescrever as credenciais OAuth embutidas com as variáveis `GTM_MCP_CLIENT_ID`/`GTM_MCP_CLIENT_SECRET` ou um arquivo `~/.gtm-mcp/oauth-client.json`.

## Multi-conta (perfis)

Pensado para agência que acessa GTM de vários clientes com emails diferentes. Cada conta é um **perfil** salvo; você troca pelo chat via a tool `gtm_auth`, sem refazer login:

- `gtm_auth status` — qual conta está ativa
- `gtm_auth list` — perfis salvos e emails
- `gtm_auth login profile='cliente-x'` — autentica (abre navegador no seletor de contas Google)
- `gtm_auth switch profile='cliente-x'` — troca o perfil ativo sem login
- `gtm_auth logout profile='cliente-x'` — remove o token de um perfil

O login usa `prompt=select_account`, então o seletor de contas Google **sempre** aparece — cada pessoa escolhe o email do cliente certo.

## CLI

```bash
npx gtm-mcp-liveseo [opções]

Opções:
  --write             Habilita criar/editar/remover/publicar
  --logout [perfil]   Remove o token de um perfil (default: ativo)
  --help              Mostra ajuda
```

## Variáveis de ambiente (todas opcionais)

As credenciais OAuth do app já vêm embutidas — nada disso é obrigatório. Use só se quiser apontar pra outro projeto Google Cloud:

| Variável | Descrição |
|---|---|
| `GTM_MCP_CLIENT_ID` | Sobrescreve o Client ID OAuth embutido |
| `GTM_MCP_CLIENT_SECRET` | Sobrescreve o Client Secret OAuth embutido |
| `GTM_MCP_OAUTH_FILE` | Caminho de um credentials.json (alternativa às vars acima) |
| `GTM_MCP_PROFILE` | Perfil ativo inicial (default: `default`) |

## Tools disponíveis

20 tools registradas, agrupadas por recurso GTM:

**Discovery & ajuda**
- `gtm_help` — guia rápido
- `gtm_audit_container` — relatório de saúde do container

**Hierarquia**
- `gtm_account` — list, get, update
- `gtm_container` — CRUD + lookup, snippet, combine, moveTagId
- `gtm_workspace` — CRUD + createVersion, getStatus, sync, quickPreview, resolveConflict

**Recursos do workspace**
- `gtm_tag` — CRUD + revert
- `gtm_trigger` — CRUD + revert
- `gtm_variable` — CRUD + revert
- `gtm_folder`, `gtm_zone`, `gtm_client`, `gtm_transformation`, `gtm_template`, `gtm_gtag_config` — CRUD (+ revert nos que suportam)
- `gtm_built_in_variable` — create, list, remove, revert

**Versões e publicação**
- `gtm_version` — get, live, publish, remove, setLatest, undelete, update
- `gtm_version_header` — list, latest

**Administração**
- `gtm_environment` — CRUD + reauthorize
- `gtm_destination` — get, list, link, unlink
- `gtm_user_permission` — CRUD

## Desenvolvimento

```bash
npm install
npm run build
node dist/index.js --write
```

## Licença

Apache-2.0. Forkado de `stape-io/google-tag-manager-mcp-server` (Apache-2.0).
