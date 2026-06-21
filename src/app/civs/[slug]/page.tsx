import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCiv, getCivs } from "@/lib/api/civs";
import { CodexApiError } from "@/lib/api/client";
import { civEmblemUrl } from "@/lib/img";
import { RadarChart } from "@/components/RadarChart";
import { getCivRadar, PHASE_AXES, CATEGORY_AXES, RADAR_MAX } from "@/lib/radar/data";

type Params = { params: Promise<{ slug: string }> };

// SSG: pre-renderiza una página por civ a partir del listado del grafo.
// Si el backend no responde en build (p. ej. cold start), degradamos a [] y las
// páginas se generan on-demand vía ISR — el build nunca falla por eso.
export async function generateStaticParams() {
  try {
    const civs = await getCivs();
    return civs.map((c) => ({ slug: c.slug }));
  } catch {
    return [];
  }
}

// Metadata dinámica por civ (título de pestaña + descripción social).
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  try {
    const civ = await getCiv(slug);
    return {
      title: civ.title,
      description: `Kit único, tiers y counters de ${civ.title} en AoE2.`,
    };
  } catch {
    return { title: "Civilización" };
  }
}

export default async function CivDetailPage({ params }: Params) {
  const { slug } = await params;

  let civ;
  try {
    civ = await getCiv(slug);
  } catch (err) {
    if (err instanceof CodexApiError && err.status === 404) notFound();
    throw err;
  }

  const radar = getCivRadar(civ.slug);

  return (
    <main className="flex flex-col gap-8">
      <Link
        href="/civs"
        className="text-sm text-zinc-500 transition-colors hover:text-amber-600 dark:hover:text-amber-400"
      >
        ← Civilizaciones
      </Link>

      <header className="flex items-center gap-4">
        <Image
          src={civEmblemUrl(civ.slug)}
          alt={`Emblema de ${civ.title}`}
          width={64}
          height={64}
          className="h-16 w-16 object-contain"
          unoptimized
        />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{civ.title}</h1>
          {civ.aliases.length > 0 && (
            <p className="text-sm text-zinc-500">{civ.aliases.join(" · ")}</p>
          )}
        </div>
      </header>

      {civ.tiers.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-zinc-500">Tiers</h2>
          <ul className="flex flex-wrap gap-2">
            {civ.tiers.map((t) => (
              <li
                key={t.list}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="text-zinc-500">{t.list}:</span>{" "}
                <span className="font-semibold">{t.tier ?? "—"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {radar && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-500">Perfil (radar)</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="mb-1 text-center text-xs font-medium text-zinc-500">
                Fase y mapa
              </h3>
              <RadarChart
                axes={PHASE_AXES}
                max={RADAR_MAX}
                series={[{ name: civ.title, values: radar.phase, color: "#f59e0b" }]}
              />
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="mb-1 text-center text-xs font-medium text-zinc-500">
                Categoría
              </h3>
              <RadarChart
                axes={CATEGORY_AXES}
                max={RADAR_MAX}
                series={[{ name: civ.title, values: radar.category, color: "#f59e0b" }]}
              />
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <KitSection title="Unidades únicas" items={civ.uniqueUnits} />
        <KitSection title="Tecnologías únicas" items={civ.uniqueTechs} />
      </div>
    </main>
  );
}

function KitSection({
  title,
  items,
}: {
  title: string;
  items: { title: string; slug: string }[];
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-zinc-500">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-400">Sin datos en el grafo.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((it) => (
            <li
              key={it.slug}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              {it.title}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
