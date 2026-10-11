# koi

Next.js 15 (App Router) + TypeScript estricto + Tailwind CSS v4 + Drizzle ORM (Neon/PostgreSQL) + Resend + WhatsApp Cloud API, desplegado en **Cloudflare Pages** con `@cloudflare/next-on-pages` (Edge Runtime).

## Estructura

```
.
├── drizzle/                     # Migraciones SQL generadas por drizzle-kit
├── src/
│   ├── actions/                 # Server Actions ("use server") — toda mutación de datos
│   │   └── contact.ts
│   ├── app/                     # App Router (Server Components por defecto)
│   │   ├── api/webhooks/whatsapp/route.ts   # Webhook de Meta (verificación + firma HMAC)
│   │   ├── contacto/page.tsx    # Ejemplo: página RSC + formulario cliente + Server Action
│   │   ├── error.tsx / not-found.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── forms/               # Componentes "use client" con interactividad
│   │   └── ui/                  # Primitivas visuales (sin estado, válidas en RSC)
│   ├── db/
│   │   ├── index.ts             # getDb(): Drizzle + driver HTTP de Neon (Edge-safe)
│   │   └── schema.ts            # Tablas, índices y tipos inferidos
│   └── lib/
│       ├── email/               # Cliente Resend + plantillas
│       ├── validations/         # Esquemas Zod compartidos cliente/servidor
│       ├── whatsapp/            # Cliente Cloud API + verificación de webhooks
│       ├── env.ts               # Variables de entorno validadas (Zod)
│       └── utils.ts
├── drizzle.config.ts
├── env.d.ts                     # Tipos de los bindings de Cloudflare (CloudflareEnv)
├── next.config.mjs
└── wrangler.toml
```

## Convenciones

- **RSC por defecto.** `"use client"` solo en componentes con hooks/eventos (`components/forms/*`, `error.tsx`).
- **Mutaciones con Server Actions** en `src/actions/`, validadas con Zod y devolviendo un estado tipado para `useActionState`.
- **Edge Runtime.** Toda ruta dinámica (páginas con Server Actions, route handlers) debe exportar `export const runtime = "edge"`; `next-on-pages` falla el build si falta.
- **Nada de APIs de Node** (`fs`, `net`, `node:crypto`, drivers TCP como `pg`) en código de servidor. Se usa `fetch` y Web Crypto.
- **Variables de entorno**: siempre vía `getServerEnv()`. En Cloudflare `process.env` llega vacío; las variables se leen desde `getRequestContext().env`.
- Módulos que solo deben correr en el servidor importan `server-only`.

## Decisiones técnicas

| Tema | Elección | Motivo |
| --- | --- | --- |
| ORM | Drizzle | Sin binario/engine, bundle chico, funciona nativo en Edge. Prisma en Edge requiere adaptadores extra. |
| Base de datos | Neon + `@neondatabase/serverless` (HTTP) | Cada query es un `fetch`: sin conexiones TCP ni pool, ideal para Workers. Supabase también sirve vía su pooler, pero requiere un driver TCP (`postgres`) que en Workers es menos directo. |
| Email | Resend SDK | Basado en `fetch`, compatible con Edge. |
| WhatsApp | Meta WhatsApp Cloud API (vía `fetch`) | Ver costos abajo. Twilio cobra un fee por mensaje encima del de Meta. |

### WhatsApp: ¿se puede usar gratis?

Con la **Cloud API de Meta** directamente (sin BSP intermedio) no hay costo de plataforma ni de hosting. Meta cobra por mensaje de *plantilla* entregado, con estas excepciones gratuitas:

- **Mensajes de servicio** (texto libre, `sendWhatsAppText`): gratis, pero solo dentro de la **ventana de 24 h** que se abre cuando el usuario le escribe al número del negocio.
- **Plantillas de utilidad** enviadas dentro de esa ventana de 24 h: gratis.
- Conversaciones iniciadas desde anuncios *click-to-WhatsApp* o botones de la página de Facebook: 72 h gratis.
- Plantillas de **marketing / autenticación**, o de utilidad fuera de la ventana: pagas (precio por país).

Para notificaciones sin costo, la estrategia es que el usuario inicie la conversación (por ejemplo un link `https://wa.me/<numero>?text=...`) y responder dentro de las 24 h. Para desarrollo, Meta da un número de prueba gratuito que puede enviar a hasta 5 destinatarios verificados.

> Twilio no tiene tier gratuito para WhatsApp en producción (solo sandbox con crédito de prueba).

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # para `next dev` y drizzle-kit
cp .env.example .dev.vars    # para `wrangler pages dev`
npm run db:generate          # genera la migración desde src/db/schema.ts
npm run db:migrate           # la aplica en Neon
npm run dev
```

## Scripts

| Script | Descripción |
| --- | --- |
| `dev` | Next.js en modo desarrollo (con bindings de Cloudflare vía `setupDevPlatform`) |
| `build` / `typecheck` / `lint` | Build de Next, `tsc --noEmit`, ESLint |
| `pages:build` | Build para Cloudflare con `@cloudflare/next-on-pages` |
| `preview` | Build + `wrangler pages dev` (runtime real de Workers en local) |
| `deploy` | Build + `wrangler pages deploy` |
| `cf-typegen` | Regenera `env.d.ts` desde `wrangler.toml` |
| `db:generate` / `db:migrate` / `db:push` / `db:studio` | Drizzle Kit |

## Despliegue en Cloudflare Pages

1. Crear el proyecto en Pages (build command: `npx @cloudflare/next-on-pages`, output: `.vercel/output/static`).
2. Activar el flag de compatibilidad `nodejs_compat` (ya está en `wrangler.toml`).
3. Cargar los secretos: `wrangler pages secret put DATABASE_URL` (idem `RESEND_API_KEY`, `WHATSAPP_*`, `EMAIL_FROM`).
4. Registrar el webhook en Meta: `https://<dominio>/api/webhooks/whatsapp` con el `WHATSAPP_VERIFY_TOKEN`.

> **Nota:** `@cloudflare/next-on-pages` está deprecado en favor de [OpenNext para Cloudflare](https://opennext.js.org/cloudflare) y solo soporta Next.js hasta 15.5.2 (por eso está fijada esa versión). Si se necesita Next 16 o APIs de Node, conviene migrar a `@opennextjs/cloudflare` (Workers).
