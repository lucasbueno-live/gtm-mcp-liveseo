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

#### 4.4. Test users

Pode **pular** esta etapa (adicione só o seu email se o formulário exigir pelo menos um). Não vamos depender da lista de test users porque o app vai ser **publicado** no próximo passo — aí qualquer conta Google consegue logar, sem precisar cadastrar email por email.

> ⚠️ Por que não ficar em "Testing": no modo Testing o refresh token **expira a cada 7 dias**, forçando re-login semanal de cada cliente. Publicando, o token passa a ter longa duração.

Clique **Save and Continue**, depois **Back to Dashboard**.

#### 4.5. Publicar o app (Production, SEM verificação)

Ainda em **APIs & Services → OAuth consent screen**, procure o status de publicação ("Publishing status"). Vai estar em **Testing**.

Clique em **PUBLISH APP** → confirme (**Confirm**).

O status muda pra **In production**.

**Você NÃO precisa enviar pra verificação.** Vai aparecer algo como "Verification not required" ou um botão "Prepare for verification" — **ignore**. Os escopos do Tag Manager são "sensíveis" (não "restritos"), então o app funciona publicado sem verificação. O único efeito de não verificar: cada pessoa vê **uma vez por conta** a tela "O Google não verificou este app" e precisa clicar em **Avançado → Acessar (nome do app)**. É seguro — o app é da liveSEO e roda local na máquina de vocês. (Documentado em [TREINAMENTO-LIVESEO.md](TREINAMENTO-LIVESEO.md) pro time não se assustar.)

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
- [ ] App **publicado** ("In production"), **sem** enviar pra verificação
- [ ] Credencial **Desktop app** criada
- [ ] `client_id` + `client_secret` em mãos

Quando estiver pronto, é só configurar no Claude Desktop (ou publicar no npm pro time).

---

## FAQ

**Q: Preciso publicar o app pra "Production"? E verificar?**
**Publicar: sim. Verificar: não.** Como vocês logam com contas fora do domínio @liveseo, o app tem que ser External e Publicado (senão o token expira a cada 7 dias no modo Testing). A verificação do Google é **opcional** — sem ela, cada conta vê uma vez a tela "app não verificado" e clica em "Avançado → Continuar". É seguro pra ferramenta interna. Verificar só vale se um dia incomodar essa tela ou passar de ~100 contas; aí é um processo à parte (privacy policy pública, domínio verificado, revisão do Google).

**Q: A tela "O Google não verificou este app" é perigosa?**
Não, no nosso caso. Essa tela existe pra proteger usuários de apps de terceiros desconhecidos. Aqui o "app" é o MCP da liveSEO rodando **localmente na máquina de vocês** — o token nem sai do computador. Clicar em "Avançado → Acessar" é seguro. Acontece **uma vez por conta** (depois o Google lembra).

**Q: Esse projeto Google Cloud cobra algo?**
Não. As APIs do GTM têm cota gratuita generosa. Só viraria custo se algum dia rolasse uso muito pesado (milhares de chamadas/dia/usuário), o que não é o caso.

**Q: Posso usar um projeto Google Cloud que já existe?**
Pode. Só certifique-se que a Tag Manager API tá habilitada nele e que dá pra adicionar mais um OAuth client.

**Q: E se eu apagar/perder o credentials.json depois?**
Volta no Console → Credentials → clica no nome do client → tem "Download JSON" e "Reset secret". Não há perda real, só inconveniente.

**Q: Preciso criar uma credencial OAuth para CADA conta GTM de cliente que eu quero auditar?**
**Não.** Você cria a credencial OAuth **uma única vez**. Ela identifica o *aplicativo* (o MCP server) para o Google — não uma conta GTM específica. O acesso a cada GTM de cliente vem do **login**: quando o navegador abre no fluxo OAuth, a conta Google que você usar pra logar determina o que você consegue auditar. Se essa conta tem acesso ao container do cliente (porque o cliente te adicionou em `tagmanager.google.com` → Admin → Gerenciamento de Usuários, como é padrão pra agência), você audita normalmente. Para trabalhar com vários clientes/contas, use **perfis**: pelo chat, `gtm_auth login profile='cliente-x'` cria/loga um perfil e `gtm_auth switch profile='cliente-x'` alterna entre eles sem refazer login (cada conta de email = um perfil). Veja [TREINAMENTO-LIVESEO.md](TREINAMENTO-LIVESEO.md).
