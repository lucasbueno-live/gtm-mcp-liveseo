# Empacotamento `.dxt` para Claude Desktop

Este diretório contém o manifesto e instruções para gerar a extensão `.dxt` instalável com 1-clique no Claude Desktop.

## O que é `.dxt`

Formato oficial de extensão do Claude Desktop. Um `.dxt` é um arquivo zip contendo:
- `manifest.json` — metadados, configuração do MCP, formulário de config do usuário
- `server/` — código compilado do MCP server (esta pasta inteira do projeto)
- `icon.png` — ícone exibido na UI

Documentação oficial: [Anthropic — Desktop Extensions](https://github.com/anthropics/dxt) (ou pesquise por "dxt format" na doc do Claude Desktop).

## Como gerar o `.dxt`

Pré-requisito: o build do servidor já deve estar feito (`npm run build` na raiz do projeto, dist/ populada).

Instale o CLI oficial:

```bash
npm install -g @anthropic-ai/dxt
```

A partir da raiz do projeto:

```bash
# 1. Build do server
npm install
npm run build

# 2. Montar pasta de empacotamento
mkdir -p .dxt-build/server
cp -r dist .dxt-build/server/
cp -r node_modules .dxt-build/server/
cp package.json .dxt-build/server/
cp dxt/manifest.json .dxt-build/
cp dxt/icon.png .dxt-build/  # adicionar ícone 256x256 PNG

# 3. Empacotar
cd .dxt-build
dxt pack . ../liveseo-gtm-mcp-0.1.0.dxt
```

Resultado: `liveseo-gtm-mcp-0.1.0.dxt` na raiz. Time da liveSEO baixa este arquivo, dá duplo-clique → Claude Desktop instala, exibe formulário pedindo `client_id` / `client_secret` / modo de escrita → pronto.

## Configurações pedidas ao usuário (definidas no manifest.json)

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `client_id` | string | Sim | OAuth Client ID do Google Cloud |
| `client_secret` | string | Sim | OAuth Client Secret (tratado como sensível) |
| `write_mode_flag` | dropdown | Não | "" (readonly, default) ou "--write" |

Quando o usuário escolhe "Habilitar escrita", a string `--write` é injetada nos args. Caso contrário, vazio (mantém readonly).

## Ícone

Falta um ícone PNG 256x256. Sugestão: usar o logo da liveSEO com um ícone de tag/etiqueta sobreposto. Por enquanto, qualquer PNG válido funciona pra testar.

## Distribuição

Opções de distribuição do `.dxt`:

1. **GitHub Releases (privado)** — release no repo `lucasbueno-live/gtm-mcp-liveseo`. Time baixa o `.dxt` da release.
2. **Drive interno** — colocar em pasta compartilhada do Workspace.
3. **Site interno** — link de download em portal.liveseo.com.br.

Para atualizações: novo `.dxt` → time baixa de novo → Claude Desktop atualiza. (Não há auto-update no formato `.dxt` ainda.)

## Testando localmente antes de empacotar

```bash
cd .dxt-build
# Simula instalação sem empacotar
dxt validate manifest.json
dxt install . --dev
```

Isso instala como extensão "em desenvolvimento" no Claude Desktop local, útil pra iterar.

## TODO antes do release v0.1.0

- [ ] Adicionar `icon.png` 256x256
- [ ] Publicar `gtm-mcp-liveseo` no npm registry (pra que `npx -y gtm-mcp-liveseo` funcione como fallback)
- [ ] Testar instalação em uma máquina limpa
- [ ] Validar OAuth flow numa máquina sem token salvo
- [ ] Adicionar screenshot do formulário de config ao [docs/TREINAMENTO-LIVESEO.md](../docs/TREINAMENTO-LIVESEO.md)
