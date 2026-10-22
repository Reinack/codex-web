"use client";

import { useT } from "@/lib/i18n/I18nProvider";
import {
  RESOURCES, type Have, type PlanResult, type Relief, type Res, type SustainResult,
} from "@/lib/production/engine";
import { ResIcon, fill, useNumberFormat, useSourceLabel } from "./ui";

type Props = {
  on: boolean;
  onToggle: (on: boolean) => void;
  have: Have;
  onHave: (r: Res, n: number) => void;
  onFill: () => void;
  result: PlanResult;
  sustain: SustainResult | null;
  empty: boolean;
  onApplyRelief: (r: Relief) => void;
};

export function SustainPanel({ on, onToggle, have, onHave, onFill, result, sustain, empty, onApplyRelief }: Props) {
  const t = useT();
  const nf = useNumberFormat();
  const srcLabel = useSourceLabel();
  const unitWord = (r: Res, n: number) => t(`production.unit.${result.resources[r].unit}.${n === 1 ? "one" : "many"}`);

  return (
    <section aria-labelledby="sus-title" className="surface flex flex-col gap-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="sus-title" className="text-sm uppercase tracking-[0.12em] text-[var(--ink-700)]">{t("production.sus.title")}</h2>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={() => onToggle(!on)}
          className={`inline-flex items-center gap-2 border px-3 py-1.5 text-sm font-semibold transition-colors ${
            on
              ? "border-[var(--gold)] bg-[var(--red-500)] text-[var(--btn-text)]"
              : "border-[var(--rule)] bg-[rgba(255,248,228,0.4)] hover:border-[var(--red-500)]"
          }`}
        >
          <span aria-hidden className={`h-2.5 w-2.5 ${on ? "bg-[var(--gold-hi)]" : "bg-zinc-400"}`} />
          {t(on ? "production.sus.toggleOn" : "production.sus.toggleOff")}
        </button>
      </div>

      {!on ? (
        <p className="text-sm text-zinc-600">{t("production.sus.hint")}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
            {RESOURCES.map((r) => {
              const boat = result.resources[r].unit === "boat";
              return (
                <label key={r} className="flex min-w-0 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <span className="flex items-center gap-1 truncate">
                    <ResIcon res={r} />
                    {r === "food"
                      ? fill(t("production.sus.haveFill"), { src: srcLabel(result.resources.food.sourceId, result.resources.food.sourceLabel) })
                      : fill(t(boat ? "production.sus.haveBoats" : "production.sus.have"), { res: t(`production.res.${r}`) })}
                  </span>
                  <input
                    type="number" inputMode="numeric" min={0} max={999}
                    value={have[r]}
                    onChange={(e) => onHave(r, Math.max(0, Math.min(999, Number.parseInt(e.target.value, 10) || 0)))}
                    className="field w-full text-base tabular-nums"
                  />
                </label>
              );
            })}
            <button type="button" onClick={onFill} disabled={empty} className="aoe-btn col-span-2 sm:col-span-1">
              {t("production.sus.fill")}
            </button>
          </div>

          {empty || !sustain ? (
            <p className="text-sm text-zinc-600">{t("production.sus.empty")}</p>
          ) : (
            <Verdict
              sustain={sustain} nf={nf} unitWord={unitWord} onApplyRelief={onApplyRelief}
            />
          )}
        </>
      )}
    </section>
  );
}

function Verdict({
  sustain, nf, unitWord, onApplyRelief,
}: {
  sustain: SustainResult;
  nf: (v: number, d?: number) => string;
  unitWord: (r: Res, n: number) => string;
  onApplyRelief: (r: Relief) => void;
}) {
  const t = useT();
  const pct = Math.round(Math.min(sustain.coverage, 7.99) * 100);
  const margin = Math.round((sustain.coverage - 1) * 100);
  const short = RESOURCES.filter((r) => sustain.perResource[r].status === "short");
  const spare = RESOURCES.filter((r) => sustain.perResource[r].spare >= 1 && sustain.perResource[r].need && sustain.perResource[r].need!.mid > 0);
  const lineName = (key: string) => sustain.perLine.find((l) => l.key === key)?.name ?? "";

  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <div
        className={`flex flex-col gap-0.5 border-l-4 px-3 py-2 ${
          sustain.ok ? "border-[var(--good)] bg-[rgba(61,107,23,0.12)]" : "border-[var(--bad)] bg-[rgba(155,43,26,0.1)]"
        }`}
      >
        <span className="text-base font-bold">{t(sustain.ok ? "production.sus.ok" : "production.sus.no")}</span>
        {!sustain.ok && <span className="text-sm">{fill(t("production.sus.coverage"), { pct })}</span>}
        {sustain.ok && sustain.coverage < 8 && margin >= 10 && (
          <span className="text-sm">{fill(t("production.sus.okSpare"), { pct: margin })}</span>
        )}
      </div>

      {(short.length > 0 || spare.length > 0) && (
        <ul className="flex flex-col gap-1 text-sm">
          {short.map((r) => {
            const s = sustain.perResource[r];
            if (!s.need) {
              return (
                <li key={r} className="flex items-center gap-1.5 font-semibold text-[var(--bad)]">
                  <ResIcon res={r} />{fill(t("production.sus.unreachable"), { res: t(`production.res.${r}`) })}
                </li>
              );
            }
            const unit = unitWord(r, s.missing);
            return (
              <li key={r} className="flex flex-wrap items-center gap-x-1.5">
                <ResIcon res={r} />
                <b className="text-[var(--bad)]">
                  {fill(t(s.missing === 1 ? "production.sus.missing.one" : "production.sus.missing.many"), {
                    n: nf(s.missing), unit, res: t(`production.res.${r}`).toLowerCase(),
                  })}
                </b>
                {s.missingBestCase !== s.missing && (
                  <span className="text-xs text-zinc-500">
                    ({fill(t("production.sus.bestCase"), { n: nf(s.missingBestCase) })})
                  </span>
                )}
              </li>
            );
          })}
          {spare.map((r) => (
            <li key={r} className="flex items-center gap-1.5 text-[var(--good)]">
              <ResIcon res={r} />
              {fill(t("production.sus.spare"), { n: nf(sustain.perResource[r].spare), res: t(`production.res.${r}`).toLowerCase() })}
            </li>
          ))}
        </ul>
      )}

      {!sustain.ok && sustain.perLine.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-xs uppercase tracking-[0.12em] text-zinc-500">{t("production.sus.byPriority")}</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {sustain.perLine.map((l) => (
              <li key={l.key} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate">{l.name}</span>
                <span className="h-2 w-24 shrink-0 overflow-hidden border border-[var(--rule)] bg-[rgba(0,0,0,0.06)]" aria-hidden>
                  <span className="block h-full bg-[var(--gold)]" style={{ width: `${(l.sustained / l.buildings) * 100}%` }} />
                </span>
                <span className="w-28 shrink-0 text-right font-semibold tabular-nums">
                  {fill(t("production.sus.sustains"), { s: l.sustained, b: l.buildings })}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-500">{t("production.sus.priorityHint")}</p>
        </div>
      )}

      {sustain.relief.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs uppercase tracking-[0.12em] text-zinc-500">{t("production.sus.relief")}</h3>
          <ul className="flex flex-col gap-1.5 text-sm">
            {sustain.relief.map((r, i) => {
              const name = lineName(r.lineKey) || r.name;
              const text = fill(
                t(r.action.type === "activity" ? "production.sus.reliefActivity" : "production.sus.reliefBuilding"),
                {
                  name, to: r.action.type === "activity" ? r.action.to : 0, n: nf(r.freed, 1),
                  res: t(`production.res.${r.res}`).toLowerCase(),
                },
              );
              return (
                <li key={`${r.lineKey}-${r.res}-${i}`} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <ResIcon res={r.res} />
                  <span className="min-w-0 flex-1">
                    {text}{" "}
                    <span className={r.covers ? "font-semibold text-[var(--good)]" : "text-zinc-500"}>
                      — {t(r.covers ? "production.sus.covers" : "production.sus.notEnough")}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onApplyRelief(r)}
                    className="border border-[var(--rule)] bg-[rgba(255,248,228,0.5)] px-2 py-1 text-xs font-semibold hover:border-[var(--red-500)] hover:text-[var(--red-500)]"
                  >
                    {t("production.sus.apply")}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
