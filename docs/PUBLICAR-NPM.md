# Publicar no npm (manual)

O objetivo é só deixar o pacote no npm pra qualquer pessoa usar com
`npx -y gtm-mcp-liveseo` sem clonar nada. É publicação manual, simples.

## Primeira publicação (uma vez)

Na máquina de quem vai publicar (precisa de Node 18+):

```bash
cd "C:\Users\LS.NOT 96\gtm-mcp-liveseo"

# 1. Login no npm (abre o navegador / pede OTP). Só na 1ª vez.
npm login

# 2. Publicar
npm publish --access public
```

Pronto. O pacote `gtm-mcp-liveseo` fica público no npm e o time já pode usar:

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

> O `npm publish` roda o build automaticamente antes (script `prepublishOnly`), então não precisa rodar `npm run build` na mão.

## Publicar uma atualização (sempre que mexer no código)

npm não deixa republicar a mesma versão. Suba o número antes:

```bash
# escolha um:
npm version patch   # 0.2.0 -> 0.2.1  (correção)
npm version minor   # 0.2.0 -> 0.3.0  (novidade)

git push --follow-tags        # opcional: leva o bump + tag pro GitHub
npm publish --access public
```

Quem usa via `npx -y gtm-mcp-liveseo` pega a versão nova automaticamente.

## Problemas comuns

- **`npm ERR! 403 ... cannot publish over the previously published version`** → você esqueceu de subir a versão. Rode `npm version patch` e publique de novo.
- **`npm ERR! 401`** → não está logado. Rode `npm login` de novo.
- **Nome já em uso** → `gtm-mcp-liveseo` está livre hoje; se um dia colidir, mude o `name` no `package.json`.
- **Quer despublicar** → `npm unpublish gtm-mcp-liveseo@<versão>` (só funciona nas primeiras 72h; evite, prefira publicar uma correção).
