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

- Se a liveSEO tem **Google Workspace** (domínio `liveseo.com.br` gerenciado) → escolha **Internal**. Mais simples, sem verificação do Google necessária.
- Senão → escolha **External** (vamos manter em "Testing" mode pra não precisar de verificação).

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

#### 4.4. Test users (só se escolheu "External")

Se você escolheu **External** no passo 4.1, adicione aqui os emails de todo mundo da liveSEO que vai usar o MCP. Sem isso, o OAuth vai recusar o login deles.

Se escolheu **Internal**, esse passo nem aparece — todos da org têm acesso automaticamente.

Clique **Save and Continue**, depois **Back to Dashboard**.

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

Antes de me devolver, confirma:

- [ ] Projeto Google Cloud criado e selecionado
- [ ] Tag Manager API enabled
- [ ] OAuth consent screen configurado (Internal ou External + Test users)
- [ ] Todos os 9 scopes adicionados
- [ ] Credencial **Desktop app** criada
- [ ] `credentials.json` baixado

Quando estiver pronto, me passa. A partir daí eu sigo com a Fase 3 (refactor do código pra rodar local).

---

## FAQ

**Q: Preciso publicar o app pra "Production"?**
Não. Se estiver "Internal", já tá liberado pra todo mundo da org. Se "External" em "Testing", funciona pros emails listados em test users (limite de 100). Só viraria problema se quiséssemos liberar pra fora da liveSEO — aí teria que passar pela verificação do Google.

**Q: Esse projeto Google Cloud cobra algo?**
Não. As APIs do GTM têm cota gratuita generosa. Só viraria custo se algum dia rolasse uso muito pesado (milhares de chamadas/dia/usuário), o que não é o caso.

**Q: Posso usar um projeto Google Cloud que já existe?**
Pode. Só certifique-se que a Tag Manager API tá habilitada nele e que dá pra adicionar mais um OAuth client.

**Q: E se eu apagar/perder o credentials.json depois?**
Volta no Console → Credentials → clica no nome do client → tem "Download JSON" e "Reset secret". Não há perda real, só inconveniente.

**Q: Preciso criar uma credencial OAuth para CADA conta GTM de cliente que eu quero auditar?**
**Não.** Você cria a credencial OAuth **uma única vez**. Ela identifica o *aplicativo* (o MCP server) para o Google — não uma conta GTM específica. O acesso a cada GTM de cliente vem do **login**: quando o navegador abre no fluxo OAuth, a conta Google que você usar pra logar determina o que você consegue auditar. Se essa conta tem acesso ao container do cliente (porque o cliente te adicionou em `tagmanager.google.com` → Admin → Gerenciamento de Usuários, como é padrão pra agência), você audita normalmente. Para trocar de conta/cliente: `npx gtm-mcp-liveseo --logout` e logue com outra conta — ou use uma conta liveSEO que já tenha acesso a vários clientes de uma vez.
