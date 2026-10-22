"use client";

import { useT } from "@/lib/i18n/I18nProvider";
import type { EcoModel, PlanResult } from "@/lib/production/engine";
import {
  FOOD_KINDS, FOOD_KIND_ORDER, GARRISON_MAX_PER_MILL, MAX_FOOD_ROWS, MAX_GATHERERS,
  type FoodKind, type FoodRowState,
} from "@/lib/production/food";
import type { PlanState } from "@/lib/production/plan";
import { ResIcon, Stepper, fill, smallBtn, useNumberFormat, useSourceLabel } from "./ui";

type Props = {
  result: PlanResult;
  rows: FoodRowState[];
  civName: string;
  model: EcoModel;
  garrisonOn: boolean;
  garrison: PlanState["garrison"];
  garrisonFoodPerMin: number;
  onAdd: (kind: FoodKind) => void;
  onUpdate: (key: string, patch: Partial<FoodRowState>) => void;
  onRemove: (key: string) => void;
  onTypical: () => void;
  onGarrison: (g: PlanState["garrison"]) => void;
};

/** La comida casi nunca sale de una sola fuente: acá se arma la mezcla (2 jabalíes + 8 ovejas + bayas…).
 *  Los aldeanos de cada fila se cuentan primero; lo que falta lo cubre la fuente de relleno. */
export function FoodPanel({
  result, rows, civName, model, garrisonOn, garrison, garrisonFoodPerMin,
  onAdd, onUpdate, onRemove, onTypical, onGarrison,
}: Props) {
  const t = useT();
  const nf = useNumberFormat();
  const srcLabel = useSourceLabel();
  const food = result.resources.food;
  const fillName = srcLabel(food.sourceId, food.sourceLabel);
  const rowResult = new Map(food.rows.map((r) => [r.key, r]));
  const kinds = FOOD_KIND_ORDER.filter((k) => model.sources[FOOD_KINDS[k].source]);
  const rowsFood = food.rows.reduce((s, r) => s + r.produced, 0);
  const select = "field field-select min-w-0";

  return (
    <section aria-labelledby="food-title" className="surface flex flex-col gap-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="food-title" className="text-sm uppercase tracking-[0.12em] text-[var(--ink-700)]">{t("production.food.title")}</h2>
          <p className="max-w-3xl text-xs text-zinc-500">{fill(t("production.food.hint"), { src: fillName })}</p>
        </div>
        <button
          type="button"
          onClick={onTypical}
          className="border border-[var(--rule)] bg-[rgba(255,248,228,0.4)] px-2.5 py-1.5 text-sm font-semibold transition-colors hover:border-[var(--red-500)] hover:text-[var(--red-500)]"
        >
          {t("production.food.typical")}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="border border-dashed border-[var(--rule)] px-3 py-3 text-sm text-zinc-600">
          {fill(t("production.food.empty"), { src: fillName })}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => {
            const info = FOOD_KINDS[row.kind];
            const r = rowResult.get(row.key);
            const boat = !!model.sources[info.source]?.perUnit;
            return (
              <li key={row.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 border border-[var(--rule-soft)] bg-[rgba(255,248,228,0.25)] p-2.5">
                <label className="flex min-w-[10rem] flex-col gap-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  {t("production.food.source")}
                  <select value={row.kind} onChange={(e) => onUpdate(row.key, { kind: e.target.value as FoodKind })} className={select}>
                    {kinds.map((k) => <option key={k} value={k}>{t(`production.food.kind.${k}`)}</option>)}
                  </select>
                </label>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    {t(boat ? "production.food.boats" : "production.food.gatherers")}
                  </span>
                  <Stepper
                    value={row.count} min={0} max={MAX_GATHERERS}
                    onChange={(n) => onUpdate(row.key, { count: n })}
                    minusLabel={t("production.line.moreMinus")} plusLabel={t("production.line.morePlus")}
                  />
                </div>
                {info.perAnimal ? (
                  <label className="flex flex-col gap-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    {t(`production.food.animals.${row.kind}`)}
                    <input
                      type="number" inputMode="numeric" min={0} max={MAX_GATHERERS} value={row.animals}
                      onChange={(e) => onUpdate(row.key, { animals: Math.max(0, Math.min(MAX_GATHERERS, Number.parseInt(e.target.value, 10) || 0)) })}
                      className="field w-20 tabular-nums"
                    />
                  </label>
                ) : null}
                <div className="min-w-[10rem] flex-1 text-sm tabular-nums">
                  {r ? (
                    <>
                      <div>
                        {fill(t("production.food.rowStat"), { rate: nf(r.rate, 1), made: nf(r.produced) })}
                        {r.civMult !== 1 && <span className="ml-1 text-xs font-semibold text-[var(--good)]">×{nf(r.civMult, 2)} {civName}</span>}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {r.durationMin !== null
                          ? fill(t("production.food.lasts"), { min: nf(r.durationMin, 1), food: nf(r.stock) })
                          : t(info.perAnimal ? "production.food.setAnimals" : "production.food.noStock")}
                      </div>
                    </>
                  ) : <span className="text-xs text-zinc-400">—</span>}
                </div>
                <button type="button" className={`${smallBtn} ml-auto`} onClick={() => onRemove(row.key)} aria-label={t("production.food.remove")} title={t("production.food.remove")}>✕</button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-xs uppercase tracking-wide text-zinc-500">{t("production.food.add")}</span>
          <select
            value=""
            disabled={rows.length >= MAX_FOOD_ROWS}
            onChange={(e) => { if (e.target.value) onAdd(e.target.value as FoodKind); }}
            className={select}
          >
            <option value="">{t("production.food.pick")}</option>
            {kinds.map((k) => <option key={k} value={k}>{t(`production.food.kind.${k}`)}</option>)}
          </select>
        </label>
        <span className="text-xs text-zinc-500">{t("production.food.decayNote")}</span>
      </div>

      {garrisonOn && (
        <div className="flex flex-col gap-2 border-t border-[var(--rule-soft)] pt-3">
          <h3 className="text-xs uppercase tracking-[0.12em] text-zinc-500">
            {t("production.food.garrison.title")} · {civName}
          </h3>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{t("production.food.garrison.mills")}</span>
              <Stepper
                value={garrison.mills} min={0} max={8}
                onChange={(n) => onGarrison({ ...garrison, mills: n })}
                minusLabel={t("production.line.moreMinus")} plusLabel={t("production.line.morePlus")}
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{t("production.food.garrison.animals")}</span>
              <Stepper
                value={garrison.animals} min={0} max={GARRISON_MAX_PER_MILL}
                onChange={(n) => onGarrison({ ...garrison, animals: n })}
                minusLabel={t("production.line.moreMinus")} plusLabel={t("production.line.morePlus")}
              />
            </div>
            <div className="text-sm tabular-nums">
              <b>{fill(t("production.food.garrison.yield"), { n: nf(garrisonFoodPerMin, 1) })}</b>
              <div className="max-w-md text-xs text-zinc-500">{t("production.food.garrison.estimate")}</div>
            </div>
          </div>
        </div>
      )}

      {result.lines.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[var(--rule-soft)] pt-2 text-sm tabular-nums">
          <span className="inline-flex items-center gap-1">
            <ResIcon res="food" />
            {fill(t("production.food.mix"), { made: nf(rowsFood + garrisonFoodPerMin), need: nf(food.demand.gross) })}
          </span>
          {food.fill && (
            <span className="font-semibold">
              {fill(t("production.food.fillLine"), {
                n: nf(food.fill.mid),
                unit: t(`production.unit.${food.unit}.${food.fill.mid === 1 ? "one" : "many"}`),
                src: fillName,
              })}
            </span>
          )}
          {food.surplus > 0.5 && (
            <span className="text-[var(--good)]">{fill(t("production.food.surplus"), { n: nf(food.surplus) })}</span>
          )}
        </div>
      )}
    </section>
  );
}
