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
  { href: "/counters", title: "Grafo de counters", desc: "Qué le gana a qué, como red interactiva." },
  { href: "/chat", title: "Chat GraphRAG", desc: "Preguntá estrategia; responde sobre el grafo." },
];

export default function Home() {
  return (
    <main className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          El grafo de conocimiento de{" "}
          <span className="text-amber-600 dark:text-amber-400">Age of Empires II</span>,
          consultable.
        </h1>
        <p className="max-w-2xl text-zinc-600 dark:text-zinc-400">
          Frontend Next.js + TypeScript sobre la API de aoe2-codex (Neo4j + GraphRAG).
        </p>
      </section>

      <Suspense fallback={<StatsStripSkeleton />}>
        <StatsStrip />
      </Suspense>

      <section className="grid gap-4 sm:grid-cols-3">
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
