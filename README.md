# koi

Next.js 15 (App Router) + TypeScript estricto + Tailwind CSS v4 + Drizzle ORM (PostgreSQL) + link de WhatsApp, desplegado en **Cloudflare Workers** con `@opennextjs/cloudflare`.

## Estructura

```
.
├── drizzle/                     # Migraciones SQL generadas por drizzle-kit
├── src/
│   ├── actions/                 # Server Actions ("use server") — toda mutación de datos
│   │   └── contact.ts
│   ├── app/                     # App Router (Server Components por defecto)
│   │   ├── contacto/page.tsx    # Ejemplo: página RSC + formulario cliente + Server Action
│   │   ├── error.tsx / not-found.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── forms/               # Componentes "use client" con interactividad
│   │   └── ui/                  # Primitivas visuales (sin estado, válidas en RSC)
│   ├── db/
│   │   ├── index.ts             # getDb(): Drizzle + postgres.js (PostgreSQL estándar)
│   │   └── schema.ts            # Tablas, índices y tipos inferidos
│   └── lib/
│       ├── validations/         # Esquemas Zod compartidos cliente/servidor
│       ├── whatsapp/            # Link wa.me para que el cliente envíe el pedido
│       ├── env.ts               # Variables de entorno validadas (Zod)
│       └── utils.ts
├── drizzle.config.ts
├── env.d.ts                     # Tipos de los bindings de Cloudflare (CloudflareEnv)
├── open-next.config.ts
├── next.config.mjs
└── wrangler.toml
```

## Convenciones

- **RSC por defecto.** `"use client"` solo en componentes con hooks/eventos (`components/forms/*`, `error.tsx`).
- **Mutaciones con Server Actions** en `src/actions/`, validadas con Zod y devolviendo un estado tipado para `useActionState`.
- **Runtime Node.js** en Cloudflare vía OpenNext. No uses `export const runtime = "edge"`.
- **PostgreSQL estándar** con el driver `postgres` (`DATABASE_URL`). Está en `serverExternalPackages` para que Workers resuelva el export `workerd`. No usar `@neondatabase/serverless`.
- **WhatsApp** es un link `https://wa.me/<WHATSAPP_NUMBER>`. No hay cliente de Meta ni Twilio.
- **Variables de entorno**: siempre vía `getServerEnv()`. En Cloudflare se leen desde `getCloudflareContext().env`, con fallback a `process.env` en local.
- Módulos que solo deben correr en el servidor importan `server-only`.

## Decisiones técnicas

| Tema | Elección | Motivo |
| --- | --- | --- |
| ORM | Drizzle | Sin binario/engine. El driver `postgres` queda fuera del bundle (`serverExternalPackages`). |
| Base de datos | PostgreSQL + `postgres` (postgres.js) | Cualquier Postgres vía `DATABASE_URL`. `prepare: false` para poolers en modo transaction. |
| WhatsApp | Link `wa.me` | El cliente abre WhatsApp con el pedido escrito y lo envía al número de `WHATSAPP_NUMBER`. Sin API de Meta ni Twilio. |

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # para `next dev` y drizzle-kit
cp .env.example .dev.vars    # para `npm run preview`
npm run db:generate          # genera la migración desde src/db/schema.ts
npm run db:migrate           # la aplica en PostgreSQL
npm run dev
```

## Scripts

| Script | Descripción |
| --- | --- |
| `dev` | Next.js en modo desarrollo (bindings de Cloudflare vía `initOpenNextCloudflareForDev`) |
| `build` / `typecheck` / `lint` | Build de Next, `tsc --noEmit`, ESLint |
| `preview` | Build de OpenNext + runtime real de Workers en local |
| `deploy` | Build de OpenNext + deploy del Worker |
| `cf-typegen` | Regenera `env.d.ts` desde `wrangler.toml` |
| `db:generate` / `db:migrate` / `db:push` / `db:studio` | Drizzle Kit |

## Despliegue en Cloudflare

1. El Worker ya está descrito en `wrangler.toml` (`nodejs_compat` y `global_fetch_strictly_public`).
2. Cargar los secretos: `wrangler secret put DATABASE_URL` (idem `WHATSAPP_NUMBER`).
3. `npm run deploy`.
