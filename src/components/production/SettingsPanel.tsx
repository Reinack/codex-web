"use client";

import { useI18n, useT } from "@/lib/i18n/I18nProvider";
import { civEcoBonuses, isModeled, type CivEcoBonus } from "@/lib/production/civ-eco";
import {
  AGES, RESOURCES, ageIndex, effectiveTechs, type EcoModel, type PlanResult, type Res,
} from "@/lib/production/engine";
import type { PlanState } from "@/lib/production/plan";
import { ResIcon, Segmented, fill, useNumberFormat, useSourceLabel } from "./ui";

// Mejoras que mueven la tasa de recolección, en el orden en que se investigan.
const TECH_ORDER = [
  "doublebitaxe_m", "bowsaw_m", "twomansaw_m", "goldmining_m", "goldshaft_m",
  "stonemining_m", "stoneshaft_m", "wheelbarrow", "handcart", "fishing_lines", "gillnets",
];
const EFFICIENCY_PRESETS = [100, 90, 80, 70];

export type CivModsState =
  | { status: "none" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; mods: Record<string, unknown>[] };

type Props = {
  model: EcoModel;
  state: PlanState;
  patch: (p: Partial<PlanState>) => void;
  result: PlanResult;
  civ: string;
  civName: string;
  civMods: CivModsState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SettingsPanel({ model, state, patch, result, civ, civName, civMods, open, onOpenChange }: Props) {
  const t = useT();
  const nf = useNumberFormat();
  const srcLabel = useSourceLabel();
  const techs = effectiveTechs(model, state.age, state.techs);
  const foodSources = Object.entries(model.sources).filter(([, s]) => s.resource === "food");
  const effFood = result.resources.food;
  const foodSrc = model.sources[effFood.sourceId];
  const effPct = Math.round(state.efficiency * 100);
  const presetName = EFFICIENCY_PRESETS.includes(effPct) ? t(`production.cfg.eff.${effPct}`) : "";

  const gatherTechs = TECH_ORDER.filter((id) => model.techs[id]);
  const appliesTo = (id: string): Res[] => {
    const rs = new Set<Res>();
    for (const s of Object.values(model.sources)) if (s.techs.includes(id)) rs.add(s.resource);
    return RESOURCES.filter((r) => rs.has(r));
  };
  const toggleTech = (id: string, on: boolean) =>
    patch({ techs: on ? [...techs, id] : techs.filter((x) => x !== id) });
  const setPassive = (k: keyof PlanState["passive"], n: number) =>
    patch({ passive: { ...state.passive, [k]: Math.max(0, Math.min(99, n)) } });

  const sectionTitle = "mb-1.5 text-xs uppercase tracking-[0.12em] text-zinc-500";

  return (
    <details
      className="surface px-3 open:pb-4 sm:px-4"
      open={open}
      onToggle={(e) => onOpenChange(e.currentTarget.open)}
    >
      <summary className="cursor-pointer select-none py-3 marker:text-[var(--red-500)]">
        <span className="font-display text-sm font-bold uppercase tracking-[0.12em] text-[var(--ink-700)]">
          {t("production.cfg.title")}
        </span>{" "}
        <span className="text-sm text-zinc-500">— {t("production.cfg.summary")}</span>
      </summary>

      <div className="grid gap-x-8 gap-y-5 lg:grid-cols-2">
        {/* Fuente de comida + eficiencia */}
        <div className="flex flex-col gap-4">
          <div>
            <label className={`${sectionTitle} block`} htmlFor="cfg-food">{t("production.cfg.foodSource")}</label>
            <select
              id="cfg-food"
              value={state.foodSource ?? ""}
              onChange={(e) => patch({ foodSource: e.target.value || null })}
              className="field field-select w-full"
            >
              <option value="">
                {t("production.cfg.standard")} ({srcLabel(model.defaultSources[state.age]?.food ?? "", model.sources[model.defaultSources[state.age]?.food ?? ""]?.label ?? "—")})
              </option>
              {foodSources.map(([id, s]) => <option key={id} value={id}>{srcLabel(id, s.label)}</option>)}
            </select>
            {foodSrc?.reseed && (
              <p className="mt-1 text-xs text-zinc-500">
                {fill(t("production.cfg.foodNote"), {
                  wood: foodSrc.reseed.wood,
                  cap: foodSrc.reseed.foodCapacityPerAge[state.age] ?? foodSrc.reseed.foodCapacityPerAge.feudal ?? "?",
                })}
              </p>
            )}
            {foodSrc?.perUnit && <p className="mt-1 text-xs text-zinc-500">{t("production.cfg.boatNote")}</p>}
          </div>

          <div>
            <h3 className={sectionTitle}>{t("production.cfg.efficiency")}</h3>
            <div className="flex flex-wrap items-center gap-3">
              <Segmented
                label={t("production.cfg.efficiency")}
                value={effPct}
                onChange={(v) => patch({ efficiency: v / 100 })}
                options={EFFICIENCY_PRESETS.map((p) => ({ value: p, label: `${p}%`, title: t(`production.cfg.eff.${p}`) }))}
              />
              {presetName && <span className="text-sm font-semibold">{presetName}</span>}
            </div>
            <p className="mt-1 text-xs text-zinc-500">{t("production.cfg.efficiencyHint")}</p>
          </div>

          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox" checked={state.houses} onChange={(e) => patch({ houses: e.target.checked })}
              className="mt-1 h-4 w-4 accent-[var(--red-500)]"
            />
            <span>
              <span className="font-semibold">{t("production.cfg.houses")}</span>
              <span className="block text-xs text-zinc-500">
                {fill(t("production.cfg.housesHint"), { wood: model.houseCost.wood })}
              </span>
            </span>
          </label>

          <div>
            <h3 className={sectionTitle}>{t("production.cfg.passive")}</h3>
            <div className="flex flex-wrap gap-3">
              {([["relics", "production.cfg.relics"], ["tradeCarts", "production.cfg.trade"], ["feitorias", "production.cfg.feitoria"]] as const).map(
                ([key, label]) => (
                  <label key={key} className="flex flex-col gap-1 text-xs font-semibold text-zinc-600">
                    {t(label)}
                    <input
                      type="number" inputMode="numeric" min={0} max={99} value={state.passive[key]}
                      onChange={(e) => setPassive(key, Number.parseInt(e.target.value, 10) || 0)}
                      className="field w-20 tabular-nums"
                    />
                  </label>
                ),
              )}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {fill(t("production.cfg.passiveHint"), { relic: model.passive.relic, trade: model.passive.tradeCart })}
            </p>
          </div>
        </div>

        {/* Mejoras + tasas + civ */}
        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs uppercase tracking-[0.12em] text-zinc-500">{t("production.cfg.techs")}</h3>
              {state.techs !== null && (
                <button type="button" onClick={() => patch({ techs: null })} className="text-xs font-semibold text-[var(--red-500)] underline decoration-dotted underline-offset-2 hover:decoration-solid">
                  {t("production.cfg.techsStandard")}
                </button>
              )}
            </div>
            <ul className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
              {gatherTechs.map((id) => {
                const tech = model.techs[id];
                return (
                  <li key={id}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox" checked={techs.includes(id)} onChange={(e) => toggleTech(id, e.target.checked)}
                        className="h-4 w-4 accent-[var(--red-500)]"
                      />
                      <span className="min-w-0 truncate">{tech.name} <span className="text-zinc-500 tabular-nums">+{tech.pct}%</span></span>
                      <span className="ml-auto flex shrink-0 gap-0.5" title={t("production.cfg.techsFor")}>
                        {appliesTo(id).map((r) => <ResIcon key={r} res={r} className="h-3.5 w-3.5" />)}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <p className="mt-1 text-xs text-zinc-500">{t("production.cfg.techsNote")}</p>
          </div>

          <div>
            <h3 className={sectionTitle}>{t("production.cfg.rates")}</h3>
            <table className="w-full text-sm">
              <tbody>
                {RESOURCES.map((r) => {
                  const x = result.resources[r];
                  return (
                    <tr key={r} className="border-t border-[var(--rule-soft)] first:border-t-0">
                      <td className="py-1 pr-2"><span className="inline-flex items-center gap-1"><ResIcon res={r} />{t(`production.res.${r}`)}</span></td>
                      <td className="py-1 pr-2 text-zinc-600">{srcLabel(x.sourceId, x.sourceLabel)}</td>
                      <td className="py-1 text-right tabular-nums">
                        <b>{nf(x.rate, 1)}</b>
                        <span className="text-zinc-500"> → {nf(x.rate * result.efficiency, 1)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-1 text-xs text-zinc-500">
              {fill(t("production.cfg.rateCol"), { unit: t("production.unit.villager.one") })} · {effPct}%
            </p>
          </div>

          <CivBonuses state={state} civ={civ} civName={civName} civMods={civMods} />
        </div>
      </div>
    </details>
  );
}

function CivBonuses({ state, civ, civName, civMods }: { state: PlanState; civ: string; civName: string; civMods: CivModsState }) {
  const t = useT();
  const { locale } = useI18n();
  const nf = useNumberFormat();
  const srcLabel = useSourceLabel();
  const ageIdx = ageIndex(state.age);
  const scopeLabel = (scope: unknown): string => {
    const raw = String(scope ?? "");
    const k = `production.scope.${raw}`;
    const v = t(k);
    return v === k ? raw.replace(/_/g, " ") : v;
  };
  const names = (ids: string[]) => ids.map((id) => srcLabel(id, id)).join(", ");
  // Qué hace cada bono modelado, en una línea (el texto oficial va arriba).
  const effectLine = (b: CivEcoBonus): string => {
    const e = b.effect;
    switch (e.type) {
      case "rate": {
        const pct = typeof e.pct === "number" ? e.pct : e.pct[Math.max(0, ageIdx)];
        return `${names(e.sources.slice(0, 3))}${e.sources.length > 3 ? "…" : ""} ×${nf(1 + pct / 100, 2)}`;
      }
      case "dropoff":
        return `${names(e.sources.slice(0, 3))}${e.sources.length > 3 ? "…" : ""} ×${nf(1 + e.pct / 100, 2)}`;
      case "stock": return fill(t("production.cfg.civFx.stock"), { m: nf(1 + e.pct / 100, 2) });
      case "reseed_capacity": return fill(t("production.cfg.civFx.reseedCap"), { m: nf(1 + e.pct / 100, 2) });
      case "farm_upgrades": return fill(t("production.cfg.civFx.farmUpg"), { m: nf(1 + e.pct / 100, 2) });
      case "reseed_cost": return fill(t("production.cfg.civFx.reseedCost"), { m: nf(e.mult, 2) });
      case "trickle":
        return fill(t("production.cfg.civFx.trickle"), { from: srcLabel(e.from, e.from), to: t(`production.res.${e.to}`), r: nf(e.ratio, 2) });
      case "mill_garrison": return t("production.cfg.civFx.garrison");
      default: return "";
    }
  };

  const eco = civ ? civEcoBonuses(civ) : [];
  const modeled = eco.filter(isModeled);
  const info = eco.filter((b) => !isModeled(b));
  const cost = civMods.status === "ready" ? civMods.mods.filter((m) => m.type === "cost") : [];
  const unlocks = civMods.status === "ready" ? civMods.mods.filter((m) => m.type === "unlock") : [];
  const empty = civ && modeled.length === 0 && info.length === 0 && cost.length === 0 && unlocks.length === 0;

  return (
    <div>
      <h3 className="mb-1.5 text-xs uppercase tracking-[0.12em] text-zinc-500">
        {t("production.cfg.civTitle")}{civName ? ` · ${civName}` : ""}
      </h3>
      {!civ ? (
        <p className="text-sm text-zinc-600">{t("production.cfg.civGeneric")}</p>
      ) : (
        <div className="flex flex-col gap-2 text-sm">
          {civMods.status === "error" && (
            <p className="font-semibold text-[var(--bad)]">{fill(t("production.result.pendingFail"), { civ: civName })}</p>
          )}
          {modeled.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-[var(--good)]">{t("production.cfg.civEconomy")}</div>
              <ul className="list-disc pl-5">
                {modeled.map((b) => (
                  <li key={b.id}>
                    {b.text[locale]}
                    <span className="block text-xs text-zinc-500">{effectLine(b)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {cost.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-[var(--good)]">{t("production.cfg.civApplied")}</div>
              <ul className="list-disc pl-5">
                {cost.map((m, i) => {
                  const vals = (m.valueByAge as number[]) || [];
                  const v = vals[ageIdx] ?? vals[vals.length - 1];
                  const minAge = typeof m.minAge === "number" ? m.minAge : 0;
                  const res = m.resource === "all" ? "" : ` · ${t(`production.res.${String(m.resource)}`)}`;
                  return (
                    <li key={i}>
                      {scopeLabel(m.scope)}: {fill(t("production.cfg.civCost"), { v: String(v ?? "?") })}{res}
                      {ageIdx < minAge ? ` (${t("production.line.warnAge").replace("{age}", t(`production.age.${AGES[minAge]}`))})` : ""}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {(info.length > 0 || unlocks.length > 0) && (
            <div>
              <div className="text-xs font-semibold text-zinc-500">{t("production.cfg.civNotModeled")}</div>
              <ul className="list-disc pl-5 text-zinc-600">
                {info.map((b) => <li key={b.id}>{b.text[locale]}</li>)}
                {unlocks.map((m, i) => (
                  <li key={`u${i}`}>{fill(t("production.cfg.civUnlock"), { what: Array.isArray(m.scope) ? m.scope.join(", ") : String(m.scope ?? "") })}</li>
                ))}
              </ul>
            </div>
          )}
          {empty && <p className="text-zinc-600">{t("production.cfg.civNone")}</p>}
        </div>
      )}
    </div>
  );
}
