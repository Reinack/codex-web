"use client";

// Comercio por distancia y bonus de equipo de reliquias/trade (market.md): el oro por viaje crece casi con el
// cuadrado de la distancia entre Markets. Sin distancia se usa el valor plano por cart.
import { useT } from "@/lib/i18n/I18nProvider";
import { GkEmblem } from "@/lib/gamekit/GameKit";
import { tradeStats, type EcoModel } from "@/lib/production/engine";
import type { PlanState } from "@/lib/production/plan";
import { fill, useNumberFormat } from "./ui";

// Civ cuyo emblema acompaña a cada bonus (los ids vienen de eco-model.json del backend).
const MOD_CIV: Record<string, string> = {
  aztec_team: "aztecs", burgundian_team: "burgundians", spanish_team: "spanish", bengali_team: "bengalis", grand_trunk_road: "hindustanis",
};

export function CommercePanel({ model, state, patch }: { model: EcoModel; state: PlanState; patch: (p: Partial<PlanState>) => void }) {
  const t = useT();
  const nf = useNumberFormat();
  const trade = model.passive.trade;
  if (!trade) return null;
  const c = state.commerce;
  const set = (p: Partial<PlanState["commerce"]>) => patch({ commerce: { ...c, ...p } });
  const size = trade.mapSizes[c.map] ?? trade.mapSizes.medium ?? 168;
  const modIds = [...new Set([...Object.keys(model.passive.relicMods), ...Object.keys(trade.mods)])];
  const label = (id: string) => model.passive.relicMods[id]?.label ?? trade.mods[id]?.label ?? id;
  const tradeMods = c.mods.filter((id) => trade.mods[id]);
  const st = c.distance > 0 ? tradeStats(trade, { map: c.map, distance: c.distance, caravan: c.caravan, mods: tradeMods }) : null;

  return (
    <div className="mt-3 border-t border-[var(--rule-soft)] pt-3">
      <h4 className="mb-1.5 text-xs uppercase tracking-[0.12em] text-zinc-500">{t("production.cfg.commerce")}</h4>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-600">
          {t("production.cfg.commerce.map")}
          <select className="field" value={c.map} onChange={(e) => set({ map: e.target.value })}>
            {Object.entries(trade.mapSizes).map(([k, v]) => <option key={k} value={k}>{k} ({v})</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-600">
          {t("production.cfg.commerce.distance")}
          <input type="number" inputMode="numeric" min={0} max={700} value={c.distance} className="field w-24 tabular-nums"
            onChange={(e) => set({ distance: Math.max(0, Math.min(700, Number.parseInt(e.target.value, 10) || 0)) })} />
        </label>
        <button type="button" className="aoe-btn" onClick={() => set({ distance: Math.round(size * Math.SQRT2) })}>{t("production.cfg.commerce.diag")}</button>
        <button type="button" className="aoe-btn" title={t("production.cfg.commerce.edgeHint")} onClick={() => set({ distance: Math.round(size * 0.76) })}>{t("production.cfg.commerce.edge")}</button>
        <label className="flex items-center gap-1.5 pb-1.5 text-xs font-semibold text-zinc-600">
          <input type="checkbox" checked={c.caravan} onChange={(e) => set({ caravan: e.target.checked })} /> {t("production.cfg.commerce.caravan")}
        </label>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {modIds.map((id) => (
          <label key={id} className="flex items-center gap-1.5 text-xs text-zinc-600">
            <input type="checkbox" checked={c.mods.includes(id)} onChange={(e) => set({ mods: e.target.checked ? [...c.mods, id] : c.mods.filter((x) => x !== id) })} />
            <GkEmblem slug={MOD_CIV[id]} size="s" />{label(id)}
          </label>
        ))}
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        {st
          ? fill(t("production.cfg.commerce.summary"), { trip: nf(st.goldPerTrip), sec: nf(st.tripSec), cart: nf(st.perCart.gold, 1) })
          : t("production.cfg.commerce.flat")}
      </p>
    </div>
  );
}
