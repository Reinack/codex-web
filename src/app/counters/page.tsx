"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useT } from "@/lib/i18n/I18nProvider";
import { useQuery } from "@tanstack/react-query";
import { fetchCounterGraph, fetchCivUnits } from "@/lib/api/counters-client";
import { fetchCivsClient } from "@/lib/api/explore-client";
import { CounterGraph } from "@/components/CounterGraph";
import { unitIconUrl } from "@/lib/tree/assets";
import { civEmblemUrl } from "@/lib/img";
import { UNIT_CATALOG, BUILDINGS, KIND_LABEL, type CatalogUnit } from "@/lib/counters/units";
import type {
  CyNodeData,
  CivUnits as CivUnitsData,
  CounterGraph as CounterGraphData,
} from "@/lib/api/schema";

const MAX_CIVS = 8;

export default function CountersPage() {
  const t = useT();
  const [unit, setUnit] = useState("knight-line");
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<CyNodeData | null>(null);
  const [civSlugs, setCivSlugs] = useState<string[]>([]);

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
    const out: { title: string; treeId?: string | null }[] = [];
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

  // Filtra el grafo por las civs elegidas: oculta las únicas que ninguna construye.
  const filteredGraph = useMemo<CounterGraphData | undefined>(() => {
    const data = graphQ.data;
    if (!data || !buildable) return data;
    const kindOf = (id?: unknown) => UNIT_CATALOG.find((u) => u.id === id)?.kind;
    const nodes = data.nodes.filter(
      (n) =>
        n.data.type === "center" ||
        kindOf(n.data.uid) !== "unique" ||
        (n.data.uid != null && buildable.has(String(n.data.uid))),
    );
    const keep = new Set(nodes.map((n) => n.data.id));
    const edges = data.edges.filter(
      (e) => keep.has(String(e.data.source)) && keep.has(String(e.data.target)),
    );
    return { ...data, nodes, edges };
  }, [graphQ.data, buildable]);

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
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
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
          <form onSubmit={submit} className="flex flex-1 items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("counters.searchPlaceholder")}
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button
              type="submit"
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600"
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
                className="rounded-full border border-violet-400/50 bg-violet-500/10 px-3 py-1 text-xs text-violet-700 transition-colors hover:bg-violet-500/20 dark:text-violet-300"
              >
                {uu.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="relative">
          {graphQ.isFetching && (
            <span className="absolute right-3 top-3 z-10 rounded-full bg-zinc-900/80 px-2 py-1 text-xs text-white">
              cargando…
            </span>
          )}
          {graphQ.isError ? (
            <div className="flex h-[480px] items-center justify-center rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-600 dark:border-rose-900 dark:bg-rose-950/40">
              {graphQ.error instanceof Error ? graphQ.error.message : "No se encontró la unidad."}
            </div>
          ) : buildable && filteredGraph?.unitId && !buildable.has(filteredGraph.unitId) ? (
            <div className="flex h-[480px] items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
              Ninguna de tus civs ({civFilterName}) puede construir{" "}
              <b className="mx-1">{filteredGraph.heading}</b>. Elegí otra unidad o agregá la civ.
            </div>
          ) : filteredGraph ? (
            <CounterGraph graph={filteredGraph} onSelect={setSelected} />
          ) : (
            <div className="h-[480px] animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
          )}
        </div>

        <aside className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          {selected ? (
            <SelectedPanel data={selected} />
          ) : (
            <>
              <h2 className="font-medium">{graphQ.data?.heading ?? "—"}</h2>
              <p className="text-zinc-500">{t("counters.clickNode")}</p>
              {graphQ.data?.notes?.map((n, i) => (
                <p key={i} className="text-xs text-zinc-500">
                  {n}
                </p>
              ))}
            </>
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
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
      {BUILDINGS.map(({ key, label }) => {
        const units = UNIT_CATALOG.filter((u) => u.building === key);
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
  onClick,
}: {
  unit: CatalogUnit;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const src = unitIconUrl(unit.imgKey);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? `No construible — ${unit.label}` : `${unit.label} (${KIND_LABEL[unit.kind]})`}
      className={`flex w-[68px] flex-col items-center gap-1 rounded-lg border px-1 py-1.5 text-center transition-all ${
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
      <span className="w-full truncate text-[10px] text-zinc-600 dark:text-zinc-400">{unit.label}</span>
    </button>
  );
}

function SelectedPanel({ data }: { data: CyNodeData }) {
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
            <dd className="font-medium">{data.context}</dd>
          </div>
        ) : null}
      </dl>
      {typeof data.nota === "string" && data.nota ? (
        <p className="rounded-lg bg-zinc-100 p-2 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {data.nota}
        </p>
      ) : null}
    </div>
  );
}
