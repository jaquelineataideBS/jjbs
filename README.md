# vinext-starter

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

Signed-in visitors receive both `oai-authenticated-user-id` and `oai-authenticated-user-email`. Private Sites require every visitor to sign in; public Sites may also have anonymous visitors, for whom neither header is present.

The user ID is stable for the same user on the same Site and different across Sites. Email and name are intended for display or contact purposes.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes
- `npm run db:migrate`: apply pending PostgreSQL migrations
- `npm run db:seed`: apply the idempotent initial catalog and schedule seed

## Agendamento e banco

O fluxo público de `/agendar` envia solicitações para `POST /api/appointments`.
O endpoint valida os dados no servidor, calcula a duração usando o serviço cadastrado
e impede conflitos de horário. O projeto usa Neon PostgreSQL por meio de
`DATABASE_URL`.

Para preparar um ambiente novo, aplique as migrations de `drizzle-pg/` e execute
`npm.cmd run db:seed`. A agenda inicial cadastra Jaqueline Justino, associa os
serviços ativos e deixa segunda a sábado, 09h–19h, com intervalo de 12h–13h.
Tudo pode ser alterado em `/admin`, na aba **Configurar agenda**. O seed é
idempotente e não substitui dados de produção.

## Primeiro acesso administrativo

Crie a conta da proprietária em `/minha-conta` e promova somente esse e-mail para administradora com a variável `ADMIN_EMAIL` definida no terminal. O comando usa a mesma `DATABASE_URL` já configurada e nunca expõe a senha:

```powershell
$env:ADMIN_EMAIL = "seu-email@exemplo.com"
npm.cmd run admin:promote
```

Depois entre novamente e acesse `/admin`. A primeira conta administrativa passa a criar os demais acessos internos pelo próprio painel.

## Usuários internos e permissões

Na aba **Usuários** do painel administrativo, um administrador pode cadastrar, editar e inativar acessos internos, redefinir senhas e vincular uma conta a uma profissional da agenda.

- **Administrador:** acesso total, incluindo usuários.
- **Gestão:** operação, financeiro, marketing, comunicação, avaliações e configurações, sem administrar contas.
- **Funcionário:** painel, agenda e clientes.

As permissões são verificadas nas APIs. Contas inativas perdem as sessões abertas, o próprio administrador não pode inativar ou alterar seu cargo e o último administrador ativo é protegido. Antes de usar o vínculo entre usuário e profissional em um ambiente existente, aplique as migrations de `drizzle-pg/` com `npm.cmd run db:migrate`.

## Recuperação de senha

O login oferece **Esqueci minha senha**. A recuperação é local: o usuário informa o e-mail, continua neste site e cria uma nova senha. Nenhum e-mail é enviado. O token de uso único expira em 30 minutos e somente seu hash é armazenado no Neon.

Para uma recuperação administrativa sem alterar ou expor a senha, gere um link único no terminal:

```powershell
$env:RESET_EMAIL = "cliente@exemplo.com"
$env:SITE_URL = "https://jaquelinestudio.vercel.app"
npm.cmd run admin:password-reset
```

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)

## Validação do app

O build de produção atual usa Next.js: `npm.cmd run build`. A suíte completa roda com `npm.cmd test`.
Para incluir o teste HTTP da página inicial, inicie o build de produção e defina `TEST_BASE_URL` com sua URL antes de executar os testes. Sem essa variável, apenas o teste HTTP é marcado como pendente; os testes de regras e de PWA continuam sendo executados.

As fotos de celular são preparadas no navegador antes do envio (arquivo original de até 25 MB; imagem enviada de até 3 MB). JPEG, PNG e WebP são processados diretamente; HEIC/HEIF dependem da capacidade de decodificação do navegador, com orientação para usar JPEG quando não houver suporte. O servidor continua validando a assinatura e o limite do arquivo recebido.

O service worker armazena somente assets com hash e a página neutra de conexão indisponível. Páginas, APIs e fotos mutáveis não usam esse cache. Atualizações são verificadas ao retornar ao app; uma versão nova oferece o botão de atualização sem descartar formulários abertos.

## Notificações push

O app mantém os avisos e as preferências no Neon. O Firebase Cloud Messaging entrega push de novos agendamentos às contas internas e de cupons/promoções às clientes com consentimento de marketing. A cliente ativa o consentimento e as notificações na área **Minha conta**; o studio ativa os avisos no painel.

Configure `NEXT_PUBLIC_FIREBASE_VAPID_KEY` com a chave pública Web Push de Firebase Console → Configurações do projeto → Cloud Messaging → Certificados Web Push. Configure `FIREBASE_SERVICE_ACCOUNT_JSON` com o JSON privado da conta de serviço como segredo no ambiente local/deploy; habilite FCM Registration API e Firebase Cloud Messaging API (HTTP v1) no projeto Google Cloud/Firebase. Nunca comite ou compartilhe o JSON privado. O worker FCM tem escopo `/fcm/` separado do service worker PWA existente.
