# Setup OAuth no Google Cloud Console — pré-requisito da Fase 3

Pra liveSEO ter o **MCP rodando local na máquina de cada pessoa do time** (sem depender da Stape), precisamos de credenciais OAuth próprias. Esse setup é **feito uma vez só**, por uma pessoa com acesso admin ao Google Cloud Console da liveSEO. Tempo total: ~15 minutos.

## O que você vai gerar no final

Um arquivo `credentials.json` com algo assim:

```json
{
  "installed": {
    "client_id": "12345-xyz.apps.googleusercontent.com",
    "client_secret": "GOCSPX-...",
    "redirect_uris": ["http://localhost:8765"]
  }
}
```

Esse arquivo (ou apenas o `client_id` + `client_secret`) é o que vai ser embutido no pacote interno da liveSEO. Sem isso, o servidor local não consegue iniciar o fluxo OAuth.

---

## Passo a passo

### 1. Abrir o Google Cloud Console

Acesse [console.cloud.google.com](https://console.cloud.google.com/) **logado com uma conta da liveSEO** (não com conta pessoal).

### 2. Criar (ou selecionar) um projeto

No topo da página, clique no seletor de projeto (ao lado do logo "Google Cloud").

- Se já existe um projeto "liveSEO" ou similar pra uso interno → selecione.
- Senão → clique em **"NEW PROJECT"**.

Dados sugeridos pro novo projeto:

| Campo | Valor sugerido |
|-------|----------------|
| Project name | `liveseo-internal-tools` |
| Organization | liveSEO (se você tiver Google Workspace organização) |
| Location | mesma organização |

Clique **Create** e espere ~30s o projeto provisionar. Depois selecione ele no seletor.

### 3. Ativar a Tag Manager API

No menu lateral esquerdo:

**APIs & Services → Library**

Na caixa de busca, digite `Tag Manager API`. Clique no resultado oficial do Google e clique no botão **Enable**. Espera o "API enabled" aparecer.

### 4. Configurar a OAuth consent screen

Menu lateral: **APIs & Services → OAuth consent screen**

#### 4.1. User type

Escolha **External**. ⚠️ **Não use "Internal"** — Internal só aceita contas `@liveseo.com.br`, e na agência você acessa GTM de cliente com contas Google fora desse domínio (Gmail do cliente, conta dedicada que o cliente criou, etc.). Internal recusaria essas contas.

Clique **Create**.

#### 4.2. App information

| Campo | Valor |
|-------|-------|
| App name | `liveSEO GTM Assistant` |
| User support email | seu email da liveSEO |
| App logo | opcional, pode pular |
| Application home page | `https://liveseo.com.br` |
| Application privacy policy link | `https://liveseo.com.br/privacy` (ou similar — pode ser placeholder) |
| Application terms of service link | `https://liveseo.com.br/terms` (ou similar) |
| Authorized domains | `liveseo.com.br` |
| Developer contact information | seu email |

Clique **Save and Continue**.

#### 4.3. Scopes

Clique em **Add or Remove Scopes**. Filtre por "tagmanager" e adicione **todos** estes:

- `https://www.googleapis.com/auth/tagmanager.readonly`
- `https://www.googleapis.com/auth/tagmanager.edit.containers`
- `https://www.googleapis.com/auth/tagmanager.edit.containerversions`
- `https://www.googleapis.com/auth/tagmanager.delete.containers`
- `https://www.googleapis.com/auth/tagmanager.manage.accounts`
- `https://www.googleapis.com/auth/tagmanager.manage.users`
- `https://www.googleapis.com/auth/tagmanager.publish`

Adicione também:
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`

Salve. Clique **Save and Continue**.

> 💡 No futuro vamos suportar um modo "readonly" do servidor MCP que usa só o primeiro scope. Por ora, deixamos todos cadastrados.

#### 4.4. Test users (OBRIGATÓRIO — o app fica em Testing)

> ⚠️ **Correção importante.** Para escopos *sensíveis* (todos os do Tag Manager são), o Google **só** oferece o atalho "Avançado → Acessar" para: a conta dona do projeto **ou** contas na lista de **test users** (com o app em **Testing**). Um app **publicado sem verificação** com escopos sensíveis dá **bloqueio seco** ("Este app está bloqueado") em contas externas — não tem como passar. Por isso **não publique**; mantenha em **Testing** e use test users.

Na seção **Test users / Usuários de teste**, clique **+ ADD USERS** e adicione **cada conta Google** que o time vai usar pra acessar GTM de cliente (as contas `gascliveseo*`, contas dedicadas, etc.). Limite: 100 emails.

Clique **Save and Continue**.

**Tradeoff aceito:** no modo Testing o refresh token **expira a cada ~7 dias** → cada conta precisa refazer login semanalmente. Na prática isso é 1 clique: a tool `gtm_auth` reabre o navegador automaticamente quando o token morre (ou rode `gtm_auth login profile='X'`). O servidor detecta o token expirado e dispara o re-login sozinho.

#### 4.5. NÃO publique o app

Deixe o **Publishing status** em **Testing**. **Não** clique em "PUBLISH APP". (Publicar sem verificação **piora** — vira bloqueio seco pra escopos sensíveis. Só publicar depois de passar pela verificação completa do Google, que é opcional e fica pra um momento futuro se quiserem eliminar a tela de aviso e o limite de 100 contas.)

### 5. Criar credenciais OAuth

Menu lateral: **APIs & Services → Credentials**

Clique em **+ CREATE CREDENTIALS → OAuth client ID**.

| Campo | Valor |
|-------|-------|
| Application type | **Desktop app** |
| Name | `liveSEO GTM MCP Desktop` |

Clique **Create**.

Vai aparecer um modal com `Client ID` e `Client Secret`. Clique em **Download JSON** — esse arquivo é o `credentials.json` que precisamos.

**Renomeie o arquivo baixado** pra `credentials.json` e guarda num lugar seguro (não commit em repo público).

### 6. Usar as credenciais

Você **não** embute o `client_id`/`client_secret` no pacote nem no repositório. Eles vão como variáveis de ambiente na config do Claude Desktop de cada pessoa:

```json
{
  "mcpServers": {
    "gtm": {
      "command": "npx",
      "args": ["-y", "gtm-mcp-liveseo"],
      "env": {
        "GTM_MCP_CLIENT_ID": "SEU_CLIENT_ID.apps.googleusercontent.com",
        "GTM_MCP_CLIENT_SECRET": "SEU_CLIENT_SECRET"
      }
    }
  }
}
```

> ⚠️ **Segurança**: o `client_secret` aqui não é tão crítico quanto parece — pra apps Desktop, o Google considera ele "público" por natureza (não tem como esconder em binário distribuído). O que protege é o consent screen + escopos + tokens individuais. Mas mesmo assim, **nunca** comite ele no GitHub público.

---

## Checklist final

- [ ] Projeto Google Cloud criado e selecionado
- [ ] Tag Manager API enabled
- [ ] OAuth consent screen configurado como **External**
- [ ] Todos os 9 scopes adicionados
- [ ] App em **Testing** (NÃO publicado)
- [ ] Todas as contas Google do time adicionadas como **test users**
- [ ] Credencial **Desktop app** criada
- [ ] `client_id` + `client_secret` em mãos

Quando estiver pronto, é só configurar no Claude Desktop (ou publicar no npm pro time).

---

## FAQ

**Q: Devo publicar o app?**
**Não.** Para escopos sensíveis (Tag Manager), publicar sem verificação **bloqueia** contas externas (tela vermelha "Este app está bloqueado", sem saída). Mantenha em **Testing** e adicione as contas como **test users** — esse é o único caminho que funciona sem passar pela verificação do Google. Publicar só faz sentido **depois** de verificar (processo opcional: privacy policy pública, domínio verificado em Search Console, vídeo demo, revisão do Google ~1-2 semanas — vale se um dia quiserem tirar a tela de aviso e o limite de 100 contas).

**Q: Por que dá "Este app está bloqueado" (tela vermelha sem botão Avançado)?**
O app está **publicado sem verificação** com escopos sensíveis. Solução: **voltar pra Testing** (botão "Back to testing" no consent screen) e adicionar a conta como test user. Aí a tela vira a **amarela** "O Google não verificou este app", que tem **Avançado → Acessar** (seguro: é o MCP da liveSEO rodando local).

**Q: O que é a tela amarela "O Google não verificou este app"?**
É a esperada no nosso fluxo (Testing + test user). Clique **Avançado → Acessar gtm-liveseo-mcp**. Seguro — o app roda local, o token nem sai da máquina. Acontece a cada novo login.

**Q: O token expira mesmo a cada 7 dias?**
Sim, é limitação do modo Testing do Google. Mas o impacto é pequeno: o MCP detecta o token expirado e reabre o login sozinho (1 clique no navegador). Você também pode forçar com `gtm_auth login profile='X'`. Pra eliminar de vez, só verificando o app (item acima).

**Q: Esse projeto Google Cloud cobra algo?**
Não. As APIs do GTM têm cota gratuita generosa. Só viraria custo se algum dia rolasse uso muito pesado (milhares de chamadas/dia/usuário), o que não é o caso.

**Q: Posso usar um projeto Google Cloud que já existe?**
Pode. Só certifique-se que a Tag Manager API tá habilitada nele e que dá pra adicionar mais um OAuth client.

**Q: E se eu apagar/perder o credentials.json depois?**
Volta no Console → Credentials → clica no nome do client → tem "Download JSON" e "Reset secret". Não há perda real, só inconveniente.

**Q: Preciso criar uma credencial OAuth para CADA conta GTM de cliente que eu quero auditar?**
**Não.** Você cria a credencial OAuth **uma única vez**. Ela identifica o *aplicativo* (o MCP server) para o Google — não uma conta GTM específica. O acesso a cada GTM de cliente vem do **login**: quando o navegador abre no fluxo OAuth, a conta Google que você usar pra logar determina o que você consegue auditar. Se essa conta tem acesso ao container do cliente (porque o cliente te adicionou em `tagmanager.google.com` → Admin → Gerenciamento de Usuários, como é padrão pra agência), você audita normalmente. Para trabalhar com vários clientes/contas, use **perfis**: pelo chat, `gtm_auth login profile='cliente-x'` cria/loga um perfil e `gtm_auth switch profile='cliente-x'` alterna entre eles sem refazer login (cada conta de email = um perfil). Veja [TREINAMENTO-LIVESEO.md](TREINAMENTO-LIVESEO.md).
