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

Depois entre novamente e acesse `/admin`. As APIs administrativas recusam qualquer conta sem `role = admin`.

## Recuperação de senha

O login oferece **Esqueci minha senha**. O usuário recebe por e-mail um link de uso único, válido por 30 minutos, e somente o hash do token é armazenado no Neon. Configure em produção:

- `NEXT_PUBLIC_SITE_URL`: endereço oficial do site, usado para montar o link;
- `RESEND_API_KEY`: chave secreta da conta Resend;
- `PASSWORD_RESET_FROM_EMAIL`: remetente de um domínio verificado, por exemplo `Jaqueline Beauty Studio <acesso@seudominio.com>`.

No Resend, adicione um domínio próprio, publique os registros SPF e DKIM indicados e aguarde o status **Verified**. Depois de alterar variáveis na Vercel, faça um novo deploy para aplicá-las.

Para uma recuperação administrativa sem alterar ou expor a senha, gere um link único no terminal:

```powershell
$env:RESET_EMAIL = "cliente@exemplo.com"
$env:SITE_URL = "https://jaquelinestudio.vercel.app"
npm.cmd run admin:password-reset
```

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
