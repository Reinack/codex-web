"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCivsClient, fetchMatchup, fetchCivRadar } from "@/lib/api/explore-client";
import type { CounterEdge } from "@/lib/api/schema";
import { RadarChart } from "@/components/RadarChart";
import { PHASE_AXES, CATEGORY_AXES, RADAR_MAX } from "@/lib/radar/data";
import { buildRadarPlan } from "@/lib/radar/plan";

const ME_COLOR = "#f59e0b";
const VS_COLOR = "#0ea5e9";

function MatchupRadars({ me, vs }: { me: string; vs: string }) {
  const meQ = useQuery({ queryKey: ["radar", me], queryFn: () => fetchCivRadar(me) });
  const vsQ = useQuery({ queryKey: ["radar", vs], queryFn: () => fetchCivRadar(vs) });
  const meR = meQ.data;
  const vsR = vsQ.data;
  if (!meR || !vsR) return null; // ambas civs deben tener datos de radar

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-1 text-center text-xs font-medium text-zinc-500">Fase y mapa</h3>
        <RadarChart
          axes={PHASE_AXES}
          max={RADAR_MAX}
          series={[
            { name: me, values: meR.phase, color: ME_COLOR },
            { name: vs, values: vsR.phase, color: VS_COLOR },
          ]}
        />
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-1 text-center text-xs font-medium text-zinc-500">Categoría</h3>
        <RadarChart
          axes={CATEGORY_AXES}
          max={RADAR_MAX}
          series={[
            { name: me, values: meR.category, color: ME_COLOR },
            { name: vs, values: vsR.category, color: VS_COLOR },
          ]}
        />
      </div>
    </div>
  );
}

export default function MatchupsPage() {
  const civsQ = useQuery({ queryKey: ["civs"], queryFn: fetchCivsClient });
  const [me, setMe] = useState("");
  const [vs, setVs] = useState("");
  const [map, setMap] = useState("");
  const [submitted, setSubmitted] = useState<{ me: string; vs: string; map: string } | null>(null);

  const m = useQuery({
    queryKey: ["matchup", submitted],
    queryFn: () => fetchMatchup(submitted!.me, submitted!.vs, submitted!.map),
    enabled: !!submitted,
  });

  // Radares de ambas civs (comparten caché con MatchupRadars por queryKey) →
  // de acá derivamos el plan y las amenazas que SÍ varían por civilización.
  const meTitle = m.data?.me.title;
  const vsTitle = m.data?.vs.title;
  const meRadarQ = useQuery({
    queryKey: ["radar", meTitle],
    queryFn: () => fetchCivRadar(meTitle!),
    enabled: !!meTitle,
  });
  const vsRadarQ = useQuery({
    queryKey: ["radar", vsTitle],
    queryFn: () => fetchCivRadar(vsTitle!),
    enabled: !!vsTitle,
  });
  const meBrief =
    meRadarQ.data && vsRadarQ.data ? buildRadarPlan(meRadarQ.data, vsRadarQ.data) : null;
  const vsBrief =
    meRadarQ.data && vsRadarQ.data ? buildRadarPlan(vsRadarQ.data, meRadarQ.data) : null;

  const run = (e: React.FormEvent) => {
    e.preventDefault();
    if (me && vs && me !== vs) setSubmitted({ me, vs, map });
  };

  const civs = civsQ.data ?? [];

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Matchup Lab</h1>
        <p className="text-sm text-zinc-500">
          Cruzá dos civilizaciones: plan de juego, counters a favor y en contra, y notas
          del grafo que mencionan a ambas.
        </p>
      </header>

      <form onSubmit={run} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <CivSelect label="Tu civilización" value={me} onChange={setMe} options={civs} />
        <CivSelect label="Rival" value={vs} onChange={setVs} options={civs} />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Mapa (opcional)</label>
          <input
            value={map}
            onChange={(e) => setMap(e.target.value)}
            placeholder="Arabia, Arena…"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <button
          type="submit"
          disabled={!me || !vs || me === vs}
          className="self-end rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
        >
          Analizar
        </button>
      </form>
      {me && vs && me === vs && (
        <p className="text-xs text-rose-500">Elegí dos civilizaciones distintas.</p>
      )}

      {m.isFetching && <p className="text-sm text-zinc-500">analizando matchup…</p>}
      {m.isError && (
        <p className="text-sm text-rose-500">
          {m.error instanceof Error ? m.error.message : "Error al analizar."}
        </p>
      )}

      {m.data && (
        <div className="flex flex-col gap-6">
          <MatchupRadars me={m.data.me.title} vs={m.data.vs.title} />

          {meBrief && (
            <div className="grid gap-4 lg:grid-cols-2">
              <PlanCard title={`Plan — ${m.data.me.title}`} bullets={meBrief.plan} accent />
              <PlanCard title={`Amenazas — ${m.data.me.title}`} bullets={meBrief.threats} tone="bad" />
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <PlanCard
              title={`Plan rival — ${m.data.vs.title}`}
              bullets={vsBrief ? vsBrief.plan : m.data.planVs}
            />
            <PlanCard title={`Notas tácticas — ${m.data.me.title}`} bullets={m.data.plan} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <CounterCard
              title="Tus counters"
              subtitle={`${m.data.me.title} le gana a ${m.data.vs.title}`}
              edges={m.data.counters.answers}
              tone="good"
            />
            <CounterCard
              title="Amenazas"
              subtitle={`${m.data.vs.title} te counterea`}
              edges={m.data.counters.threats}
              tone="bad"
            />
          </div>

          {m.data.sharedNotes.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-zinc-500">Notas que mencionan a ambas</h2>
              <ul className="flex flex-col gap-2">
                {m.data.sharedNotes.map((n, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="text-xs text-zinc-500">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{n.note}</span>
                      {n.heading ? ` · ${n.heading}` : ""}
                    </div>
                    {n.excerpt && (
                      <p className="mt-1 line-clamp-3 text-zinc-600 dark:text-zinc-400">
                        {n.excerpt}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </main>
  );
}

function CivSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { title: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-zinc-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-900"
      >
        <option value="">Elegí…</option>
        {options.map((c) => (
          <option key={c.title} value={c.title}>
            {c.title}
          </option>
        ))}
      </select>
    </div>
  );
}

function PlanCard({
  title,
  bullets,
  accent,
  tone,
}: {
  title: string;
  bullets: string[];
  accent?: boolean;
  tone?: "bad";
}) {
  const cls =
    tone === "bad"
      ? "border-rose-400/40 bg-rose-500/5"
      : accent
        ? "border-amber-400/40 bg-amber-500/5"
        : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900";
  return (
    <section className={`flex flex-col gap-2 rounded-xl border p-4 ${cls}`}>
      <h2 className="text-sm font-semibold">{title}</h2>
      {bullets.length === 0 ? (
        <p className="text-sm text-zinc-400">Sin plan generado.</p>
      ) : (
        <ul className="flex list-disc flex-col gap-1.5 pl-4 text-sm text-zinc-700 dark:text-zinc-300">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CounterCard({
  title,
  subtitle,
  edges,
  tone,
}: {
  title: string;
  subtitle: string;
  edges: CounterEdge[];
  tone: "good" | "bad";
}) {
  const dot = tone === "good" ? "bg-emerald-500" : "bg-rose-500";
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-zinc-500">{subtitle}</p>
      </div>
      {edges.length === 0 ? (
        <p className="text-sm text-zinc-400">Sin counters relevantes.</p>
      ) : (
        <ul className="flex max-h-80 flex-col gap-1.5 overflow-auto text-sm">
          {edges.slice(0, 12).map((e, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
              <span className="text-zinc-700 dark:text-zinc-300">
                {e.from} <span className="text-zinc-400">vs</span> {e.target}
              </span>
              {e.strength && (
                <span className="ml-auto shrink-0 text-xs text-zinc-500">{e.strength}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
