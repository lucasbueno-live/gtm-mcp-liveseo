# Guia liveSEO — Google Tag Manager pelo Claude

Este guia te ensina a conectar o **Claude Desktop** ao **Google Tag Manager** pra você pedir coisas em português e o Claude executar — listar tags, auditar containers, criar novos disparadores, publicar versões, etc.

Tempo de setup: **~10 minutos** (uma vez na vida).
Pré-requisitos: Claude Desktop instalado + acesso a uma conta GTM.

> Esta versão usa o servidor público da Stape em `gtm-mcp.stape.ai`. É a forma mais rápida de começar. A liveSEO vai disponibilizar em breve uma versão própria (rodando local na sua máquina), eliminando a dependência da Stape.

---

## Sumário

1. [Setup inicial](#setup-inicial)
2. [Primeira execução e autorização](#primeira-execução-e-autorização)
3. [O que você pode pedir](#o-que-você-pode-pedir)
4. [Cuidados importantes](#cuidados-importantes)
5. [Resolução de problemas](#resolução-de-problemas)
6. [Limitações conhecidas](#limitações-conhecidas)

---

## Setup inicial

### 1. Abra o arquivo de configuração do Claude Desktop

No Claude Desktop, vá em:

**Menu → Settings → Developer → Edit Config**

Isso abre o arquivo `claude_desktop_config.json` no seu editor padrão. No Windows ele fica em:

```
C:\Users\<seu-usuário>\AppData\Roaming\Claude\claude_desktop_config.json
```

### 2. Cole a configuração

Se o arquivo estiver vazio ou com `{}`, **substitua todo o conteúdo** pelo bloco abaixo:

```json
{
  "mcpServers": {
    "gtm": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://gtm-mcp.stape.ai/mcp"
      ]
    }
  }
}
```

Se você já tem outros servidores MCP configurados, adicione **apenas** a entrada `"gtm": { ... }` dentro do `mcpServers` existente — não duplique a chave `mcpServers`.

### 3. Salve e reinicie o Claude Desktop

Salve o arquivo, feche o Claude Desktop **completamente** (clique direito no ícone da bandeja → Quit), e abra de novo.

---

## Primeira execução e autorização

Na primeira vez que você pedir algo de GTM, o Claude vai abrir uma janela do navegador automaticamente pedindo pra você fazer login com Google.

**Importante:** faça login com a conta Google que tem acesso ao GTM que você quer gerenciar — é a mesma conta que você usa pra acessar [tagmanager.google.com](https://tagmanager.google.com).

A tela vai pedir permissão pra acessar:
- Suas contas GTM
- Editar containers e versões
- Gerenciar usuários e publicações

Aceite. Você só precisa fazer isso uma vez (o token fica salvo). Depois volta pro Claude e pode começar a usar.

---

## O que você pode pedir

Os exemplos abaixo são prompts em português que funcionam. Cole no Claude e ele entende.

### Exploração (read-only — sem risco)

```
Liste todas as contas GTM que tenho acesso.
```

```
Mostra os containers da conta GTM <ID-DA-CONTA>.
```

```
Quais workspaces existem no container <ID-CONTAINER>?
```

```
Liste todas as tags ativas no workspace <ID-WORKSPACE> do container <ID-CONTAINER>.
```

```
Me mostra os triggers configurados no workspace X.
```

```
Que variáveis estão definidas no container Y? Inclua as built-in.
```

### Auditoria e diagnóstico

```
Faça uma auditoria completa do container <ID> e me devolve um resumo em markdown:
- Quantas tags, triggers, variáveis tem
- Quais tags estão pausadas
- Tem alguma tag duplicada (mesmo tipo + mesmas condições)?
- Quando foi a última publicação
```

```
Tem alguma tag de GA4 sem trigger no container X? Lista elas.
```

```
Encontre tags que disparam em todas as páginas (All Pages) — quero validar se faz sentido.
```

```
Compara as versões publicadas mais recentes do container Z e me mostra o que mudou.
```

### Criação e edição (cuidado!)

```
Crie uma tag GA4 Event chamada "Click - CTA Hero" no workspace <ID>:
- Measurement ID: G-XXXXXXX
- Event name: cta_hero_click
- Dispara em clique no elemento .btn-hero
```

```
Adiciona um trigger de clique customizado chamado "Click - WhatsApp Button" que dispara quando a classe CSS contém "wpp-btn".
```

```
Cria uma variável de Data Layer chamada "user_id" pegando do dataLayer.userId.
```

### Publicação

```
Cria uma nova versão do workspace <ID> com a descrição "Adicionada tag GA4 CTA Hero" e me mostra o resumo antes de publicar.
```

```
Publica a versão <ID-VERSÃO> do container <ID-CONTAINER> no ambiente Live.
```

### Pedidos compostos (mais úteis no dia a dia)

```
Quero acompanhar cliques no botão de WhatsApp do site cliente-x.com.br.
Faça o setup completo no container <ID>:
1. Variável de Click Classes (built-in, se ainda não tiver)
2. Trigger "Click - WhatsApp"
3. Tag GA4 Event "Click - WhatsApp"

Me mostra o plano antes de criar.
```

```
Audita o container <ID> do cliente Y e me devolve um relatório com:
- Tags sem trigger
- Triggers órfãos (sem tag usando)
- Variáveis nunca referenciadas
- Tags duplicadas
Quero priorizar o que limpar.
```

---

## Cuidados importantes

### 🟢 Sempre seguro
- Listar, ver, contar, auditar — **read-only**, nenhum dado mudado no GTM.
- Pedir relatórios, comparar versões, validar configurações.

### 🟡 Mexe no workspace (rascunho)
- Criar/editar/remover tag, trigger, variável → fica no **workspace** (rascunho). Não está ativo no site até publicar.
- Sempre confirme com o Claude o que ele vai fazer **antes** de mandar criar.
- Se errar, dá pra reverter individualmente (`revert` em tag/trigger/variável) ou descartar o workspace inteiro.

### 🔴 Ações que afetam o site ao vivo
- **Publicar versão** → muda o que está no ar. Faça preview antes (`quickPreview`).
- **Remover container** → destrutivo e quase irreversível. Não peça isso sem 100% de certeza.
- **Alterar permissões de usuário** → impacto operacional. Confirme com gerente do cliente.

**Regra de ouro:** se o prompt envolve "publicar", "remover", "deletar", "remove" ou "delete" — peça pro Claude **mostrar o que vai fazer antes** com algo tipo "me mostra o plano sem executar".

### Quem você está representando
O Claude vai agir com a sua identidade no GTM. Tudo que ele fizer aparece no histórico de versões **com seu nome**. Não compartilhe acesso a essa configuração do Claude Desktop com outras pessoas — cada um usa a própria.

---

## Resolução de problemas

### "Token expirado" ou erro 401

Aconteceu na hora de pedir algo? Significa que sua autenticação caducou.

**Solução rápida** — peça no chat:

```
Use a ferramenta de remover dados do servidor MCP pra eu autenticar de novo.
```

Depois feche o Claude Desktop completamente e abra de novo. Vai pedir login no Google novamente.

**Se isso não funcionar**, no PowerShell limpe o cache local:

```powershell
Remove-Item -Recurse -Force "$env:USERPROFILE\.mcp-auth" -ErrorAction SilentlyContinue
```

E reabra o Claude Desktop.

### "Tools não aparecem"

1. Confirme que salvou o arquivo `claude_desktop_config.json`.
2. Confirme que fechou e abriu o Claude Desktop (não basta minimizar).
3. No chat, digite `/mcp` — deve listar o servidor "gtm" como conectado.
4. Se aparecer como "disconnected", clique pra ver o erro.

### "Erro 403 — Permission denied"

A conta Google que você usou no OAuth **não tem acesso** ao container/conta que você pediu. Confira em [tagmanager.google.com](https://tagmanager.google.com) com o mesmo email.

### "Erro 429 — Quota exceeded"

Você (ou o Claude no seu nome) pediu coisas demais em pouco tempo. Espera ~1 minuto e tenta de novo. Se for recorrente, peça pro Claude paginar resultados em lotes menores.

### O Claude está fazendo coisa errada ou criando coisas que você não pediu

Pare a execução (botão "Stop") e seja mais específico no próximo prompt:

```
Antes de criar qualquer coisa, me mostra o JSON que você vai enviar pro GTM e espera minha confirmação.
```

---

## Limitações conhecidas

- **Dependência de terceiro:** o servidor Stape intermedia todas as chamadas. Tokens OAuth ficam guardados na infra deles (Cloudflare KV). Pra clientes sensíveis (B2B/saúde/financeiro), validar com a equipe interna de compliance antes de usar.
- **Sem confirmação automática em ações destrutivas:** se você pedir "remove a tag X", a tag some imediatamente. Sempre revise o prompt.
- **Erros em inglês:** mensagens de erro do Google API vêm cruas em inglês. Estamos trabalhando numa versão liveSEO que traduz e dá contexto.
- **Sem modo readonly:** o servidor concede todos os escopos OAuth (incluindo delete e manage users). A versão liveSEO terá um perfil "explorador" com permissão só de leitura.

Todas essas limitações vão sumir na **versão liveSEO** (rodando local na sua máquina, sem servidor terceiro, com erros em PT-BR e modo readonly).

---

## Próximos passos pro time

Quando rolar dúvida sobre prompts específicos pra um cliente, traz pra discussão — vamos montar um banco de templates de prompts validados por vertical (e-commerce, B2B, SaaS).

Dúvidas ou achou bug? Avisa o Lucas.
