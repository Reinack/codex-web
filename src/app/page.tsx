import { Suspense } from "react";
import Link from "next/link";
import { getStats } from "@/lib/api/stats";

// Componente async que se suspende mientras el backend responde: Next.js hace
// streaming del HTML y muestra el fallback hasta que llegan los datos.
async function StatsStrip() {
  const stats = await getStats();
  const items = [
    { label: "Notas", value: stats.notes },
    { label: "Enlaces", value: stats.links },
    { label: "Unidades únicas", value: stats.uu },
    { label: "Techs únicas", value: stats.ut },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <dd className="text-2xl font-semibold tabular-nums">
            {it.value.toLocaleString("es")}
          </dd>
          <dt className="text-xs text-zinc-500">{it.label}</dt>
        </div>
      ))}
    </dl>
  );
}

function StatsStripSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-[68px] animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
        />
      ))}
    </div>
  );
}

const SURFACES = [
  { href: "/civs", title: "Civilizaciones", desc: "Explorá cada civ, su kit único y su tier." },
  { href: "/tree", title: "Árbol tecnológico", desc: "El tech tree completo por civilización." },
  { href: "/counters", title: "Grafo de counters", desc: "Qué le gana a qué, como red interactiva." },
  { href: "/chat", title: "Chat GraphRAG", desc: "Preguntá estrategia; responde sobre el grafo." },
];

export default function Home() {
  return (
    <main className="flex flex-col gap-10">
      <section className="flex flex-col items-start gap-4 pt-4">
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
          Neo4j · GraphRAG · 658 notas
        </span>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          El grafo de conocimiento de{" "}
          <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
            Age of Empires II
          </span>
          , consultable.
        </h1>
        <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          Civilizaciones, árbol tecnológico, grafo de counters y un chat que responde
          sobre el grafo. Frontend Next.js + TypeScript sobre la API de aoe2-codex.
        </p>
        <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
          {["Next.js", "TypeScript", "Tailwind", "TanStack Query", "Cytoscape", "zod"].map(
            (t) => (
              <span
                key={t}
                className="rounded-md border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-800 dark:bg-zinc-900"
              >
                {t}
              </span>
            ),
          )}
        </div>
      </section>

      <Suspense fallback={<StatsStripSkeleton />}>
        <StatsStrip />
      </Suspense>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SURFACES.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-amber-500/60"
          >
            <span className="font-medium">{s.title}</span>
            <span className="text-sm text-zinc-500">{s.desc}</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
