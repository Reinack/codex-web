"use client";

import { useState, type CSSProperties } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { fetchCivsClient, fetchMatchup, fetchCivRadar } from "@/lib/api/explore-client";
import type {
  CounterEdge,
  PhosphorTier,
  MissingUnit,
  ExploitLine,
  Recipe,
  Composition,
  CivLine,
  DocumentedMatchupEntry,
} from "@/lib/api/schema";
import { civEmblemUrl } from "@/lib/img";
import { unitIconUrl } from "@/lib/tree/assets";
import { RadarChart } from "@/components/RadarChart";
import { PHASE_AXES, CATEGORY_AXES, RADAR_MAX, getCivRadarFallback } from "@/lib/radar/data";
import { buildRadarPlan } from "@/lib/radar/plan";
import { buildCivSignatureCombo, type CivCombo, type CivComboLine } from "@/lib/matchup/combo";
import { useT } from "@/lib/i18n/I18nProvider";

const ME_COLOR = "#f59e0b";
const VS_COLOR = "#0ea5e9";

function MatchupRadars({
  me,
  vs,
  meSlug,
  vsSlug,
}: {
  me: string;
  vs: string;
  meSlug: string;
  vsSlug: string;
}) {
  const meQ = useQuery({ queryKey: ["radar", me], queryFn: () => fetchCivRadar(me) });
  const vsQ = useQuery({ queryKey: ["radar", vs], queryFn: () => fetchCivRadar(vs) });
  const meR = meQ.data;
  const vsR = vsQ.data;
  if (!meR || !vsR) return null; // ambas civs deben tener datos de radar

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <RadarPanel title="Fase y mapa">
        <RadarChart
          axes={PHASE_AXES}
          max={RADAR_MAX}
          series={[
            { name: me, values: meR.phase, color: ME_COLOR },
            { name: vs, values: vsR.phase, color: VS_COLOR },
          ]}
        />
      </RadarPanel>
      <RadarPanel title="Categoría militar">
        <RadarChart
          axes={CATEGORY_AXES}
          max={RADAR_MAX}
          series={[
            { name: me, values: meR.category, color: ME_COLOR },
            { name: vs, values: vsR.category, color: VS_COLOR },
          ]}
        />
      </RadarPanel>
      <div className="lg:col-span-2">
        <Legend meSlug={meSlug} vsSlug={vsSlug} me={me} vs={vs} />
      </div>
    </div>
  );
}

function RadarPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel p-4">
      <h3 className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Legend({
  me,
  vs,
  meSlug,
  vsSlug,
}: {
  me: string;
  vs: string;
  meSlug: string;
  vsSlug: string;
}) {
  return (
    <div className="flex items-center justify-center gap-6 text-sm">
      <span className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ background: ME_COLOR }} />
        <Image src={civEmblemUrl(meSlug)} alt="" width={18} height={18} unoptimized className="h-[18px] w-[18px] object-contain" />
        <span className="font-medium">{me}</span>
      </span>
      <span className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ background: VS_COLOR }} />
        <Image src={civEmblemUrl(vsSlug)} alt="" width={18} height={18} unoptimized className="h-[18px] w-[18px] object-contain" />
        <span className="font-medium">{vs}</span>
      </span>
    </div>
  );
}

export default function MatchupsPage() {
  const t = useT();
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
    <main className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
          {t("matchups.eyebrow")}
        </span>
        <h1 className="text-3xl font-bold tracking-tight">{t("matchups.title")}</h1>
        <p className="max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
          {t("matchups.subtitle")}
        </p>
      </header>

      <form
        onSubmit={run}
        className="panel grid gap-3 p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
      >
        <CivSelect label={t("matchups.yourCiv")} value={me} onChange={setMe} options={civs} accent="me" />
        <CivSelect label={t("matchups.rival")} value={vs} onChange={setVs} options={civs} accent="vs" />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-500">{t("matchups.mapOptional")}</label>
          <input
            value={map}
            onChange={(e) => setMap(e.target.value)}
            placeholder="Arabia, Arena…"
            className="field"
          />
        </div>
        <button
          type="submit"
          disabled={!me || !vs || me === vs}
          className="rounded-lg bg-gradient-to-b from-amber-400 to-amber-500 px-5 py-2 text-sm font-semibold text-amber-950 shadow-sm transition-all hover:from-amber-300 hover:to-amber-400 hover:shadow disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("common.analyze")}
        </button>
      </form>
      {me && vs && me === vs && (
        <p className="-mt-4 text-xs text-rose-500">{t("matchups.distinct")}</p>
      )}

      {m.isFetching && (
        <div className="flex items-center gap-3 text-sm text-zinc-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          {t("matchups.analyzing")}
        </div>
      )}
      {m.isError && (
        <p className="rounded-lg border border-rose-300 bg-rose-500/5 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/40 dark:text-rose-400">
          {m.error instanceof Error ? m.error.message : "Error al analizar."}
        </p>
      )}

      {m.data && (
        <div className="flex flex-col gap-8">
          <VersusBanner
            me={m.data.me.title}
            meSlug={m.data.me.slug}
            vs={m.data.vs.title}
            vsSlug={m.data.vs.slug}
            map={submitted?.map}
          />

          <MatchupRadars
            me={m.data.me.title}
            vs={m.data.vs.title}
            meSlug={m.data.me.slug}
            vsSlug={m.data.vs.slug}
          />

          {(m.data.exploits?.composition || m.data.vsExploits?.composition) && (
            <Section title="Qué construir" hint="composición sugerida oro · trash · asedio">
              <div className="grid gap-4 lg:grid-cols-2">
                <CompositionCard
                  title={`Tu plan de unidades — ${m.data.me.title}`}
                  comp={m.data.exploits?.composition ?? null}
                  accent="me"
                  img={buildLineImg(m.data.lines?.me)}
                />
                <CompositionCard
                  title={`Composición probable — ${m.data.vs.title}`}
                  comp={m.data.vsExploits?.composition ?? null}
                  accent="vs"
                  img={buildLineImg(m.data.lines?.vs)}
                />
              </div>
            </Section>
          )}

          {(() => {
            const meCat = meRadarQ.data?.category ?? getCivRadarFallback(m.data.me.slug)?.category ?? null;
            const vsCat = vsRadarQ.data?.category ?? getCivRadarFallback(m.data.vs.slug)?.category ?? null;
            const meCombo = buildCivSignatureCombo(toCivLines(m.data.lines?.me), meCat, CATEGORY_AXES, {
              uu: m.data.kits.me.uniqueUnits[0]?.title,
              why: m.data.traits?.me.strengths[0],
            });
            const vsCombo = buildCivSignatureCombo(toCivLines(m.data.lines?.vs), vsCat, CATEGORY_AXES, {
              uu: m.data.kits.vs.uniqueUnits[0]?.title,
              why: m.data.traits?.vs.strengths[0],
            });
            if (!meCombo && !vsCombo) return null;
            return (
              <Section title="Combo insignia" hint="la composición que define a cada civ">
                <div className="grid gap-4 lg:grid-cols-2">
                  <CivComboCard title={`Tu combo — ${m.data.me.title}`} combo={meCombo} accent="me" />
                  <CivComboCard title={`Combo del rival — ${m.data.vs.title}`} combo={vsCombo} accent="vs" />
                </div>
              </Section>
            );
          })()}

          {m.data.exploits && m.data.exploits.lines.length > 0 && (
            <Section title="Tus líneas · dónde pegás y dónde te pegan" hint={`${m.data.me.title} vs ${m.data.vs.title}`}>
              <LinesBoard
                lines={m.data.exploits.lines}
                imgById={buildLineImg(m.data.lines?.me)}
              />
            </Section>
          )}

          {m.data.exploits && m.data.exploits.recipes.length > 0 && (
            <Section title="Combos recomendados" hint="recetas canónicas disponibles para tu civ">
              <RecipesGrid recipes={m.data.exploits.recipes} />
            </Section>
          )}

          {meBrief && (
            <Section title="Tu plan" hint={`Cómo jugar ${m.data.me.title}`}>
              <div className="grid gap-4 lg:grid-cols-2">
                <PlanCard title="A favor" bullets={meBrief.plan} tone="good" />
                <PlanCard title="A cuidar" bullets={meBrief.threats} tone="bad" />
              </div>
            </Section>
          )}

          <Section title="Lectura del rival y notas tácticas">
            <div className="grid gap-4 lg:grid-cols-2">
              <PlanCard
                title={`Plan probable — ${m.data.vs.title}`}
                bullets={vsBrief ? vsBrief.plan : m.data.planVs}
                tone="neutral"
              />
              <TacticalNotesCard
                title={`Notas tácticas — ${m.data.me.title}`}
                plan={m.data.plan}
                weaknesses={m.data.traits?.me.weaknesses ?? []}
                missing={m.data.missing?.me ?? []}
              />
            </div>
          </Section>

          {(m.data.counterPlay?.me?.length || m.data.counterPlay?.vs?.length) ? (
            <Section
              title="Counter-play autoral"
              hint="bullets invertidos desde la ficha de cada civ en el vault"
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <CounterPlayCard
                  title={`Cómo ganarle a ${m.data.vs.title}`}
                  bullets={m.data.counterPlay?.vs ?? []}
                  accent="vs"
                />
                <CounterPlayCard
                  title={`Así te explota el rival a ${m.data.me.title}`}
                  bullets={m.data.counterPlay?.me ?? []}
                  accent="me"
                />
              </div>
            </Section>
          ) : null}

          {(m.data.documentedMatchups?.me?.length || m.data.documentedMatchups?.vs?.length) ? (
            <Section
              title="Matchups documentados de este cruce"
              hint="partidas reales/análisis citados en el vault, uno por perspectiva"
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <DocumentedMatchupColumn
                  title={`Según ${m.data.me.title}`}
                  entries={m.data.documentedMatchups?.me ?? []}
                />
                <DocumentedMatchupColumn
                  title={`Según ${m.data.vs.title}`}
                  entries={m.data.documentedMatchups?.vs ?? []}
                />
              </div>
            </Section>
          ) : null}

          {m.data.phosphorRush &&
            (m.data.phosphorRush.me || m.data.phosphorRush.vs) && (
              <Section title="Phosphor Rush · FC Arabia" hint="tier list Red Fosforu">
                <div className="grid gap-4 lg:grid-cols-2">
                  {m.data.phosphorRush.me && (
                    <PhosphorCard side="me" data={m.data.phosphorRush.me} />
                  )}
                  {m.data.phosphorRush.vs && (
                    <PhosphorCard side="vs" data={m.data.phosphorRush.vs} />
                  )}
                </div>
              </Section>
            )}

          <Section title="Counters">
            <div className="grid gap-4 lg:grid-cols-2">
              <CounterCard
                title="Tus counters"
                subtitle={`${m.data.me.title} le gana a ${m.data.vs.title}`}
                edges={m.data.counters.answers}
                tone="good"
                withIcons
                notes={(m.data.missing?.vs ?? []).map(
                  (x) => `${m.data.vs.title} no tiene ${x.unit}: ${x.opp}`,
                )}
              />
              <CounterCard
                title="Amenazas"
                subtitle={`${m.data.vs.title} te counterea`}
                edges={m.data.counters.threats}
                tone="bad"
                withIcons
                notes={(m.data.missing?.me ?? []).map((x) => x.self)}
              />
            </div>
          </Section>

          {m.data.sharedNotes.length > 0 && (
            <Section title="Notas que mencionan a ambas">
              <ul className="flex flex-col gap-2">
                {m.data.sharedNotes.map((n, i) => (
                  <li key={i} className="panel p-3 text-sm">
                    <div className="text-xs text-zinc-500">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">{n.note}</span>
                      {n.heading ? ` · ${n.heading}` : ""}
                    </div>
                    {n.excerpt && (
                      <p className="mt-1 line-clamp-3 text-zinc-600 dark:text-zinc-400">{n.excerpt}</p>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </main>
  );
}

function VersusBanner({
  me,
  meSlug,
  vs,
  vsSlug,
  map,
}: {
  me: string;
  meSlug: string;
  vs: string;
  vsSlug: string;
  map?: string;
}) {
  return (
    <div className="panel flex items-center justify-center gap-4 p-5 sm:gap-8">
      <CivBadge title={me} slug={meSlug} color={ME_COLOR} align="end" />
      <div className="flex flex-col items-center">
        <span className="text-lg font-black tracking-widest text-zinc-400 dark:text-zinc-600">VS</span>
        {map && (
          <span className="mt-1 rounded-full bg-zinc-500/10 px-2 py-0.5 text-[11px] text-zinc-500">
            {map}
          </span>
        )}
      </div>
      <CivBadge title={vs} slug={vsSlug} color={VS_COLOR} align="start" />
    </div>
  );
}

function CivBadge({
  title,
  slug,
  color,
  align,
}: {
  title: string;
  slug: string;
  color: string;
  align: "start" | "end";
}) {
  return (
    <div className={`flex flex-1 items-center gap-3 ${align === "end" ? "flex-row-reverse text-right" : ""}`}>
      <span
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full ring-2"
        style={{ ["--tw-ring-color" as string]: color, background: `color-mix(in oklab, ${color} 12%, transparent)` }}
      >
        <Image
          src={civEmblemUrl(slug)}
          alt={`Emblema de ${title}`}
          width={40}
          height={40}
          unoptimized
          className="h-10 w-10 object-contain"
        />
      </span>
      <span className="text-lg font-bold sm:text-xl">{title}</span>
    </div>
  );
}

const PHOSPHOR_TIER_COLOR: Record<string, string> = {
  S: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  A: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  B: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  C: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  D: "bg-zinc-500/15 text-zinc-500",
};

// Una tarjeta de Phosphor Rush por civ: "me" en clave oportunidad, "vs" en clave
// amenaza. El titular varía según el lado y la fuerza del FC de esa civ.
function PhosphorCard({ side, data }: { side: "me" | "vs"; data: PhosphorTier }) {
  const strong = data.strength === "fuerte";
  const frame = strong
    ? side === "vs"
      ? "border-rose-400/50 bg-rose-500/5"
      : "border-amber-400/50 bg-amber-500/5"
    : "border-zinc-300/60 bg-zinc-500/5 dark:border-zinc-700/60";

  const sideLabel = side === "me" ? "Tu civ" : "Rival";
  const ref = `${data.civ} (${data.tier}-tier${data.uu ? `, ${data.uu}` : ""})`;
  let headline: string;
  if (data.defensive) {
    headline =
      side === "vs"
        ? `${data.civ} no empuja con FC: escala en defensa (Castle drop + boom), no esperes un all-in temprano.`
        : `Con ${data.civ} no empujás con FC: tu fuerte es defender y boomear.`;
  } else if (strong) {
    headline =
      side === "vs"
        ? `Ojo: ${ref} puede abrir con un Phosphor Rush fuerte. Preparate para defender el Fast Castle.`
        : `Tenés un Phosphor Rush fuerte con ${ref}: buen all-in de FC en Arabia.`;
  } else if (data.strength === "viable") {
    headline =
      side === "vs"
        ? `${data.civ} puede intentar un FC, pero no es su punto fuerte.`
        : `Phosphor Rush viable con ${data.civ}, aunque no es tu mejor plan.`;
  } else {
    headline =
      side === "vs"
        ? `Difícil que ${data.civ} te haga un Phosphor Rush serio (${data.tier}-tier).`
        : `Phosphor Rush flojo con ${data.civ} (${data.tier}-tier): mejor otro plan.`;
  }

  const strengthColor =
    data.strength === "fuerte"
      ? "text-amber-600 dark:text-amber-400"
      : data.strength === "viable"
        ? "text-emerald-600 dark:text-emerald-400"
        : data.strength === "defensivo"
          ? "text-sky-600 dark:text-sky-400"
          : "text-zinc-500";

  return (
    <section className={`flex flex-col gap-3 rounded-xl border p-4 ${frame}`}>
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold ${PHOSPHOR_TIER_COLOR[data.tier] ?? "bg-zinc-500/15 text-zinc-500"}`}
        >
          {data.tier}
        </span>
        <span className="font-semibold">{data.civ}</span>
        <span className="text-xs uppercase tracking-wide text-zinc-400">{sideLabel}</span>
        <span className={`ml-auto text-xs font-semibold capitalize ${strengthColor}`}>
          {data.strength}
        </span>
      </div>
      <p className="text-sm text-zinc-700 dark:text-zinc-200">{headline}</p>
    </section>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
          {title}
        </h2>
        {hint && <span className="text-xs text-zinc-400">· {hint}</span>}
      </div>
      {children}
    </section>
  );
}

function CivSelect({
  label,
  value,
  onChange,
  options,
  accent,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { title: string }[];
  accent?: "me" | "vs";
}) {
  const t = useT();
  // El campo "vs" reusa el mismo utility `field`, pero con las variables de
  // acento (borde/anillo de foco) recoloreadas a celeste vía CSS var scoping
  // — evita pelear con la especificidad de Tailwind por un color puntual.
  const vsVars = { "--accent-soft": "#38bdf8", "--ring": "rgba(56,189,248,0.25)" } as CSSProperties;
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-zinc-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={accent === "vs" ? vsVars : undefined}
        className="field field-select"
      >
        <option value="">{t("matchups.choose")}</option>
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
  tone,
}: {
  title: string;
  bullets: string[];
  tone: "good" | "bad" | "accent" | "neutral";
}) {
  const styles = {
    good: { bar: "bg-emerald-500", ring: "border-emerald-500/30", dot: "text-emerald-500" },
    bad: { bar: "bg-rose-500", ring: "border-rose-500/30", dot: "text-rose-500" },
    accent: { bar: "bg-amber-500", ring: "border-amber-500/30", dot: "text-amber-500" },
    neutral: { bar: "bg-sky-500", ring: "border-sky-500/30", dot: "text-sky-500" },
  }[tone];
  return (
    <section className={`relative overflow-hidden rounded-xl border ${styles.ring} bg-white/70 p-4 pl-5 dark:bg-zinc-900/50`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${styles.bar}`} />
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {bullets.length === 0 ? (
        <p className="text-sm text-zinc-400">Sin datos para este punto.</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2">
              <span className={`mt-0.5 shrink-0 ${styles.dot}`}>›</span>
              <span>{b}</span>
            </li>
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
  notes = [],
  withIcons = false,
}: {
  title: string;
  subtitle: string;
  edges: CounterEdge[];
  tone: "good" | "bad";
  notes?: string[];
  withIcons?: boolean;
}) {
  const dot = tone === "good" ? "bg-emerald-500" : "bg-rose-500";
  const noteTone =
    tone === "good"
      ? "text-emerald-700 dark:text-emerald-300"
      : "text-rose-700 dark:text-rose-300";
  return (
    <section className="panel flex flex-col gap-3 p-4">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
          {title}
        </h3>
        <p className="mt-0.5 pl-[18px] text-xs text-zinc-500">{subtitle}</p>
      </div>
      {edges.length === 0 ? (
        <p className="text-sm text-zinc-400">Sin counters relevantes.</p>
      ) : (
        <ul className="flex max-h-80 flex-col gap-1 overflow-auto pr-1 text-sm">
          {edges.slice(0, 12).map((e, i) => (
            <li
              key={i}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-500/5"
            >
              {withIcons && <UnitIcon imgKey={typeof e.fromImg === "string" ? e.fromImg : ""} label={e.from} />}
              <span className="font-medium text-zinc-700 dark:text-zinc-200">{e.from}</span>
              <span className="text-xs text-zinc-400">vs</span>
              {withIcons && <UnitIcon imgKey={typeof e.targetImg === "string" ? e.targetImg : ""} label={e.target} />}
              <span className="text-zinc-500">{e.target}</span>
              {e.strength && (
                <span className="ml-auto shrink-0 rounded-full bg-zinc-500/10 px-2 py-0.5 text-[11px] text-zinc-500">
                  {e.strength}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {notes.length > 0 && (
        <ul className="flex flex-col gap-1.5 border-t border-zinc-200 pt-2 text-xs dark:border-zinc-800">
          {notes.map((n, i) => (
            <li key={i} className={`flex gap-1.5 ${noteTone}`}>
              <span className="shrink-0">›</span>
              <span>{n}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Notas tácticas + debilidades + unidades faltantes de la civ propia.
function TacticalNotesCard({
  title,
  plan,
  weaknesses,
  missing,
}: {
  title: string;
  plan: string[];
  weaknesses: string[];
  missing: MissingUnit[];
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-white/70 p-4 pl-5 dark:bg-zinc-900/50">
      <span className="absolute inset-y-0 left-0 w-1 bg-amber-500" />
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {plan.length === 0 && weaknesses.length === 0 && missing.length === 0 ? (
        <p className="text-sm text-zinc-400">Sin notas para este cruce.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {plan.length > 0 && (
            <ul className="flex flex-col gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              {plan.map((b, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-0.5 shrink-0 text-amber-500">›</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
          {(missing.length > 0 || weaknesses.length > 0) && (
            <div className="flex flex-col gap-1.5 border-t border-zinc-200 pt-2 dark:border-zinc-800">
              <span className="text-xs font-medium uppercase tracking-wide text-rose-500">
                Huecos y unidades faltantes
              </span>
              <ul className="flex flex-col gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                {missing.map((mu, i) => (
                  <li key={`m${i}`} className="flex gap-1.5">
                    <span className="shrink-0 text-rose-500">▾</span>
                    <span>
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{mu.unit}:</span>{" "}
                      {mu.self.replace(/^sin [^:]+:\s*/i, "")}
                    </span>
                  </li>
                ))}
                {weaknesses.map((w, i) => (
                  <li key={`w${i}`} className="flex gap-1.5">
                    <span className="shrink-0 text-zinc-400">·</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// Bullets de "Cómo jugar CONTRA X" (vault) para una civ: mecánica propia ya
// invertida en consejo de counter-play para quien juega en su contra.
function CounterPlayCard({
  title,
  bullets,
  accent,
}: {
  title: string;
  bullets: string[];
  accent: "me" | "vs";
}) {
  const ring = accent === "me" ? "border-amber-500/30" : "border-sky-500/30";
  const bar = accent === "me" ? "bg-amber-500" : "bg-sky-500";
  const dot = accent === "me" ? "text-amber-500" : "text-sky-500";
  return (
    <section className={`relative overflow-hidden rounded-xl border ${ring} bg-white/70 p-4 pl-5 dark:bg-zinc-900/50`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${bar}`} />
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {bullets.length === 0 ? (
        <p className="text-sm text-zinc-400">Sin notas de counter-play para esta civ todavía.</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2">
              <span className={`mt-0.5 shrink-0 ${dot}`}>›</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Columna de "En Matchups Documentados" (vault) para una civ: partidas reales o
// análisis teóricos citados contra el rival de este cruce, con su síntesis
// táctica propia y la regla general ("Recordar:") si la entrada la trae.
function DocumentedMatchupColumn({
  title,
  entries,
}: {
  title: string;
  entries: DocumentedMatchupEntry[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h3>
      {entries.length === 0 ? (
        <p className="panel p-3 text-sm text-zinc-400">Sin matchup documentado desde esta perspectiva.</p>
      ) : (
        entries.map((e, i) => (
          <div key={i} className="panel flex flex-col gap-2 p-4 text-sm">
            <span className="font-semibold text-zinc-800 dark:text-zinc-100">{e.heading}</span>
            {e.bullets.length > 0 && (
              <ul className="flex flex-col gap-1.5 text-zinc-600 dark:text-zinc-400">
                {e.bullets.map((b, j) => (
                  <li key={j} className="flex gap-1.5">
                    <span className="mt-0.5 shrink-0 text-zinc-400">›</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
            {e.recordar && (
              <p className="border-t border-zinc-200 pt-2 text-xs text-amber-700 dark:border-zinc-800 dark:text-amber-400">
                <span className="font-semibold">Recordar: </span>
                {e.recordar}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// Ícono de línea/unidad proxeado same-origin (via imgKey → /api/icon). Si no hay
// mapeo conocido para la clave, no dibuja nada (degradación limpia a solo texto).
function UnitIcon({ imgKey, label, size = 20 }: { imgKey?: string; label?: string; size?: number }) {
  const src = unitIconUrl(imgKey);
  if (!src) return null;
  return (
    <Image
      src={src}
      alt={label ?? ""}
      title={label}
      width={size}
      height={size}
      unoptimized
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  );
}

// Mapa de íconos por id Y por label — la composición referencia líneas por su
// label (texto) mientras que el tablero las referencia por id.
function buildLineImg(lines?: { id: string; label: string; imgKey?: string }[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const l of lines ?? []) {
    if (!l.imgKey) continue;
    map.set(l.id, l.imgKey);
    map.set(l.label, l.imgKey);
  }
  return map;
}

const ROLE_LABEL: Record<string, string> = {
  gold: "Oro",
  trash: "Trash",
  siege: "Asedio",
  support: "Apoyo",
};

const STATUS_META: Record<string, { label: string; chip: string; bar: string }> = {
  green: { label: "Explotable", chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" },
  yellow: { label: "Mixto", chip: "bg-amber-500/15 text-amber-600 dark:text-amber-400", bar: "bg-amber-500" },
  red: { label: "En riesgo", chip: "bg-rose-500/15 text-rose-600 dark:text-rose-400", bar: "bg-rose-500" },
};

// "Qué construir": composición de 3 unidades (oro + trash que cubre su riesgo +
// asedio). Espejo del bloque "Top Units" de la referencia, con los datos de
// exploits.composition que el backend ya calcula.
function CompositionCard({
  title,
  comp,
  accent,
  img,
}: {
  title: string;
  comp: Composition | null;
  accent: "me" | "vs";
  img?: Map<string, string>;
}) {
  const bar = accent === "me" ? "bg-amber-500" : "bg-sky-500";
  const ring = accent === "me" ? "border-amber-500/30" : "border-sky-500/30";
  const rows: { role: string; label: string; note?: string | null; bonus?: string[] }[] = [];
  if (comp?.gold) rows.push({ role: "gold", label: comp.gold, bonus: comp.goldBonus?.labels });
  if (comp?.trash)
    rows.push({
      role: "trash",
      label: comp.trash,
      note: comp.trashCovers ? `cubre el ${comp.trashCovers}` : null,
      bonus: comp.trashBonus?.labels,
    });
  if (comp?.siege) rows.push({ role: "siege", label: comp.siege });

  return (
    <section className={`relative overflow-hidden rounded-xl border ${ring} bg-white/70 p-4 pl-5 dark:bg-zinc-900/50`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${bar}`} />
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-400">Sin composición sugerida para este cruce.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center gap-3">
              <UnitIcon imgKey={img?.get(r.label)} label={r.label} size={28} />
              <div className="flex min-w-0 flex-col">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-zinc-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    {ROLE_LABEL[r.role] ?? r.role}
                  </span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-100">{r.label}</span>
                </div>
                {r.note && <span className="text-xs text-emerald-600 dark:text-emerald-400">{r.note}</span>}
                {r.bonus && r.bonus.length > 0 && (
                  <span className="text-xs text-amber-600 dark:text-amber-400">{r.bonus.join(" · ")}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Tablero de líneas propias con semáforo (verde/amarillo/rojo), huecos que el
// rival no contesta y riesgos que sí. Espejo del grid por categoría + tiers de
// fuerza de la referencia, usando exploits.lines.
function LinesBoard({ lines, imgById }: { lines: ExploitLine[]; imgById: Map<string, string> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {lines.map((l) => {
        const meta = STATUS_META[l.status ?? ""] ?? STATUS_META.yellow;
        return (
          <div key={l.id} className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white/70 p-3 pl-4 dark:border-zinc-800 dark:bg-zinc-900/50">
            <span className={`absolute inset-y-0 left-0 w-1 ${meta.bar}`} />
            <div className="flex items-center gap-2">
              <UnitIcon imgKey={imgById.get(l.id)} label={l.label} size={24} />
              <span className="font-semibold text-zinc-800 dark:text-zinc-100">{l.label}</span>
              {l.role && (
                <span className="rounded bg-zinc-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  {ROLE_LABEL[l.role] ?? l.role}
                </span>
              )}
              <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.chip}`}>
                {meta.label}
              </span>
            </div>
            {l.gaps.length > 0 && (
              <p className="mt-2 text-xs">
                <span className="font-medium text-emerald-600 dark:text-emerald-400">Explotás: </span>
                <span className="text-zinc-600 dark:text-zinc-400">
                  {l.gaps.slice(0, 4).map((g) => g.label).join(", ")}
                </span>
              </p>
            )}
            {l.risks.length > 0 && (
              <p className="mt-1 text-xs">
                <span className="font-medium text-rose-600 dark:text-rose-400">Cuidado: </span>
                <span className="text-zinc-600 dark:text-zinc-400">
                  {l.risks.slice(0, 4).map((r) => r.label).join(", ")}
                </span>
              </p>
            )}
            {l.gaps.length === 0 && l.risks.length === 0 && (
              <p className="mt-2 text-xs text-zinc-400">Sin counters curados en este cruce.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// lines.me/vs (schema CivLine) → líneas para el combo insignia (traen imgKey y
// las etiquetas de bonus de civ, que marcan qué es "signature").
function toCivLines(lines?: CivLine[]): CivComboLine[] {
  return (lines ?? []).map((l) => ({
    id: l.id,
    label: l.label,
    imgKey: l.imgKey,
    bonus: l.bonus?.labels,
  }));
}

// Combo insignia de la civ: categoría dominante + sus líneas clave (apertura →
// pico de poder), con bonus, unidad única e identidad. Espejo de la página
// /civilizations de la referencia (identidad estratégica + unidades signature).
function CivComboCard({
  title,
  combo,
  accent,
}: {
  title: string;
  combo: CivCombo | null;
  accent: "me" | "vs";
}) {
  const bar = accent === "me" ? "bg-amber-500" : "bg-sky-500";
  const ring = accent === "me" ? "border-amber-500/30" : "border-sky-500/30";

  if (!combo || combo.units.length === 0) {
    return (
      <section className={`relative overflow-hidden rounded-xl border ${ring} bg-white/70 p-4 pl-5 dark:bg-zinc-900/50`}>
        <span className={`absolute inset-y-0 left-0 w-1 ${bar}`} />
        <h3 className="mb-2 text-sm font-semibold">{title}</h3>
        <p className="text-sm text-zinc-400">Sin datos suficientes para el combo de esta civ.</p>
      </section>
    );
  }

  return (
    <section className={`relative overflow-hidden rounded-xl border ${ring} bg-white/70 p-4 pl-5 dark:bg-zinc-900/50`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${bar}`} />
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {combo.category && (
          <span className="rounded-full bg-zinc-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {combo.category}
          </span>
        )}
      </div>

      {/* Apertura → pico de poder */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
        {combo.units.map((u, i) => (
          <div key={u.id} className="flex items-center gap-2">
            {i > 0 && <span className="mr-1 text-lg font-bold text-zinc-300 dark:text-zinc-600">→</span>}
            <UnitIcon imgKey={u.imgKey} label={u.label} size={30} />
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-tight text-zinc-800 dark:text-zinc-100">{u.label}</span>
              {u.bonus && u.bonus.length > 0 && (
                <span className="text-xs leading-tight text-amber-600 dark:text-amber-400">{u.bonus.join(" · ")}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {(combo.uu || combo.why) && (
        <div className="mt-3 flex flex-col gap-1 border-t border-zinc-200 pt-2 dark:border-zinc-800">
          {combo.uu && (
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Unidad única:</span> {combo.uu}
            </p>
          )}
          {combo.why && <p className="text-xs text-zinc-500 dark:text-zinc-400">{combo.why}</p>}
        </div>
      )}
    </section>
  );
}

// Combos canónicos disponibles para la civ (military.md): nombre, edad, por qué,
// y bandera de riesgo si alguna pieza está en rojo para este cruce.
function RecipesGrid({ recipes }: { recipes: Recipe[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {recipes.map((r, i) => (
        <div key={i} className="panel flex flex-col gap-1.5 p-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-800 dark:text-zinc-100">{r.name}</span>
            {r.risky && (
              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                riesgoso
              </span>
            )}
          </div>
          {r.age && (
            <span className="w-fit rounded-full bg-zinc-500/10 px-2 py-0.5 text-[11px] text-zinc-500">{r.age}</span>
          )}
          {r.why && <p className="text-xs text-zinc-600 dark:text-zinc-400">{r.why}</p>}
        </div>
      ))}
    </div>
  );
}
