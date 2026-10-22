"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useT } from "@/lib/i18n/I18nProvider";
import { useQuery } from "@tanstack/react-query";
import { fetchCounterGraph, fetchCivUnits } from "@/lib/api/counters-client";
import { fetchCivsClient } from "@/lib/api/explore-client";
import { CounterGraph } from "@/components/CounterGraph";
import { treeIconUrl, unitIconUrl } from "@/lib/tree/assets";
import { civEmblemUrl } from "@/lib/img";
import { UNIT_CATALOG, BUILDINGS, KIND_LABEL, isShownUnit, type CatalogUnit } from "@/lib/counters/units";
import { AGES, arrivesAfter, countByType, filterByAge, isAge, type Age } from "@/lib/counters/age";
import type {
  CyNodeData,
  CivUnits as CivUnitsData,
  CounterGraph as CounterGraphData,
} from "@/lib/api/schema";

const MAX_CIVS = 8;

// El chat responde en español: las preguntas que se le mandan van en español.
const AGE_NAME_ES: Record<Age, string> = {
  feudal: "Edad Feudal",
  castle: "Edad de los Castillos",
  imperial: "Edad Imperial",
};

// La página lee unidad, civs y edad de la URL (useSearchParams): Suspense deja
// prerenderizar el resto y la renderiza en el cliente.
export default function CountersPage() {
  return (
    <Suspense fallback={<div className="h-72 animate-pulse border border-[var(--rule)] bg-[rgba(255,248,228,0.3)]" />}>
      <Counters />
    </Suspense>
  );
}

function Counters() {
  const t = useT();
  const params = useSearchParams();
  const pathname = usePathname();
  const [unit, setUnit] = useState(() => params.get("unit") || "knight-line");
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<CyNodeData | null>(null);
  const [civSlugs, setCivSlugs] = useState<string[]>(() =>
    (params.get("civs") ?? "").split(",").filter(Boolean).slice(0, MAX_CIVS),
  );
  const [age, setAge] = useState<Age | null>(() => {
    const a = params.get("age");
    return isAge(a) ? a : null;
  });

  // Link compartible: la URL siempre refleja unidad, civs y edad.
  useEffect(() => {
    const qs = new URLSearchParams({ unit });
    if (civSlugs.length) qs.set("civs", civSlugs.join(","));
    if (age) qs.set("age", age);
    if (window.location.search !== `?${qs}`) window.history.replaceState(null, "", `${pathname}?${qs}`);
  }, [unit, civSlugs, age, pathname]);
  // Celular: lista legible por defecto; el grafo radial queda como opción.
  const [view, setView] = useState<"list" | "graph">("list");

  const civsQ = useQuery({ queryKey: ["civs"], queryFn: fetchCivsClient });

  // Datos de unidades por civ seleccionada (una query por civ, cacheadas).
  const civUnitsQ = useQuery({
    queryKey: ["civ-units", civSlugs],
    queryFn: async () => Promise.all(civSlugs.map((s) => fetchCivUnits(s))),
    enabled: civSlugs.length > 0,
  });
  const selectedCivs: CivUnitsData[] = civUnitsQ.data ?? [];

  // Filtro de construibilidad: unión de líneas + UUs (por uuName) de las civs.
  const buildable = useMemo(() => {
    if (selectedCivs.length === 0) return null; // null = sin filtro (todas)
    const ids = new Set<string>();
    const uuTitles = new Set(
      selectedCivs.flatMap((c) => c.uniqueUnits.map((u) => u.title.toLowerCase())),
    );
    for (const c of selectedCivs) for (const line of c.units) ids.add(line);
    // Une las UU del catálogo cuyo uuName posee alguna civ elegida.
    for (const u of UNIT_CATALOG) {
      if (u.uuName && uuTitles.has(u.uuName.toLowerCase())) ids.add(u.id);
    }
    return ids;
  }, [selectedCivs]);

  const civFilterName = selectedCivs.map((c) => c.civ).join(", ");

  // UUs dinámicas de las civs elegidas que NO están en el catálogo estático →
  // botones extra para buscar sus counters (contempla las unidades únicas).
  const dynamicUUs = useMemo(() => {
    const staticNames = new Set(
      UNIT_CATALOG.filter((u) => u.uuName).map((u) => u.uuName!.toLowerCase()),
    );
    const seen = new Set<string>();
    const out: { title: string; treeId?: string | null; imgPath?: unknown }[] = [];
    for (const c of selectedCivs)
      for (const uu of c.uniqueUnits) {
        const k = uu.title.toLowerCase();
        if (!staticNames.has(k) && !seen.has(k)) {
          seen.add(k);
          out.push(uu);
        }
      }
    return out;
  }, [selectedCivs]);

  const graphQ = useQuery({
    queryKey: ["counters", unit],
    queryFn: () => fetchCounterGraph(unit),
  });

  // Filtra el grafo por las civs elegidas (únicas y regionales solo si alguna
  // las construye) y por la edad (lo que todavía no existe y el contexto early/late).
  const filteredGraph = useMemo<CounterGraphData | undefined>(() => {
    const data = graphQ.data;
    if (!data) return data;
    const nodes = data.nodes.filter((n) => n.data.type === "center" || isShownUnit(n.data.uid, buildable));
    const keep = new Set(nodes.map((n) => n.data.id));
    const edges = data.edges.filter(
      (e) => keep.has(String(e.data.source)) && keep.has(String(e.data.target)),
    );
    return filterByAge({ ...data, nodes, edges }, age);
  }, [graphQ.data, buildable, age]);

  const heading = graphQ.data?.heading ?? "";
  // La unidad buscada es única o regional y ninguna civ elegida la construye.
  const uuCivs = graphQ.data?.uuCivs ?? [];
  const hiddenCenter = !graphQ.data
    ? null
    : uuCivs.length && !uuCivs.some((c) => selectedCivs.some((s) => s.civ === c))
      ? t("counters.needUuCiv").replace("{unit}", heading).replace("{civs}", uuCivs.join(", "))
      : graphQ.data.unitId && !isShownUnit(graphQ.data.unitId, buildable)
        ? t("counters.needCiv")
            .replace("{unit}", heading)
            .replace("{kind}", t(`counters.kind.${UNIT_CATALOG.find((u) => u.id === graphQ.data?.unitId)?.kind}`))
        : null;
  const centerAge = graphQ.data?.nodes.find((n) => n.data.type === "center")?.data.age;
  const notYet =
    age && arrivesAfter(centerAge, age)
      ? t("counters.notYet")
          .replace("{unit}", heading)
          .replace("{from}", t(`counters.ageName.${centerAge}`))
          .replace("{age}", t(`counters.ageName.${age}`))
      : null;
  // Contexto que viaja al chat: edad y civs elegidas.
  const askSuffix =
    (age ? ` en la ${AGE_NAME_ES[age]}` : "") +
    (selectedCivs.length ? ` jugando con ${selectedCivs.map((c) => c.civ).join(", ")}` : "");

  const search = (id: string) => {
    setUnit(id);
    setSelected(null);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (q) search(q);
  };

  const addCiv = (slug: string) => {
    if (!slug || civSlugs.includes(slug) || civSlugs.length >= MAX_CIVS) return;
    setCivSlugs((prev) => [...prev, slug]);
  };
  const removeCiv = (slug: string) => setCivSlugs((prev) => prev.filter((s) => s !== slug));

  const civList = civsQ.data ?? [];
  const slugOf = (name: string) => civList.find((c) => c.title === name)?.slug ?? "";

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("counters.title")}</h1>
        <p className="text-sm text-zinc-500">{t("counters.subtitle")}</p>
      </header>

      {/* Civilizaciones + búsqueda libre */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value=""
            onChange={(e) => {
              addCiv(slugOf(e.target.value));
              e.target.value = "";
            }}
            disabled={civSlugs.length >= MAX_CIVS}
            className="field field-select disabled:opacity-50"
          >
            <option value="">{t("counters.addCiv")}</option>
            {civList
              .filter((c) => !civSlugs.includes(c.slug))
              .map((c) => (
                <option key={c.slug} value={c.title}>
                  {c.title}
                </option>
              ))}
          </select>
          <select
            value={age ?? ""}
            onChange={(e) => setAge(isAge(e.target.value) ? e.target.value : null)}
            title={t("counters.ageTitle")}
            className="field field-select"
          >
            <option value="">{t("counters.allAges")}</option>
            {AGES.map((a) => (
              <option key={a} value={a}>
                {t(`counters.age.${a}`)}
              </option>
            ))}
          </select>
          <form onSubmit={submit} className="flex flex-1 items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("counters.searchPlaceholder")}
              className="field flex-1"
            />
            <button
              type="submit"
              className="aoe-btn"
            >
              {t("common.search")}
            </button>
          </form>
        </div>

        {selectedCivs.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {selectedCivs.map((c) => (
              <span
                key={c.slug}
                className="flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-300"
              >
                <Image src={civEmblemUrl(c.slug)} alt="" width={16} height={16} unoptimized className="h-4 w-4 object-contain" />
                {c.civ}
                <button onClick={() => removeCiv(c.slug)} className="ml-0.5 opacity-60 hover:opacity-100">
                  ✕
                </button>
              </span>
            ))}
            <span className="text-xs text-zinc-400">
              filtrando por lo construible ({selectedCivs.length}/{MAX_CIVS})
            </span>
          </div>
        )}
      </div>

      {/* xl+: grilla de unidades | grafo | detalle, todo a la vista sin scrollear.
          Más angosto: apilado como antes. */}
      <div className="grid gap-4 xl:grid-cols-[minmax(280px,340px)_1fr_320px] 2xl:grid-cols-[minmax(300px,360px)_1fr_400px]">
        <div className="flex min-w-0 flex-col gap-3 xl:max-h-[max(520px,calc(100vh-320px))] xl:overflow-y-auto xl:pr-1">
        {/* Grilla de unidades por edificio */}
        <UnitGrid current={unit} buildable={buildable} onPick={search} />

        {/* UUs dinámicas de las civs elegidas */}
        {dynamicUUs.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {t("counters.uuOfYourCivs")}
            </span>
            <div className="flex flex-wrap gap-2">
              {dynamicUUs.map((uu) => (
                <button
                  key={uu.title}
                  onClick={() => search(uu.title)}
                  className="flex items-center gap-1.5 rounded-full border border-violet-400/50 bg-violet-500/10 py-1 pl-1.5 pr-3 text-xs text-violet-700 transition-colors hover:bg-violet-500/20 dark:text-violet-300"
                >
                  {typeof uu.imgPath === "string" && uu.imgPath ? (
                    <Image src={treeIconUrl(uu.imgPath)} alt="" width={20} height={20} unoptimized className="h-5 w-5 object-contain" />
                  ) : null}
                  {uu.title}
                </button>
              ))}
            </div>
          </div>
        )}
        </div>
        <div className="flex min-w-0 flex-col gap-3">
        <div className="flex border border-[var(--rule)] font-display text-[12px] font-bold tracking-[0.04em] md:hidden">
          {(["list", "graph"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`flex-1 py-2 ${view === v ? "bg-[var(--red-500)] text-[#f3e6c8]" : ""}`}
            >
              {v === "list" ? t("counters.viewList") : t("counters.viewGraph")}
            </button>
          ))}
        </div>
        {filteredGraph && !notYet && !hiddenCenter && <Legend counts={countByType(filteredGraph)} />}
        {view === "list" && (hiddenCenter || notYet) && (
          <p className="surface p-3 text-sm italic text-zinc-500 md:hidden">
            {hiddenCenter ? `🚫 ${hiddenCenter}` : `⏳ ${notYet}`}
          </p>
        )}
        {view === "list" && filteredGraph && !notYet && !hiddenCenter && (
          <CounterList graph={filteredGraph} onPick={search} />
        )}
        <div className={`relative ${view === "list" ? "hidden md:block" : ""}`}>
          {graphQ.isFetching && (
            <span className="absolute right-3 top-3 z-10 rounded-full bg-zinc-900/80 px-2 py-1 text-xs text-white">
              cargando…
            </span>
          )}
          {graphQ.isError ? (
            (graphQ.error as { status?: number }).status === 404 ? (
              <div className="flex h-[480px] items-center justify-center border border-zinc-200 bg-zinc-50 p-6 text-center text-sm italic text-zinc-500">
                {graphQ.error.message}
              </div>
            ) : (
              <div className="flex h-[480px] items-center justify-center rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-600 dark:border-rose-900 dark:bg-rose-950/40">
                {graphQ.error instanceof Error ? graphQ.error.message : "No se encontró la unidad."}
              </div>
            )
          ) : buildable && filteredGraph?.unitId && !buildable.has(filteredGraph.unitId) ? (
            <div className="flex h-[480px] items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
              Ninguna de tus civs ({civFilterName}) puede construir{" "}
              <b className="mx-1">{filteredGraph.heading}</b>. Elegí otra unidad o agregá la civ.
            </div>
          ) : hiddenCenter ? (
            <div className="flex h-[480px] items-center justify-center border border-zinc-200 bg-zinc-50 p-6 text-center text-sm italic text-zinc-500">
              🚫 {hiddenCenter}
            </div>
          ) : notYet ? (
            <div className="flex h-[480px] items-center justify-center border border-zinc-200 bg-zinc-50 p-6 text-center text-sm italic text-zinc-500">
              ⏳ {notYet}
            </div>
          ) : filteredGraph ? (
            <CounterGraph graph={filteredGraph} onSelect={setSelected} />
          ) : (
            <div className="h-[480px] animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
          )}
        </div>
        </div>

        <aside className={`${view === "list" ? "hidden md:flex" : "flex"} flex-col gap-3 border border-[var(--rule)] p-4 text-sm text-[var(--papyrus-text)] shadow-[var(--burnt-edge)] [background:var(--papyrus)] xl:max-h-[max(520px,calc(100vh-320px))] xl:overflow-y-auto`}>
          {selected ? (
            <SelectedPanel data={selected} heading={heading} askSuffix={askSuffix} />
          ) : (
            <>
              <h2 className="font-medium">{heading || "—"}</h2>
              <p className="text-zinc-500">{t("counters.clickNode")}</p>
              {heading && (
                <AskLink q={`¿Qué counterea a ${heading}${askSuffix} y cómo lo respondo?`} />
              )}
              {graphQ.data?.notes?.map((n, i) => (
                <p key={i} className="text-xs text-zinc-500">
                  {n}
                </p>
              ))}
            </>
          )}
          {/* Pantallas anchas: todas las relaciones con su porqué, sin clickear nodo por nodo. */}
          {filteredGraph && !notYet && !hiddenCenter && (
            <div className="hidden border-t border-[var(--rule-soft)] pt-3 xl:block">
              <CounterList graph={filteredGraph} onPick={search} side />
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function UnitGrid({
  current,
  buildable,
  onPick,
}: {
  current: string;
  buildable: Set<string> | null;
  onPick: (id: string) => void;
}) {
  // Tablet y celular: una sola tira de íconos sin separar por edificio, solo con
  // lo que se puede usar (las civs elegidas o, sin civ, solo las genéricas: ni
  // regionales ni únicas). En celular es una fila con scroll horizontal.
  const compact = UNIT_CATALOG.filter((u) =>
    buildable ? buildable.has(u.id) : u.kind === "generic",
  );
  return (
    <>
    <div className="flex gap-1.5 overflow-x-auto rounded-xl border border-zinc-200 bg-white/60 p-2 md:flex-wrap md:overflow-visible xl:hidden dark:border-zinc-800 dark:bg-zinc-900/40">
      {compact.map((u) => (
        <UnitButton
          key={u.id}
          unit={u}
          active={current === u.id}
          disabled={false}
          compact
          onClick={() => onPick(u.id)}
        />
      ))}
    </div>
    <div className="hidden flex-col gap-3 rounded-xl border border-zinc-200 bg-white/60 p-3 xl:flex dark:border-zinc-800 dark:bg-zinc-900/40">
      {BUILDINGS.map(({ key, label }) => {
        const units = UNIT_CATALOG.filter((u) => u.building === key && isShownUnit(u.id, buildable));
        if (units.length === 0) return null;
        return (
          <div key={key} className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              {label}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {units.map((u) => (
                <UnitButton
                  key={u.id}
                  unit={u}
                  active={current === u.id}
                  disabled={!!buildable && !buildable.has(u.id)}
                  onClick={() => onPick(u.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
    </>
  );
}

const KIND_RING: Record<string, string> = {
  generic: "border-zinc-300 dark:border-zinc-700",
  regional: "border-sky-400/50",
  unique: "border-violet-400/60",
};

function UnitButton({
  unit,
  active,
  disabled,
  compact = false,
  onClick,
}: {
  unit: CatalogUnit;
  active: boolean;
  disabled: boolean;
  /** Solo ícono; el nombre aparece como globo al pasar el mouse o tocar. */
  compact?: boolean;
  onClick: () => void;
}) {
  const src = unitIconUrl(unit.imgKey);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? `No construible — ${unit.label}` : `${unit.label} (${KIND_LABEL[unit.kind]})`}
      className={`group relative flex ${compact ? "w-11 shrink-0" : "w-[68px]"} flex-col items-center gap-1 rounded-lg border px-1 py-1.5 text-center transition-all ${
        active
          ? "border-amber-400 bg-amber-500/15 ring-1 ring-amber-400"
          : KIND_RING[unit.kind]
      } ${disabled ? "cursor-not-allowed opacity-25 grayscale" : "hover:border-amber-400 hover:bg-amber-500/5"}`}
    >
      {src ? (
        <Image src={src} alt={unit.label} width={28} height={28} unoptimized className="h-7 w-7 object-contain" />
      ) : (
        <span className="text-base">⚔️</span>
      )}
      {compact ? (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 whitespace-nowrap bg-[#060402]/90 px-1.5 py-0.5 text-[11px] text-[#e4d4b0] group-hover:block group-focus-visible:block">
          {unit.label}
        </span>
      ) : (
        <span className="w-full truncate text-[10px] text-zinc-600 dark:text-zinc-400">{unit.label}</span>
      )}
    </button>
  );
}

// Vista de celular: los counters como lista agrupada por fuerza, con ícono,
// tier y la nota desplegable. Tocar una unidad del catálogo la busca.
const STRENGTH: { key: string; label: string; color: string }[] = [
  { key: "hard", label: "Fuerte", color: "#9b2b1a" },
  { key: "soft", label: "Media", color: "#83551d" },
  { key: "situational", label: "Situacional", color: "#6f5234" },
];

function CounterList({
  graph,
  onPick,
  side = false,
}: {
  graph: CounterGraphData;
  onPick: (id: string) => void;
  /** Versión compacta para la columna derecha en pantallas anchas. */
  side?: boolean;
}) {
  const t = useT();
  const center = graph.nodes.find((n) => n.data.type === "center")?.data;
  const others = graph.nodes.map((n) => n.data).filter((d) => d.type !== "center");
  const sections = [
    { title: t("counters.countersYou"), items: others.filter((d) => d.dir !== "beats"), good: false },
    { title: t("counters.youBeat"), items: others.filter((d) => d.dir === "beats"), good: true },
  ];
  const inCatalog = (uid: unknown) =>
    typeof uid === "string" && UNIT_CATALOG.some((u) => u.id === uid) ? uid : null;

  return (
    <div className={side ? "flex flex-col gap-3" : "flex flex-col gap-4 md:hidden"}>
      {center && !side && (
        <div className="surface flex items-center gap-3 p-3">
          {center.img ? (
            <Image src={center.img} alt="" width={44} height={44} unoptimized className="h-11 w-11 border-2 border-[var(--gold)] object-contain" />
          ) : null}
          <h2 className="font-display text-base font-bold leading-tight">{graph.heading}</h2>
        </div>
      )}
      {sections.map(({ title, items, good }) =>
        items.length === 0 ? null : (
          <section key={title} className="flex flex-col gap-2">
            <h3 className={`font-display text-[13px] font-bold uppercase tracking-[0.06em] ${good ? "text-[#3d6b17]" : "text-[var(--red-500)]"}`}>
              {title} ({items.length})
            </h3>
            {STRENGTH.map(({ key, label, color }) => {
              const list = items.filter((d) => (d.type || "").replace("beats-", "") === key);
              if (list.length === 0) return null;
              return (
                <ul
                  key={key}
                  className={side ? "flex flex-col gap-1.5" : "surface flex flex-col divide-y divide-[var(--rule-soft)]"}
                >
                  <li className={`${side ? "px-1" : "px-3"} py-1 text-[11px] font-semibold uppercase tracking-wide`} style={{ color }}>
                    {label}
                  </li>
                  {list.map((d) => {
                    const target = inCatalog(d.uid);
                    const name = (typeof d.full === "string" && d.full) || d.label || d.id;
                    return (
                      <li
                        key={d.id}
                        className={side ? "border border-[var(--rule-soft)] px-2.5 py-2 [background:var(--papyrus-light)]" : "px-3 py-2"}
                      >
                        <div className="flex items-center gap-3">
                          {d.img ? (
                            <Image src={d.img} alt="" width={36} height={36} unoptimized className={`${side ? "h-7 w-7" : "h-9 w-9"} shrink-0 object-contain`} style={{ border: `2px solid ${color}` }} />
                          ) : (
                            <span className={`${side ? "h-7 w-7" : "h-9 w-9"} shrink-0`} style={{ background: color }} />
                          )}
                          {target ? (
                            <button onClick={() => onPick(target)} className="flex-1 text-left text-sm font-semibold underline decoration-[var(--gold)] underline-offset-2">
                              {name}
                            </button>
                          ) : (
                            <span className="flex-1 text-sm font-semibold">{name}</span>
                          )}
                          {d.tier ? (
                            <span className="shrink-0 text-[10px] uppercase text-zinc-500">
                              {d.tier}
                              {d.context && d.context !== "general" ? ` · ${t(`counters.ctx.${d.context}`)}` : ""}
                            </span>
                          ) : null}
                        </div>
                        {typeof d.nota === "string" && d.nota && d.nota !== "—" ? (
                          <p className={`mt-1 ${side ? "pl-10" : "pl-12"} text-xs leading-relaxed text-zinc-600`}>{d.nota}</p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              );
            })}
          </section>
        ),
      )}
    </div>
  );
}

// Leyenda armada con lo que hay en el grafo actual: sin categorías vacías.
const LEGEND: { type: string; color: string; key: string }[] = [
  { type: "hard", color: "#9b2b1a", key: "counters.leg.hard" },
  { type: "soft", color: "#83551d", key: "counters.leg.soft" },
  { type: "situational", color: "#6f5234", key: "counters.leg.situational" },
  { type: "beats-hard", color: "#3d6b17", key: "counters.leg.hard" },
  { type: "beats-soft", color: "#53682a", key: "counters.leg.soft" },
  { type: "beats-situational", color: "#2a5d86", key: "counters.leg.situational" },
];

function Legend({ counts }: { counts: Record<string, number> }) {
  const t = useT();
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
      {([false, true] as const).map((beats) => {
        const items = LEGEND.filter((l) => l.type.startsWith("beats-") === beats && counts[l.type]);
        return (
          <div key={String(beats)} className="flex flex-wrap items-center gap-2">
            <span
              className={`font-display font-bold uppercase tracking-wide ${beats ? "text-[#3d6b17]" : "text-[var(--red-500)]"}`}
            >
              {t(beats ? "counters.youBeat" : "counters.countersYou")}
            </span>
            {items.length === 0 ? (
              <span className="text-zinc-500">—</span>
            ) : (
              items.map((l) => (
                <span key={l.type} className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
                  {t(l.key)} · {counts[l.type]}
                </span>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}

// Abre el chat con la pregunta ya escrita (no la manda: el usuario la ajusta).
function AskLink({ q }: { q: string }) {
  const t = useT();
  return (
    <Link href={`/chat?q=${encodeURIComponent(q)}`} className="aoe-btn text-center text-xs">
      {t("counters.askCodex")}
    </Link>
  );
}

function SelectedPanel({
  data,
  heading,
  askSuffix,
}: {
  data: CyNodeData;
  heading: string;
  askSuffix: string;
}) {
  const t = useT();
  const name = (typeof data.full === "string" && data.full) || data.label || data.id;
  const q =
    data.dir === "beats"
      ? `¿Por qué ${heading} le gana a ${name}${askSuffix}?`
      : `¿Por qué ${name} counterea a ${heading}${askSuffix}? ¿Cuántos necesito y con qué upgrades?`;
  const dirLabel =
    data.dir === "beats" ? "Le gana a" : data.dir === "counter" ? "La counterea" : null;
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">{data.label ?? data.id}</h2>
      {dirLabel && <span className="text-xs text-zinc-500">{dirLabel}</span>}
      <dl className="flex flex-col gap-1 text-xs">
        {data.tier ? (
          <div className="flex justify-between">
            <dt className="text-zinc-500">Fuerza</dt>
            <dd className="font-medium">{data.tier}</dd>
          </div>
        ) : null}
        {typeof data.weight === "number" ? (
          <div className="flex justify-between">
            <dt className="text-zinc-500">Peso</dt>
            <dd className="font-medium tabular-nums">{data.weight.toFixed(2)}</dd>
          </div>
        ) : null}
        {data.context ? (
          <div className="flex justify-between">
            <dt className="text-zinc-500">Contexto</dt>
            <dd className="font-medium">
              {data.context === "general" ? data.context : t(`counters.ctx.${data.context}`)}
            </dd>
          </div>
        ) : null}
      </dl>
      {typeof data.nota === "string" && data.nota ? (
        <p className="rounded-lg bg-zinc-100 p-2 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {data.nota}
        </p>
      ) : null}
      {data.type !== "center" && <AskLink q={q} />}
    </div>
  );
}
