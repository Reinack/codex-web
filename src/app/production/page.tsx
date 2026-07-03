"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useT } from "@/lib/i18n/I18nProvider";
import { civEmblemUrl } from "@/lib/img";
import { fetchEcoCatalog, fetchProduction } from "@/lib/api/production-client";
import type { EcoCatalog, EcoItem, Production } from "@/lib/api/schema";

const RES_ORDER = ["food", "wood", "gold", "stone"] as const;
type Res = (typeof RES_ORDER)[number];
const AGES = ["dark", "feudal", "castle", "imperial"] as const;
const AGE_LABEL: Record<string, string> = {
  dark: "Oscura / Dark", feudal: "Feudal", castle: "Castillos / Castle", imperial: "Imperial",
};
const CAT_LABEL: Record<string, string> = {
  barracks: "Cuartel", archery: "Arquería", stable: "Establo", siege: "Asedio", dock: "Muelle",
  monastery: "Monasterio", castle: "Castillo", market: "Mercado", tc: "Town Center",
  economy: "Edificios · economía", military: "Edificios · militar",
  defense: "Edificios · defensa", special: "Edificios · especial",
};
const CAT_ORDER = ["barracks", "archery", "stable", "siege", "dock", "monastery", "castle",
  "market", "tc", "economy", "military", "defense", "special"];
const RES_BAR: Record<Res, string> = {
  food: "bg-emerald-500", wood: "bg-amber-700", gold: "bg-amber-400", stone: "bg-zinc-400",
};
const TECH_ORDER = ["doublebitaxe_m", "bowsaw_m", "twomansaw_m", "goldmining_m", "goldshaft_m",
  "stonemining_m", "stoneshaft_m", "wheelbarrow", "handcart", "fishing_lines", "gillnets"];

// Íconos same-origin vía el proxy /api/icon (unidades/edificios y recursos del árbol).
const iconUrl = (imgPath?: string | null) => (imgPath ? `/api/icon?p=${encodeURIComponent(imgPath)}` : "");
const resIconUrl = (r: Res) => `/api/icon?p=img/${r}.png`;

type Contributor = { source: string; count: number };
type Supply = {
  bySource: Partial<Record<Res, string>>;
  techs: string[];
  contributors: Contributor[];
  passive: { relics: number; tradeCarts: number; feitorias: number };
};

export default function ProductionPage() {
  const t = useT();
  const catalogQ = useQuery({ queryKey: ["eco-catalog"], queryFn: fetchEcoCatalog });
  const catalog = catalogQ.data;

  const [civ, setCiv] = useState("");
  const [age, setAge] = useState("feudal");
  const [items, setItems] = useState<Record<string, number>>({});
  const [supply, setSupply] = useState<Supply>({
    bySource: {}, techs: [], contributors: [], passive: { relics: 0, tradeCarts: 0, feitorias: 0 },
  });

  const request = useMemo(
    () => ({
      items: Object.entries(items).map(([id, lines]) => ({ id, lines })),
      age, civ: civ || null, techs: [] as string[], supply,
    }),
    [items, age, civ, supply],
  );

  const prodQ = useQuery({
    queryKey: ["production", request],
    queryFn: () => fetchProduction(request),
    enabled: request.items.length > 0,
  });

  if (!catalog) {
    return (
      <main className="flex flex-col gap-6">
        <Header t={t} />
        <div className="h-64 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
      </main>
    );
  }

  const byId = new Map(catalog.items.map((i) => [i.id, i]));
  const setLines = (id: string, n: number) =>
    setItems((s) => {
      const next = { ...s };
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });
  const addItem = (id: string) => setItems((s) => ({ ...s, [id]: (s[id] || 0) + 1 }));

  // Construibilidad: con civ → su set; sin civ → ocultar UUs (evita las 50+ únicas).
  const buildable = civ ? new Set(catalog.buildable[civ] || []) : null;
  const visibleItems = catalog.items.filter((it) =>
    buildable ? buildable.has(it.id) : it.variant !== "unique",
  );

  return (
    <main className="flex flex-col gap-6">
      <Header t={t} />

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Civilización / Civ
          <div className="flex items-center gap-2">
            {civ && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={civEmblemUrl(civ)} alt="" className="h-6 w-6 object-contain" />
            )}
            <select
              value={civ}
              onChange={(e) => setCiv(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">Genérica / Generic</option>
              {catalog.civs.map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Edad / Age
          <select
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-900"
          >
            {AGES.map((a) => <option key={a} value={a}>{AGE_LABEL[a]}</option>)}
          </select>
        </label>
        <button
          onClick={() => setItems({})}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm transition-colors hover:border-amber-400 dark:border-zinc-700"
        >
          {t("production.reset")}
        </button>
      </div>

      <SupplyPanel catalog={catalog} supply={supply} setSupply={setSupply} t={t} />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* DEMANDA */}
        <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("production.demand")}
          </h2>
          {Object.keys(items).length === 0 ? (
            <p className="text-sm text-zinc-500">{t("production.emptyItems")}</p>
          ) : (
            <ul className="flex flex-col">
              {Object.entries(items).map(([id, lines]) => {
                const it = byId.get(id);
                if (!it) return null;
                return (
                  <li key={id} className="flex items-center gap-3 border-t border-zinc-100 py-2 first:border-t-0 dark:border-zinc-800">
                    <ItemIcon item={it} className="h-7 w-7" />
                    <div className="flex-1">
                      <div className="text-sm">{it.name}</div>
                      <CostLine item={it} />
                    </div>
                    <Stepper value={lines} onChange={(n) => setLines(id, n)} />
                    <button onClick={() => setLines(id, 0)} className="px-1 text-zinc-400 hover:text-rose-500" aria-label="quitar">✕</button>
                  </li>
                );
              })}
            </ul>
          )}
          <ItemPicker items={visibleItems} counts={items} onAdd={addItem} />
        </section>

        {/* RESULTADOS */}
        <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("production.result")}
          </h2>
          {request.items.length === 0 ? (
            <p className="py-2 text-sm text-zinc-500">{t("production.emptyResult")}</p>
          ) : prodQ.isError ? (
            <p className="py-2 text-sm text-rose-500">
              {prodQ.error instanceof Error ? prodQ.error.message : "Error"}
            </p>
          ) : prodQ.data ? (
            <Result data={prodQ.data} catalog={catalog} age={age} t={t} />
          ) : (
            <div className="h-40 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          )}
        </section>
      </div>
    </main>
  );
}

function Header({ t }: { t: (k: string) => string }) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold tracking-tight">{t("production.title")}</h1>
      <p className="max-w-2xl text-sm text-zinc-500">{t("production.subtitle")}</p>
    </header>
  );
}

function ItemIcon({ item, className = "h-6 w-6" }: { item: EcoItem; className?: string }) {
  const src = iconUrl(item.imgPath);
  if (!src) return <span className={className} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={item.name}
      className={`${className} object-contain`}
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
    />
  );
}

function ResIcon({ res, className = "inline-block h-3.5 w-3.5 align-[-2px]" }: { res: Res; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={resIconUrl(res)} alt={res} title={res} className={className} />;
}

function CostLine({ item }: { item: EcoItem }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-zinc-500">
      {RES_ORDER.filter((r) => item.cost[r]).map((r) => (
        <span key={r} className="inline-flex items-center gap-0.5">
          {item.cost[r]}<ResIcon res={r} className="inline-block h-3 w-3" />
        </span>
      ))}
      <span>· {item.time}s</span>
    </div>
  );
}

function ItemPicker({
  items, counts, onAdd,
}: { items: EcoItem[]; counts: Record<string, number>; onAdd: (id: string) => void }) {
  const groups: Record<string, EcoItem[]> = {};
  for (const it of items) (groups[it.category] ||= []).push(it);
  const cats = CAT_ORDER.filter((c) => groups[c]);
  if (!cats.length) {
    return <p className="text-xs text-zinc-500">Esta civilización no tiene items construibles cargados.</p>;
  }
  return (
    <div className="flex flex-col gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
      {cats.map((cat) => (
        <div key={cat} className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{CAT_LABEL[cat] || cat}</span>
          <div className="flex flex-wrap gap-1.5">
            {groups[cat].sort((a, b) => a.name.localeCompare(b.name)).map((it) => {
              const n = counts[it.id] || 0;
              const ring = it.variant === "unique" ? "border-l-2 border-l-violet-400"
                : it.variant === "regional" ? "border-l-2 border-l-sky-400" : "";
              return (
                <button
                  key={it.id}
                  onClick={() => onAdd(it.id)}
                  title={it.name}
                  className={`relative flex w-[62px] flex-col items-center gap-1 rounded-lg border px-1 py-1.5 text-center transition-colors ${ring} ${
                    n ? "border-amber-400 bg-amber-500/15 ring-1 ring-amber-400"
                      : "border-zinc-200 hover:border-amber-400 hover:bg-amber-500/5 dark:border-zinc-700"
                  }`}
                >
                  <ItemIcon item={it} className="h-7 w-7" />
                  {n > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 min-w-4 rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">{n}</span>
                  )}
                  <span className="w-full truncate text-[10px] text-zinc-600 dark:text-zinc-400">{it.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const btn = "flex h-7 w-7 items-center justify-center rounded-md border border-zinc-300 text-base leading-none transition-colors hover:border-amber-400 dark:border-zinc-700";
  return (
    <div className="flex items-center gap-2">
      <button className={btn} onClick={() => onChange(value - 1)} aria-label="menos">−</button>
      <span className="min-w-5 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button className={btn} onClick={() => onChange(value + 1)} aria-label="más">+</button>
    </div>
  );
}

function Result({ data, catalog, age, t }: { data: Production; catalog: EcoCatalog; age: string; t: (k: string) => string }) {
  const vOf = (r: Res) => data.perResource[r].fillVillagers;
  const maxV = Math.max(1, ...RES_ORDER.map((r) => vOf(r) || 0));
  const ageIdx = AGES.indexOf(age as (typeof AGES)[number]);
  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm">
        {t("production.total")}: <b className="text-2xl text-amber-500">{data.total}</b> {t("production.villagers")}
        {data.contributorVillagers > 0 && (
          <span className="ml-1 text-xs text-zinc-500">({data.contributorVillagers} fijos + {data.fillVillagers} relleno)</span>
        )}
        <span className="ml-2 text-xs text-zinc-500">· {t("production.bottleneck")}: {t(`production.res.${data.bottleneck}`)}</span>
      </div>
      <div className="flex flex-col gap-2">
        {RES_ORDER.map((r) => {
          const d = data.perResource[r];
          if (!d.demandPerMin && !vOf(r)) return null;
          const v = vOf(r) == null ? "∞" : vOf(r);
          const pct = vOf(r) ? Math.round(((vOf(r) as number) / maxV) * 100) : 0;
          const srcLabel = d.fillSource && catalog.sources[d.fillSource] ? catalog.sources[d.fillSource].label : d.fillSource ?? "";
          const reseed = r === "wood" && d.reseedPerMin ? ` · incl. ${d.reseedPerMin} reseed` : "";
          return (
            <div key={r} className="grid grid-cols-[92px_1fr_40px] items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs">
                <ResIcon res={r} />
                <div>
                  <div>{t(`production.res.${r}`)}</div>
                  <div className="text-[10px] text-zinc-500">{srcLabel} · {d.ratePerMin}/min</div>
                </div>
              </div>
              <div className="h-5 overflow-hidden rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950">
                <span className={`block h-full ${RES_BAR[r]}`} style={{ width: `${pct}%` }} />
              </div>
              <div className={`text-right text-base font-bold tabular-nums ${data.bottleneck === r ? "text-orange-500" : ""}`} title={`${d.demandPerMin}/min${reseed}`}>
                {v}
              </div>
            </div>
          );
        })}
      </div>
      {(data.contributors.length > 0 || (data.reseedWood && data.reseedWood.totalPerMin > 0) || data.heuristics.length > 0 || data.appliedCivMods) && (
        <div className="mt-1 flex flex-col gap-1 border-t border-zinc-100 pt-2 text-xs text-zinc-500 dark:border-zinc-800">
          {data.contributors.length > 0 && (
            <div>Fijos: {data.contributors.map((c) => `${c.count}× ${c.label}`).join(", ")}</div>
          )}
          {data.reseedWood && data.reseedWood.totalPerMin > 0 && (
            <div>🌲 Reseed de granjas/trampas: ~{data.reseedWood.totalPerMin} madera/min (por eso suma madera).</div>
          )}
          {data.heuristics.map((h, i) => <div key={i}>• {h}</div>)}
          {data.appliedCivMods && (
            <div>
              {t("production.appliedBonuses")}:{" "}
              {data.appliedCivMods.map((m, i) => (
                <span key={i}>{i > 0 ? ", " : ""}{civModLabel(m, ageIdx)}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function civModLabel(m: Record<string, unknown>, ageIdx: number): string {
  if (m.type === "cost") {
    const vals = (m.valueByAge as number[]) || [];
    return `${m.scope} ${m.resource} ×${vals[ageIdx] ?? vals[vals.length - 1]}`;
  }
  if (m.type === "gen") return `${m.scope}→${m.stat}`;
  return `desbloquea ${Array.isArray(m.scope) ? m.scope.join(", ") : m.scope}`;
}

function SupplyPanel({
  catalog, supply, setSupply, t,
}: {
  catalog: EcoCatalog;
  supply: Supply;
  setSupply: React.Dispatch<React.SetStateAction<Supply>>;
  t: (k: string) => string;
}) {
  const setSource = (res: Res, id: string) =>
    setSupply((s) => {
      const bySource = { ...s.bySource };
      if (id) bySource[res] = id;
      else delete bySource[res];
      return { ...s, bySource };
    });
  const toggleTech = (id: string, on: boolean) =>
    setSupply((s) => ({ ...s, techs: on ? [...s.techs, id] : s.techs.filter((x) => x !== id) }));
  const setPassive = (k: keyof Supply["passive"], n: number) =>
    setSupply((s) => ({ ...s, passive: { ...s.passive, [k]: Math.max(0, n) } }));
  const sourceIds = Object.keys(catalog.sources);
  const addContrib = () =>
    setSupply((s) => ({ ...s, contributors: [...s.contributors, { source: sourceIds[0], count: 3 }] }));
  const setContrib = (i: number, patch: Partial<Contributor>) =>
    setSupply((s) => ({ ...s, contributors: s.contributors.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));
  const delContrib = (i: number) =>
    setSupply((s) => ({ ...s, contributors: s.contributors.filter((_, j) => j !== i) }));

  const inputCls = "rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-950";

  return (
    <details className="rounded-xl border border-zinc-200 bg-white px-4 open:pb-4 dark:border-zinc-800 dark:bg-zinc-900">
      <summary className="cursor-pointer py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        ⚙️ {t("production.economy")} — <span className="font-normal normal-case">{t("production.standardEco")}</span>
      </summary>

      <div className="mb-2 text-[11px] uppercase tracking-wide text-zinc-400">Fuente de relleno por recurso</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {RES_ORDER.map((res) => {
          const opts = Object.entries(catalog.sources).filter(([, s]) => s.resource === res);
          if (!opts.length) return null;
          return (
            <label key={res} className="flex flex-col gap-1 text-xs text-zinc-500">
              <span className="flex items-center gap-1"><ResIcon res={res} /> {t(`production.res.${res}`)}</span>
              <select value={supply.bySource[res] || ""} onChange={(e) => setSource(res, e.target.value)} className={inputCls}>
                <option value="">{t("production.source.standard")}</option>
                {opts.map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}
              </select>
            </label>
          );
        })}
      </div>

      {/* Contributors (recolectores fijos multi-fuente) */}
      <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <div className="mb-2 text-xs text-zinc-500">Recolectores fijos que ya tenés (podés mezclar varias fuentes)</div>
        <div className="flex flex-col gap-2">
          {supply.contributors.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <select value={c.source} onChange={(e) => setContrib(i, { source: e.target.value })} className={`${inputCls} flex-1`}>
                {Object.entries(catalog.sources).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}
              </select>
              <input
                type="number" min={0} value={c.count}
                onChange={(e) => setContrib(i, { count: Math.max(0, parseInt(e.target.value || "0", 10) || 0) })}
                className={`${inputCls} w-16`}
              />
              <button onClick={() => delContrib(i)} className="px-1 text-zinc-400 hover:text-rose-500" aria-label="quitar">✕</button>
            </div>
          ))}
        </div>
        <button onClick={addContrib} className="mt-2 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs transition-colors hover:border-amber-400 dark:border-zinc-700">
          + Agregar fuente
        </button>
      </div>

      {/* Techs de recolección */}
      <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <div className="mb-2 text-xs text-zinc-500">{t("production.techsTitle")}</div>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {TECH_ORDER.filter((id) => catalog.supplyTechs[id]).map((id) => (
            <label key={id} className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              <input type="checkbox" checked={supply.techs.includes(id)} onChange={(e) => toggleTech(id, e.target.checked)} />
              {catalog.supplyTechs[id].name}
            </label>
          ))}
        </div>
      </div>

      {/* Pasivos */}
      <div className="mt-3 flex flex-wrap gap-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        {([["relics", "production.relics"], ["tradeCarts", "production.trade"], ["feitorias", "production.feitoria"]] as const).map(
          ([key, label]) => (
            <label key={key} className="flex flex-col gap-1 text-xs text-zinc-500">
              {t(label)}
              <input
                type="number" min={0} value={supply.passive[key]}
                onChange={(e) => setPassive(key, parseInt(e.target.value || "0", 10) || 0)}
                className={`${inputCls} w-20`}
              />
            </label>
          ),
        )}
      </div>
    </details>
  );
}
