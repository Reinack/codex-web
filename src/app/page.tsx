import { Suspense, type ReactNode, type SVGProps } from "react";
import Link from "next/link";
import { getStats } from "@/lib/api/stats";

// Iconos inline (sin dependencia extra): trazo simple, coherente con el resto.
function IconNotes(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </svg>
  );
}
function IconLink(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="M11 7l1.5-1.5a3.5 3.5 0 0 1 5 5L16 12" />
      <path d="M13 17l-1.5 1.5a3.5 3.5 0 0 1-5-5L8 12" />
    </svg>
  );
}
function IconStar(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7Z" />
    </svg>
  );
}
function IconFlask(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 3h6M10 3v6l-5.2 8.8A1.5 1.5 0 0 0 6.1 20h11.8a1.5 1.5 0 0 0 1.3-2.2L14 9V3" />
      <path d="M8.5 15h7" />
    </svg>
  );
}
function IconShield(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3.5 19 6v6c0 4.2-2.9 7.2-7 8.5-4.1-1.3-7-4.3-7-8.5V6Z" />
      <path d="m9.2 12 2 2 3.6-3.8" />
    </svg>
  );
}
function IconBranch(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="6" cy="5" r="2" />
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="12" r="2" />
      <path d="M6 7v10M6 12h6a4 4 0 0 0 4-4V7.2" />
    </svg>
  );
}
function IconSwords(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 4l7 7M4 4v4M4 4h4" />
      <path d="M20 4l-7 7M20 4v4M20 4h-4" />
      <path d="M6 18l3-3M18 18l-3-3M10 14l-6 6M14 14l6 6" />
    </svg>
  );
}
function IconVersus(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 4v7a4 4 0 0 0 4 4h1M18 4v7a4 4 0 0 1-4 4h-1" />
      <path d="M11 15v5M13 15v5" />
    </svg>
  );
}
function IconNetwork(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="5" cy="6" r="2.2" />
      <circle cx="19" cy="6" r="2.2" />
      <circle cx="12" cy="18" r="2.2" />
      <path d="M6.8 7.3 10.5 16M17.2 7.3 13.5 16M7.2 6h9.6" />
    </svg>
  );
}
function IconChat(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 5.5h16v10H9l-4 3.5v-3.5H4Z" />
      <path d="M8 9.5h8M8 12.5h5" />
    </svg>
  );
}

// Componente async que se suspende mientras el backend responde: Next.js hace
// streaming del HTML y muestra el fallback hasta que llegan los datos.
async function StatsStrip() {
  const stats = await getStats();
  const items = [
    { label: "Notas", value: stats.notes, icon: IconNotes },
    { label: "Enlaces", value: stats.links, icon: IconLink },
    { label: "Unidades únicas", value: stats.uu, icon: IconStar },
    { label: "Techs únicas", value: stats.ut, icon: IconFlask },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="surface relative overflow-hidden p-4">
          <span className="absolute inset-x-0 top-0 h-px bg-[var(--gold-line)]" />
          <it.icon className="mb-2 h-4 w-4 text-amber-500" />
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
        <div key={i} className="surface h-[84px] animate-pulse" />
      ))}
    </div>
  );
}

const SURFACES: { href: string; title: string; desc: string; icon: (props: SVGProps<SVGSVGElement>) => ReactNode }[] = [
  { href: "/civs", title: "Civilizaciones", desc: "Explorá cada civ, su kit único y su tier.", icon: IconShield },
  { href: "/tree", title: "Árbol tecnológico", desc: "El tech tree completo por civilización.", icon: IconBranch },
  { href: "/counters", title: "Grafo de counters", desc: "Qué le gana a qué, como red interactiva.", icon: IconSwords },
  { href: "/matchups", title: "Matchup Lab", desc: "Cruzá dos civs: plan, counters y notas.", icon: IconVersus },
  { href: "/graph", title: "Explorador del grafo", desc: "Navegá el grafo de conocimiento nodo a nodo.", icon: IconNetwork },
  { href: "/chat", title: "Chat GraphRAG", desc: "Preguntá estrategia; responde sobre el grafo.", icon: IconChat },
];

export default function Home() {
  return (
    <main className="flex flex-col gap-10">
      <section className="relative isolate flex flex-col items-start gap-4 overflow-hidden pt-4">
        {/* Grafo decorativo de fondo — referencia visual al producto (nodos + aristas). */}
        <svg
          viewBox="0 0 800 320"
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 -z-10 h-[26rem] w-[42rem] text-[rgba(75,51,28,0.2)]"
        >
          <g stroke="currentColor" strokeWidth="1.2" fill="none">
            <path d="M120 60 320 40 520 100 680 60" />
            <path d="M120 60 260 180 320 40" />
            <path d="M260 180 460 220 520 100" />
            <path d="M460 220 620 260 680 60" />
            <path d="M320 40 460 220" />
          </g>
          <g fill="currentColor">
            <circle cx="120" cy="60" r="5" />
            <circle cx="320" cy="40" r="7" />
            <circle cx="520" cy="100" r="5" />
            <circle cx="680" cy="60" r="6" />
            <circle cx="260" cy="180" r="6" />
            <circle cx="460" cy="220" r="8" />
            <circle cx="620" cy="260" r="5" />
          </g>
        </svg>

        <span className="border border-[var(--rule)] px-3 py-0.5 text-sm italic text-[var(--ink-700)]">
          Neo4j · GraphRAG · 1000+ notas
        </span>
        <h1 className="max-w-3xl text-3xl leading-tight sm:text-[2.6rem] xl:text-[3.2rem]">
          El grafo de conocimiento de{" "}
          <span className="text-[var(--red-500)]">
            Age of Empires II
          </span>
          , consultable.
        </h1>
        <div className="ornament w-[180px]" aria-hidden />
        <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          Civilizaciones, árbol tecnológico, grafo de counters y un chat que responde
          sobre el grafo. Frontend Next.js + TypeScript sobre la API de aoe2-codex.
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href="/graph"
            className="aoe-btn"
          >
            Explorar el grafo →
          </Link>
          <Link
            href="/chat"
            className="field flex items-center px-4 py-2 transition-colors hover:text-[var(--red-500)]"
          >
            Preguntarle al chat
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 text-xs text-zinc-500">
          {["Next.js", "TypeScript", "Tailwind", "TanStack Query", "Cytoscape", "zod"].map(
            (t) => (
              <span key={t} className="surface px-2 py-1">
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
            className="surface surface-hover group flex flex-col gap-3 p-5"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <s.icon className="h-[18px] w-[18px]" />
            </span>
            <span className="flex items-center gap-1 font-display text-[15px] font-bold tracking-[0.03em]">
              {s.title}
              <span className="translate-x-0 text-amber-500 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100">
                →
              </span>
            </span>
            <span className="text-sm text-zinc-500">{s.desc}</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
