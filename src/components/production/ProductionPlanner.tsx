"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useI18n, useT } from "@/lib/i18n/I18nProvider";
import { civEmblemUrl } from "@/lib/img";
import { civHasGarrison, resolveCivEffects, stockMultiplier } from "@/lib/production/civ-eco";
import {
  MAX_FOOD_ROWS, foodRowsToInput, garrisonFood, typicalStart, type FoodKind, type FoodRowState,
} from "@/lib/production/food";
import { fetchCivCosts, fetchEcoCatalog } from "@/lib/api/production-client";
import {
  AGES, RESOURCES, ageIndex, buildEcoModel, evaluateSustain, haveFromPlan, solvePlan,
  type PlanInput, type Relief, type Res,
} from "@/lib/production/engine";
import {
  MAX_BUILDINGS, MAX_LINES, TEMPLATES, decodeState, encodeState, newLineKey, templateLines,
  type PlanState, type Template,
} from "@/lib/production/plan";
import { EconomyResults, type Assumption } from "./EconomyResults";
import { FoodPanel } from "./FoodPanel";
import { LineList, type LineRow } from "./LineList";
import { SettingsPanel, type CivModsState } from "./SettingsPanel";
import { SustainPanel } from "./SustainPanel";
import { UnitPicker } from "./UnitPicker";
import { ResIcon, fill, useNumberFormat, useSourceLabel } from "./ui";

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function ProductionPlanner() {
  const t = useT();
  const nf = useNumberFormat();
  const srcLabel = useSourceLabel();
  const { locale } = useI18n();
  const params = useSearchParams();
  const pathname = usePathname();

  // El estado inicial sale de la URL; después la URL se reescribe con cada cambio.
  const [state, setState] = useState<PlanState>(() => decodeState(params));
  const [undo, setUndo] = useState<PlanState | null>(null);
  const [pickerOpen, setPickerOpen] = useState<boolean | null>(null); // null = automático
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resultsEl, setResultsEl] = useState<HTMLElement | null>(null);
  const [resultsVisible, setResultsVisible] = useState(true);

  const catalogQ = useQuery({ queryKey: ["eco-catalog"], queryFn: fetchEcoCatalog });
  const catalog = catalogQ.data;
  const model = useMemo(() => (catalog ? buildEcoModel(catalog) : null), [catalog]);
  const byId = useMemo(() => new Map((catalog?.items ?? []).map((i) => [i.id, i])), [catalog]);

  const civ = catalog && catalog.civs.includes(state.civ) ? state.civ : "";
  const civName = cap(civ);
  const buildable = useMemo(() => (civ && catalog ? new Set(catalog.buildable[civ] ?? []) : null), [civ, catalog]);
  const costIds = useMemo(() => (buildable ? [...buildable].filter((id) => byId.has(id)) : []), [buildable, byId]);

  // Costos ajustados por los bonos de la civ: se piden UNA vez por (civ, edad).
  const costsQ = useQuery({
    queryKey: ["eco-costs", civ, state.age],
    queryFn: () => fetchCivCosts(civ, state.age, costIds),
    enabled: !!civ && costIds.length > 0,
    staleTime: Infinity,
    placeholderData: (prev, prevQuery) => (prevQuery?.queryKey[1] === civ ? prev : undefined),
  });

  // Bonos económicos de la civ (tasas, resembrado, goteos) y mezcla de fuentes de comida.
  const effects = useMemo(() => resolveCivEffects(civ, state.age), [civ, state.age]);
  const garrisonOn = civHasGarrison(civ);
  const foodRowsInput = useMemo(
    () => foodRowsToInput(state.foodRows, (livestock) => stockMultiplier(civ, livestock)),
    [state.foodRows, civ],
  );
  const garrisonFoodPerMin = garrisonOn ? garrisonFood(state.garrison.mills, state.garrison.animals) : 0;

  const planInput = useMemo<PlanInput>(
    () => ({
      lines: state.lines, age: state.age, costs: civ ? costsQ.data?.costs : undefined,
      foodSource: state.foodSource, foodRows: foodRowsInput, techs: state.techs, efficiency: state.efficiency,
      houses: state.houses, passive: state.passive, effects,
      extraPassive: garrisonFoodPerMin > 0 ? { food: garrisonFoodPerMin } : undefined,
    }),
    [state, civ, costsQ.data, foodRowsInput, effects, garrisonFoodPerMin],
  );
  const result = useMemo(() => (model ? solvePlan(model, planInput) : null), [model, planInput]);
  const sustain = useMemo(
    () => (model && state.sustain ? evaluateSustain(model, planInput, state.have) : null),
    [model, planInput, state.sustain, state.have],
  );

  // La URL siempre refleja la composición (se puede copiar de la barra o con el botón).
  useEffect(() => {
    const qs = encodeState(state);
    const id = window.setTimeout(() => {
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    }, 200);
    return () => window.clearTimeout(id);
  }, [state, pathname]);

  // Barra de resumen fija: aparece cuando el panel de resultados sale de la pantalla.
  useEffect(() => {
    if (!resultsEl) return;
    const io = new IntersectionObserver(([e]) => setResultsVisible(e.isIntersecting));
    io.observe(resultsEl);
    return () => io.disconnect();
  }, [resultsEl]);

  // ── edición ──────────────────────────────────────────────────────────────
  const patch = (p: Partial<PlanState>) => setState((s) => ({ ...s, ...p }));
  const updateLine = (key: string, p: Partial<PlanState["lines"][number]>) =>
    setState((s) => ({ ...s, lines: s.lines.map((l) => (l.key === key ? { ...l, ...p } : l)) }));
  const removeLine = (key: string) => setState((s) => ({ ...s, lines: s.lines.filter((l) => l.key !== key) }));
  const duplicateLine = (key: string) =>
    setState((s) => {
      const i = s.lines.findIndex((l) => l.key === key);
      if (i < 0 || s.lines.length >= MAX_LINES) return s;
      const lines = [...s.lines];
      lines.splice(i + 1, 0, { ...s.lines[i], key: newLineKey() });
      return { ...s, lines };
    });
  const moveLine = (key: string, dir: -1 | 1) =>
    setState((s) => {
      const i = s.lines.findIndex((l) => l.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= s.lines.length) return s;
      const lines = [...s.lines];
      [lines[i], lines[j]] = [lines[j], lines[i]];
      return { ...s, lines };
    });
  const addItem = (itemId: string) =>
    setState((s) => {
      const existing = s.lines.find((l) => l.itemId === itemId);
      if (existing) {
        return { ...s, lines: s.lines.map((l) => (l === existing ? { ...l, buildings: Math.min(MAX_BUILDINGS, l.buildings + 1) } : l)) };
      }
      if (s.lines.length >= MAX_LINES) return s;
      return { ...s, lines: [...s.lines, { key: newLineKey(), itemId, buildings: 1, activity: 100 }] };
    });
  const applyTemplate = (tpl: Template) => {
    if (state.lines.length) setUndo(state);
    setState((s) => ({ ...s, age: tpl.age, lines: templateLines(tpl, (id) => byId.has(id)) }));
  };
  const clearAll = () => {
    if (state.lines.length) setUndo(state);
    setState((s) => ({ ...s, lines: [] }));
  };
  const doUndo = () => {
    if (!undo) return;
    setState(undo);
    setUndo(null);
  };
  const addFoodRow = (kind: FoodKind) =>
    setState((s) =>
      s.foodRows.length >= MAX_FOOD_ROWS ? s : { ...s, foodRows: [...s.foodRows, { key: newLineKey(), kind, count: 2, animals: 0 }] },
    );
  const updateFoodRow = (key: string, p: Partial<FoodRowState>) =>
    setState((s) => ({ ...s, foodRows: s.foodRows.map((r) => (r.key === key ? { ...r, ...p } : r)) }));
  const removeFoodRow = (key: string) => setState((s) => ({ ...s, foodRows: s.foodRows.filter((r) => r.key !== key) }));
  const loadTypicalStart = () => patch({ foodRows: typicalStart(newLineKey) });
  const setHave = (r: Res, n: number) => setState((s) => ({ ...s, have: { ...s.have, [r]: n } }));
  const applyRelief = (rel: Relief) => {
    const action = rel.action;
    setState((s) => {
      const line = s.lines.find((l) => l.key === rel.lineKey);
      if (!line) return s;
      if (action.type === "activity") {
        return { ...s, lines: s.lines.map((l) => (l.key === rel.lineKey ? { ...l, activity: action.to } : l)) };
      }
      if (line.buildings > 1) {
        return { ...s, lines: s.lines.map((l) => (l.key === rel.lineKey ? { ...l, buildings: l.buildings - 1 } : l)) };
      }
      return { ...s, lines: s.lines.filter((l) => l.key !== rel.lineKey) };
    });
  };
  const share = async () => {
    const qs = encodeState(state);
    const url = `${window.location.origin}${pathname}${qs ? `?${qs}` : ""}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t("production.share"), url);
    }
  };

  // ── carga / error ────────────────────────────────────────────────────────
  const header = (
    <header className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold tracking-tight">{t("production.title")}</h1>
      <p className="max-w-3xl text-sm text-zinc-600">{t("production.subtitle")}</p>
    </header>
  );
  if (catalogQ.isError) {
    return (
      <main className="flex flex-col gap-4">
        {header}
        <div className="surface flex flex-col items-start gap-3 p-4">
          <p className="font-semibold text-[var(--bad)]">{t("production.loadError")}</p>
          <button type="button" className="aoe-btn" onClick={() => catalogQ.refetch()}>{t("production.retry")}</button>
        </div>
      </main>
    );
  }
  if (!catalog || !model || !result) {
    return (
      <main className="flex flex-col gap-4">
        {header}
        <div className="h-72 animate-pulse border border-[var(--rule)] bg-[rgba(255,248,228,0.3)]" />
      </main>
    );
  }

  // ── derivados para la vista ──────────────────────────────────────────────
  const planAgeIdx = ageIndex(state.age);
  const resultByKey = new Map(result.lines.map((l) => [l.key, l]));
  const sustainByKey = new Map((sustain?.perLine ?? []).map((l) => [l.key, l]));
  const rows: LineRow[] = state.lines.flatMap((line) => {
    const item = byId.get(line.itemId);
    if (!item) return [];
    return [{
      line, item, result: resultByKey.get(line.key),
      warnAge: ageIndex(item.age) > planAgeIdx ? t(`production.age.${item.age}`) : undefined,
      warnCiv: buildable && !buildable.has(item.id) ? civName : undefined,
      sustained: sustainByKey.get(line.key)?.sustained,
    }];
  });
  const empty = rows.length === 0;

  const visibleItems = catalog.items.filter((it) => (buildable ? buildable.has(it.id) : it.variant !== "unique"));
  const counts: Record<string, number> = {};
  for (const l of state.lines) counts[l.itemId] = (counts[l.itemId] || 0) + l.buildings;

  const civMods: CivModsState = !civ
    ? { status: "none" }
    : costsQ.isError ? { status: "error" }
      : costsQ.data ? { status: "ready", mods: costsQ.data.civMods }
        : { status: "loading" };
  const costsPending = !!civ && !costsQ.isError && costsQ.isFetching;
  const costsFailed = !!civ && costsQ.isError;
  const passiveTotal = RESOURCES.reduce((s, r) => s + result.resources[r].passive, 0);
  const techCount = state.techs?.length ?? 0;
  const assumptions: Assumption[] = [
    {
      id: "food",
      label: state.foodRows.some((r) => r.count > 0)
        ? fill(t("production.assume.foodMix"), { n: state.foodRows.filter((r) => r.count > 0).length, src: srcLabel(result.resources.food.sourceId, result.resources.food.sourceLabel) })
        : fill(t("production.assume.food"), { src: srcLabel(result.resources.food.sourceId, result.resources.food.sourceLabel) }),
    },
    ...(garrisonFoodPerMin > 0 ? [{ id: "garrison", label: fill(t("production.assume.garrison"), { n: nf(garrisonFoodPerMin, 1) }) }] : []),
    ...(Object.keys(effects.rateMult).length + effects.trickles.length + Object.keys(effects.reseedCapMult).length > 0
      ? [{ id: "civeco", label: fill(t("production.assume.civEco"), { civ: civName }) }] : []),
    { id: "eff", label: fill(t("production.assume.eff"), { pct: Math.round(state.efficiency * 100) }) },
    { id: "houses", label: t(state.houses ? "production.assume.housesOn" : "production.assume.housesOff") },
    { id: "techs", label: state.techs === null ? t("production.assume.techs.standard") : fill(t("production.assume.techs.custom"), { n: techCount }) },
    civ
      ? costsFailed
        ? { id: "cost", warn: true, label: fill(t("production.result.pendingFail"), { civ: civName }) }
        : costsPending
          ? { id: "cost", warn: true, label: fill(t("production.result.pending"), { civ: civName }) }
          : { id: "cost", label: fill(t("production.assume.costCiv"), { civ: civName }) }
      : { id: "cost", label: t("production.assume.costBase") },
    ...(passiveTotal > 0 ? [{ id: "passive", label: fill(t("production.assume.passive"), { n: nf(passiveTotal) }) }] : []),
  ];

  const pickerShown = pickerOpen ?? state.lines.length === 0;
  const fieldLabel = "flex min-w-0 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-500";

  return (
    <main className="flex flex-col gap-4 pb-20">
      {header}

      <div className="flex flex-wrap items-end gap-3">
        <label className={fieldLabel}>
          {t("production.civ")}
          <div className="flex items-center gap-2">
            {civ && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={civEmblemUrl(civ)} alt="" className="h-7 w-7 object-contain" />
            )}
            <select value={civ} onChange={(e) => patch({ civ: e.target.value })} className="field field-select min-w-0 flex-1 normal-case sm:w-52">
              <option value="">{t("production.civ.generic")}</option>
              {catalog.civs.map((c) => <option key={c} value={c}>{cap(c)}</option>)}
            </select>
          </div>
        </label>
        <label className={fieldLabel}>
          {t("production.age")}
          <select value={state.age} onChange={(e) => patch({ age: e.target.value as PlanState["age"] })} className="field field-select normal-case">
            {AGES.map((a) => <option key={a} value={a}>{t(`production.age.${a}`)}</option>)}
          </select>
        </label>
        <button type="button" onClick={share} className="aoe-btn ml-auto" aria-live="polite">
          {copied ? `✓ ${t("production.shared")}` : `⧉ ${t("production.share")}`}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {/* Composición: arriba en escritorio, después del resumen en celular */}
        <section aria-labelledby="comp-title" className={`surface flex flex-col gap-3 p-3 sm:p-4 md:order-1 ${empty ? "order-1" : "order-2"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 id="comp-title" className="text-sm uppercase tracking-[0.12em] text-[var(--ink-700)]">{t("production.comp.title")}</h2>
              <p className="text-xs text-zinc-500">{t("production.comp.hint")}</p>
            </div>
            <div className="flex items-center gap-3 text-sm font-semibold">
              {undo && (
                <button type="button" onClick={doUndo} className="text-[var(--red-500)] underline decoration-dotted underline-offset-2 hover:decoration-solid">
                  ↶ {t("production.undo")}
                </button>
              )}
              {!empty && (
                <button type="button" onClick={clearAll} className="text-zinc-600 hover:text-[var(--red-500)]">
                  {t("production.reset")}
                </button>
              )}
            </div>
          </div>

          <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label={t("production.templates")}>
            <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("production.templates")}</span>
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => applyTemplate(tpl)}
                title={tpl.lines.map((l) => `${l.buildings}× ${byId.get(l.itemId)?.name ?? l.itemId}`).join(" + ")}
                className="shrink-0 whitespace-nowrap border border-[var(--rule)] bg-[rgba(255,248,228,0.4)] px-2.5 py-1.5 text-sm font-semibold transition-colors hover:border-[var(--red-500)] hover:text-[var(--red-500)]"
              >
                {t(`production.tpl.${tpl.id}`)}
              </button>
            ))}
          </div>

          {empty ? (
            <p className="border border-dashed border-[var(--rule)] px-3 py-5 text-center text-zinc-600">{t("production.comp.empty")}</p>
          ) : (
            <LineList
              rows={rows}
              showPriority={state.sustain}
              onChange={updateLine}
              onRemove={removeLine}
              onDuplicate={duplicateLine}
              onMove={moveLine}
            />
          )}

          <div className="border-t border-[var(--rule-soft)] pt-3">
            <button
              type="button"
              onClick={() => setPickerOpen(!pickerShown)}
              aria-expanded={pickerShown}
              className="flex w-full items-center justify-between gap-2 text-left"
            >
              <span className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
                <span className="font-display text-sm font-bold uppercase tracking-[0.12em] text-[var(--ink-700)]">{t("production.add.title")}</span>
                <span className="text-xs text-zinc-500">{t("production.add.hint")}</span>
              </span>
              <span className="shrink-0 text-xs font-semibold text-[var(--red-500)]">
                {pickerShown ? `▲ ${t("production.add.hide")}` : `▼ ${t("production.add.show")}`}
              </span>
            </button>
            {pickerShown && (
              <div className="mt-3">
                <UnitPicker items={visibleItems} counts={counts} planAge={state.age} onAdd={addItem} />
              </div>
            )}
          </div>
        </section>

        {/* Resultados: siempre a la vista; en celular van primero */}
        <div className={empty ? "order-2" : "order-1 md:order-2"}>
          <EconomyResults
            result={result}
            sustain={sustain}
            empty={empty}
            assumptions={assumptions}
            onEditAssumptions={() => {
              setSettingsOpen(true);
              window.requestAnimationFrame(() => document.getElementById("cfg-food")?.scrollIntoView({ behavior: "smooth", block: "center" }));
            }}
            sectionRef={setResultsEl}
          />
        </div>

        <div className="order-3">
          <FoodPanel
            result={result}
            rows={state.foodRows}
            civName={civName}
            model={model}
            garrisonOn={garrisonOn}
            garrison={state.garrison}
            garrisonFoodPerMin={garrisonFoodPerMin}
            onAdd={addFoodRow}
            onUpdate={updateFoodRow}
            onRemove={removeFoodRow}
            onTypical={loadTypicalStart}
            onGarrison={(g) => patch({ garrison: g })}
          />
        </div>

        <div className="order-4 grid gap-4 xl:grid-cols-2 xl:items-start">
          <SustainPanel
            on={state.sustain}
            onToggle={(on) => patch({ sustain: on })}
            have={state.have}
            onHave={setHave}
            onFill={() => patch({ have: haveFromPlan(result) })}
            result={result}
            sustain={sustain}
            empty={empty}
            onApplyRelief={applyRelief}
          />
          <SettingsPanel
            model={model}
            state={state}
            patch={patch}
            result={result}
            civ={civ}
            civName={civName}
            civMods={civMods}
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
          />
        </div>
      </div>

      {/* Resumen fijo cuando el panel de resultados no está a la vista */}
      {!empty && !resultsVisible && (
        <button
          type="button"
          onClick={() => resultsEl?.scrollIntoView({ behavior: "smooth", block: "start" })}
          lang={locale}
          className="fixed inset-x-3 bottom-3 z-30 mx-auto flex max-w-3xl items-center gap-3 border border-[var(--gold)] bg-[#1b0f07]/95 px-4 py-2.5 text-left text-[var(--on-dark)] shadow-lg"
        >
          <span className="text-2xl font-bold leading-none tabular-nums text-[var(--gold)]">
            {result.unreachable.length ? "?" : `≈ ${nf(result.total.mid)}`}
          </span>
          <span className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-0.5 text-sm tabular-nums">
            {RESOURCES.filter((r) => result.resources[r].demand.gross > 0.05).map((r) => (
              <span key={r} className="inline-flex items-center gap-1">
                <ResIcon res={r} className="h-3.5 w-3.5" />
                {result.resources[r].needed ? nf(result.resources[r].needed!.mid) : "—"}
              </span>
            ))}
          </span>
          <span className="shrink-0 text-xs underline">{t("production.mini.open")}</span>
        </button>
      )}
    </main>
  );
}
