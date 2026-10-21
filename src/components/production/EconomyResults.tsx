"use client";

import { useT } from "@/lib/i18n/I18nProvider";
import { RESOURCES, type PlanResult, type Res, type ResourceResult, type SustainResult } from "@/lib/production/engine";
import { RES_COLOR, ResIcon, fill, useNumberFormat, useSourceLabel } from "./ui";

export type Assumption = { id: string; label: string; warn?: boolean };

type Props = {
  result: PlanResult;
  sustain: SustainResult | null;
  empty: boolean;
  assumptions: Assumption[];
  onEditAssumptions: () => void;
  sectionRef: (el: HTMLElement | null) => void;
};

export function EconomyResults({ result, sustain, empty, assumptions, onEditAssumptions, sectionRef }: Props) {
  const t = useT();
  const nf = useNumberFormat();
  const { total, bottleneck } = result;
  const hasBoats = RESOURCES.some((r) => result.resources[r].boats > 0 || (result.resources[r].unit === "boat" && result.resources[r].net > 0));
  const unreachable = result.unreachable;

  return (
    <section ref={sectionRef} aria-labelledby="res-title" className="surface flex scroll-mt-24 flex-col gap-4 p-3 sm:p-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h2 id="res-title" className="mb-2 text-sm uppercase tracking-[0.12em] text-[var(--ink-700)]">{t("production.result.title")}</h2>
          {empty ? (
            <p className="text-zinc-500">{t("production.result.empty")}</p>
          ) : (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span className="text-5xl font-bold leading-none tabular-nums text-[var(--red-500)]" title={t("production.result.rangeHint")}>
                {unreachable.length ? "?" : `≈ ${nf(total.mid)}`}
              </span>
              <span className="text-base font-semibold">{t("production.result.total")}</span>
              {!unreachable.length && total.low !== total.high && (
                <span className="text-sm text-zinc-500" title={t("production.result.rangeHint")}>
                  {fill(t("production.result.range"), { low: nf(total.low), high: nf(total.high) })}
                </span>
              )}
            </div>
          )}
        </div>
        {!empty && bottleneck && (
          <div className="flex items-center gap-2 border border-[var(--gold)] bg-[#1b0f07] px-3 py-1.5 text-[var(--on-dark)]">
            <span className="text-xs uppercase tracking-wide text-[var(--on-dark-dim)]">{t("production.result.bottleneck")}</span>
            <ResIcon res={bottleneck} className="h-4 w-4" />
            <span className="font-display text-sm font-bold text-[var(--gold-text)]">{t(`production.res.${bottleneck}`)}</span>
          </div>
        )}
      </div>

      {!empty && unreachable.length === 0 && <Distribution result={result} />}

      {!empty && (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {RESOURCES.map((r) => (
            <ResourceCard key={r} r={result.resources[r]} isBottleneck={bottleneck === r} sustain={sustain} />
          ))}
        </div>
      )}

      {hasBoats && <p className="text-xs text-zinc-500">{t("production.result.boatsNote")}</p>}

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="font-semibold uppercase tracking-wide text-zinc-500">{t("production.result.assumptions")}</span>
        {assumptions.map((a) => (
          <span
            key={a.id}
            className={`border px-2 py-0.5 ${a.warn ? "border-[var(--bad)] text-[var(--bad)]" : "border-[var(--rule)] text-zinc-600"}`}
          >
            {a.label}
          </span>
        ))}
        <button type="button" onClick={onEditAssumptions} className="font-semibold text-[var(--red-500)] underline decoration-dotted underline-offset-2 hover:decoration-solid">
          {t("production.result.change")} →
        </button>
      </div>

      {!empty && <Breakdown result={result} />}
    </section>
  );
}

function Distribution({ result }: { result: PlanResult }) {
  const t = useT();
  const parts = RESOURCES.filter((r) => result.resources[r].share > 0);
  if (!parts.length) return null;
  return (
    <div className="flex flex-col gap-1" role="img" aria-label={`${t("production.result.distribution")}: ${parts.map((r) => `${t(`production.res.${r}`)} ${Math.round(result.resources[r].share * 100)}%`).join(", ")}`}>
      <div className="flex h-5 w-full overflow-hidden border border-[var(--rule)]">
        {parts.map((r) => (
          <span
            key={r}
            style={{ width: `${result.resources[r].share * 100}%`, background: RES_COLOR[r] }}
            className="flex items-center justify-center overflow-hidden text-[11px] font-bold text-white/95"
          >
            {result.resources[r].share >= 0.12 ? `${Math.round(result.resources[r].share * 100)}%` : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

function ResourceCard({ r, isBottleneck, sustain }: { r: ResourceResult; isBottleneck: boolean; sustain: SustainResult | null }) {
  const t = useT();
  const nf = useNumberFormat();
  const srcLabel = useSourceLabel();
  const sourceName = srcLabel(r.sourceId, r.sourceLabel);
  const unitWord = t(`production.unit.${r.res === "food" ? "villager" : r.unit}.${r.needed?.mid === 1 ? "one" : "many"}`);
  const rowVillagers = r.rows.filter((x) => x.unit === "villager").reduce((sum, x) => sum + x.count, 0);
  const idle = r.demand.gross <= 0.05;
  const s = sustain?.perResource[r.res];
  return (
    <div
      className={`flex min-w-0 flex-col gap-1 border p-2.5 ${
        isBottleneck ? "border-[var(--gold)] shadow-[inset_0_0_0_1px_var(--gold)]" : "border-[var(--rule)]"
      } bg-[rgba(255,248,228,0.3)] ${idle ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-1.5">
        <span className="h-3 w-1 shrink-0" style={{ background: RES_COLOR[r.res] }} />
        <ResIcon res={r.res} />
        <span className="font-display text-xs font-bold uppercase tracking-wide">{t(`production.res.${r.res}`)}</span>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-1.5">
        {r.needed ? (
          <>
            <span className="text-3xl font-bold leading-none tabular-nums">{nf(r.needed.mid)}</span>
            <span className="text-sm text-zinc-600">{unitWord}</span>
          </>
        ) : (
          <span className="text-sm font-semibold text-[var(--bad)]">{t("production.result.unreachable")}</span>
        )}
      </div>
      {r.needed && r.needed.low !== r.needed.high && (
        <div className="text-xs tabular-nums text-zinc-500">
          {fill(t("production.result.range"), { low: nf(r.needed.low), high: nf(r.needed.high) })}
        </div>
      )}
      <div className="mt-0.5 text-xs text-zinc-600 tabular-nums">
        {idle ? t("production.result.noDemand") : <>{t("production.result.demand")}: <b>{nf(r.demand.gross)}</b>{t("production.result.perMin")}</>}
      </div>
      {r.res === "food" && r.rows.length > 0 && r.fill && (
        <div className="text-xs tabular-nums text-zinc-600">
          {fill(t("production.result.inMix"), { n: nf(rowVillagers), m: nf(r.unit === "villager" ? r.fill.mid : 0), src: sourceName })}
        </div>
      )}
      {r.boats > 0 && <div className="text-xs font-semibold tabular-nums">{fill(t("production.result.boatsPlus"), { n: nf(r.boats) })}</div>}
      <div className="truncate text-xs text-zinc-500" title={sourceName}>
        {sourceName} · {fill(t("production.result.rate"), { rate: nf(r.rate, 1), unit: t(`production.unit.${r.unit}.one`) })}
        {r.civMult !== 1 && <span className="ml-1 font-semibold text-[var(--good)]">×{nf(r.civMult, 2)}</span>}
      </div>
      {r.surplus > 0.5 && <div className="text-xs text-[var(--good)]">{fill(t("production.food.surplus"), { n: nf(r.surplus) })}</div>}
      {s && !idle && (
        <div
          className={`mt-1 px-1.5 py-0.5 text-xs font-bold tabular-nums ${
            s.status === "ok" ? "bg-[var(--good)] text-[var(--btn-text)]" : "bg-[var(--bad)] text-[var(--btn-text)]"
          }`}
        >
          {fill(t(r.res === "food" ? "production.sus.have.labelFill" : "production.sus.have.label"), { n: nf(s.have), need: s.need ? nf(s.need.mid) : "—", src: sourceName })}
        </div>
      )}
    </div>
  );
}

function Breakdown({ result }: { result: PlanResult }) {
  const t = useT();
  const nf = useNumberFormat();
  const rows = RESOURCES.filter((r) => result.resources[r].demand.gross > 0.05);
  if (!rows.length) return null;
  const th = "px-2 py-1 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-500";
  const td = "px-2 py-1 text-right tabular-nums";
  const cell = (v: number) => (v > 0.05 ? nf(v, 1) : "–");
  return (
    <details className="group border-t border-[var(--rule-soft)] pt-2">
      <summary className="cursor-pointer select-none text-sm font-semibold text-[var(--red-500)] marker:text-[var(--red-500)]">
        {t("production.result.how")}
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr>
              <th className={`${th} !text-left`} />
              <th className={th}>{t("production.result.direct")}</th>
              <th className={th}>{t("production.result.houses")}</th>
              <th className={th}>{t("production.result.reseed")}</th>
              <th className={th}>{t("production.result.passive")}</th>
              <th className={th}>{t("production.result.net")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const x = result.resources[r];
              return (
                <tr key={r} className="border-t border-[var(--rule-soft)]">
                  <td className="px-2 py-1"><span className="inline-flex items-center gap-1"><ResIcon res={r as Res} className="h-3.5 w-3.5" />{t(`production.res.${r}`)}</span></td>
                  <td className={td}>{cell(x.demand.direct)}</td>
                  <td className={td}>{cell(x.demand.houses)}</td>
                  <td className={td}>{cell(x.demand.reseed)}</td>
                  <td className={td}>{x.passive > 0.05 ? `−${nf(x.passive, 1)}` : "–"}</td>
                  <td className={`${td} font-bold`}>{nf(x.net, 1)}{t("production.result.perMin")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-zinc-500">{t("production.result.formula")}</p>
    </details>
  );
}
