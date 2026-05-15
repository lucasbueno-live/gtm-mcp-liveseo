# Publicação automática no npm (GitHub Actions)

O repositório tem um workflow ([.github/workflows/publish.yml](../.github/workflows/publish.yml)) que **publica o pacote no npm automaticamente** quando você cria uma Release no GitHub. Setup é feito **uma única vez**.

## Setup único (≈5 min)

### 1. Conta npm + token de automação

1. Crie/entre numa conta em [npmjs.com](https://www.npmjs.com/) (pode ser conta da liveSEO).
2. Vá em **Avatar → Access Tokens → Generate New Token → Granular Access Token** (ou "Automation").
   - **Type/Permissions**: `Read and write` (packages and scopes)
   - **Packages**: pode deixar "All packages" ou restringir a `gtm-mcp-liveseo` depois da 1ª publicação
   - **Expiration**: o que a política de vocês permitir (ex.: 1 ano)
3. **Copie o token** (começa com `npm_...`). Só aparece uma vez.

### 2. Adicionar o token como secret no GitHub

1. No repo `lucasbueno-live/gtm-mcp-liveseo` → **Settings → Secrets and variables → Actions**
2. **New repository secret**
   - **Name**: `NPM_TOKEN`
   - **Secret**: cole o token `npm_...`
3. Salvar.

### 3. Primeira publicação (manual, 1x)

A 1ª versão do pacote precisa existir no npm pro token granular conseguir restringir depois. Faça uma vez:

- Vá em **Actions → "Publicar no npm" → Run workflow** (botão à direita), deixe a versão em branco ou digite `0.2.0`, **Run**.
- OU rode localmente uma vez: `npm login && npm publish --access public`.

Depois disso, o nome `gtm-mcp-liveseo` está reservado e o fluxo por Release funciona.

## Fluxo normal de release (a cada nova versão)

1. No GitHub: **Releases → Draft a new release**
2. **Choose a tag** → digite a nova versão no formato `vX.Y.Z` (ex.: `v0.3.0`) → **Create new tag on publish**
3. Título e notas (changelog do que mudou)
4. **Publish release**

O workflow dispara sozinho: instala deps → define a versão pela tag (`v0.3.0` → `0.3.0`) → build → smoke test → `npm publish` com **provenance** (procedência verificável, recomendado para pacote público).

Em ~1-2 min o pacote novo está no npm. O time atualiza automaticamente (o `npx -y gtm-mcp-liveseo` sempre pega a última, ou roda `npm i -g gtm-mcp-liveseo@latest`).

## Notas

- **A tag manda na versão.** Não precisa editar `package.json` manualmente — a tag `vX.Y.Z` define o que será publicado. (Opcional: manter o `version` do `package.json` em sincronia ajuda quem lê o repo.)
- **Provenance**: o workflow usa `--provenance` (OIDC do GitHub). Por isso ele tem `id-token: write` nas permissions. Funciona porque o pacote é público.
- **Falha "version already exists"**: você tentou publicar uma versão que já existe no npm. Crie uma release com número maior.
- **Falha "401/403 no publish"**: o `NPM_TOKEN` está ausente, expirado ou sem permissão de escrita no pacote. Gere outro e atualize o secret.
- **Disparo manual**: `Actions → Publicar no npm → Run workflow` permite publicar sem criar release (informe a versão no campo).
