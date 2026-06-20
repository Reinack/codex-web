# codex-web

Frontend **Next.js + TypeScript** para [aoe2-codex](https://github.com/Reinack/aoe2-codex):
la cara pública del grafo de conocimiento de Age of Empires II (Neo4j + GraphRAG).

> Demo: _pendiente de deploy en Vercel_ · Backend: [aoe2-codex.onrender.com](https://aoe2-codex.onrender.com)

Construido para ejercer el toolbox moderno de Next.js sobre una API real ya
existente, sin reescribir backend. El navegador nunca habla con el Express
directamente: todo pasa por route handlers BFF tipados con **zod**.

## Las 4 superficies (y qué demuestra cada una)

| Ruta | Render | Demuestra |
|---|---|---|
| `/` | Static + ISR | **React Suspense / streaming RSC** — el bloque de stats se suspende mientras el backend responde. |
| `/civs` · `/civs/[slug]` | SSG (`generateStaticParams`) + ISR | **Server Components + SSG + metadata dinámica** (`generateMetadata`) + 404 con `notFound()`. |
| `/counters` | Client | **Interop con librería imperativa** (Cytoscape.js envuelto y tipado) + datos de cliente con **TanStack Query**. |
| `/chat` | Client + BFF streaming | **Streaming NDJSON** token-a-token desde un Route Handler + panel de razonamiento (los chunks del GraphRAG). |

## Arquitectura (patrón BFF)

```
Browser
  ├─ Server Components ─────────────► fetch directo al Express (ISR/caché)
  └─ Client (TanStack Query / chat) ─► Route Handlers /app/api/* (BFF)
                                          └─ proxy tipado + zod ─► Express + Neo4j (aoe2-codex)
```

- `src/lib/api/schema.ts` — contrato zod del backend; normaliza en el borde
  (`path` crudo de Neo4j → `slug` limpio).
- `src/lib/api/client.ts` — `fetchCodex()`: fetch + validación zod + política de
  caché/revalidación centralizada. Mantiene `CODEX_API_BASE` server-side.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 ·
zod · TanStack Query · Cytoscape.js.

## Desarrollo local

```bash
npm install
cp .env.example .env.local      # CODEX_API_BASE apunta al backend
npm run dev                     # http://localhost:3000
```

Scripts: `npm run dev | build | start | lint | typecheck`.

### Nota para Windows detrás de un proxy que intercepta TLS

Si `fetch` al backend HTTPS falla con `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, tu
entorno intercepta TLS con un CA corporativo. Corré el dev server confiando en el
store de certificados del sistema (no desactiva la verificación):

```bash
NODE_OPTIONS=--use-system-ca npm run dev
```

En Linux/Vercel no hace falta. Alternativa: apuntá `CODEX_API_BASE` a un Express
local por HTTP.

## Deploy (Vercel)

1. Importá el repo en Vercel (framework Next.js, autodetectado).
2. Variable de entorno: `CODEX_API_BASE=https://aoe2-codex.onrender.com`.
3. Deploy. El build corre `next build` (SSG de civs + rutas dinámicas BFF).

## CI

GitHub Actions corre `lint` + `typecheck` en cada push/PR. El build de producción
lo hace Vercel.
