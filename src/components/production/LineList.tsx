"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/I18nProvider";
import { fetchSearch } from "@/lib/api/explore-client";
import type { EcoItem } from "@/lib/api/schema";
import { ACTIVITY_STEPS, RESOURCES, type LineResult, type PlanLine } from "@/lib/production/engine";
import { ItemIcon, ResIcon, Segmented, Stepper, fill, smallBtn, useNumberFormat } from "./ui";

export type LineRow = {
  line: PlanLine;
  item: EcoItem;
  result?: LineResult;
  /** Nombre de la edad en que se desbloquea, si el plan está en una anterior. */
  warnAge?: string;
  /** Nombre de la civ si no puede producir el ítem. */
  warnCiv?: string;
  /** Edificios que la economía sostiene (modo "¿puedo sostener?"). */
  sustained?: number;
};

type Props = {
  rows: LineRow[];
  showPriority: boolean;
  onChange: (key: string, patch: Partial<PlanLine>) => void;
  onRemove: (key: string) => void;
  onDuplicate: (key: string) => void;
  onMove: (key: string, dir: -1 | 1) => void;
};

export function LineList({ rows, showPriority, onChange, onRemove, onDuplicate, onMove }: Props) {
  const t = useT();
  const nf = useNumberFormat();
  return (
    <ul className="flex flex-col gap-2">
      {rows.map(({ line, item, result, warnAge, warnCiv, sustained }, i) => {
        const cost = result?.cost ?? item.cost;
        const isUnit = item.kind === "unit";
        return (
          <li
            key={line.key}
            className="surface flex flex-wrap items-center gap-x-5 gap-y-2.5 p-2.5 sm:p-3"
          >
            <div className="flex min-w-[12.5rem] flex-1 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-zinc-950/90 ring-1 ring-black/10">
                <ItemIcon name={item.name} imgPath={item.imgPath} className="h-9 w-9" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2">
                  <span className="truncate font-semibold">{item.name}</span>
                  <SheetLink name={item.name} />
                </div>
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-zinc-500">
                  <span>{t(`production.cat.${item.category}`)}</span>
                  {RESOURCES.filter((r) => cost[r]).map((r) => (
                    <span key={r} className="inline-flex items-center gap-0.5 tabular-nums">
                      {cost[r]}<ResIcon res={r} className="inline-block h-3 w-3" />
                    </span>
                  ))}
                  <span className="tabular-nums">· {item.time}s</span>
                </div>
                {(warnAge || warnCiv) && (
                  <div className="mt-0.5 text-xs font-semibold text-[var(--bad)]">
                    {warnCiv ? fill(t("production.line.warnCiv"), { civ: warnCiv }) : null}
                    {warnCiv && warnAge ? " · " : null}
                    {warnAge ? fill(t("production.line.warnAge"), { age: warnAge }) : null}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                {t(isUnit ? "production.line.buildings" : "production.line.builders")}
              </span>
              <Stepper
                value={line.buildings}
                onChange={(n) => onChange(line.key, { buildings: n })}
                max={30}
                minusLabel={t("production.line.moreMinus")}
                plusLabel={t("production.line.morePlus")}
              />
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500" title={t("production.line.activityHint")}>
                {t("production.line.activity")}
              </span>
              <Segmented
                label={t("production.line.activity")}
                value={line.activity}
                onChange={(v) => onChange(line.key, { activity: v })}
                options={ACTIVITY_STEPS.map((s) => ({ value: s as number, label: `${s}%` }))}
              />
            </div>

            <div className="flex min-w-[8rem] flex-col gap-0.5 text-sm tabular-nums">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                {t("production.line.perMin")}
              </span>
              {result ? (
                <span className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                  {RESOURCES.filter((r) => result.drainPerMin[r] > 0.05).map((r) => (
                    <span key={r} className="inline-flex items-center gap-1">
                      <ResIcon res={r} className="inline-block h-3.5 w-3.5" />
                      {nf(result.drainPerMin[r])}
                    </span>
                  ))}
                  {isUnit && (
                    <span className="text-xs text-zinc-500">· {nf(result.perMin, 1)} {t("production.line.units")}</span>
                  )}
                </span>
              ) : <span className="text-zinc-400">—</span>}
            </div>

            {sustained !== undefined && (
              <span
                className={`px-2 py-1 text-xs font-bold tabular-nums ${
                  sustained >= line.buildings
                    ? "bg-[var(--good)] text-[var(--btn-text)]"
                    : sustained > 0
                      ? "bg-[var(--gold)] text-[var(--ink-900)]"
                      : "bg-[var(--bad)] text-[var(--btn-text)]"
                }`}
              >
                {fill(t("production.sus.sustains"), { s: sustained, b: line.buildings })}
              </span>
            )}

            <div className="ml-auto flex items-center">
              {showPriority && (
                <>
                  <button type="button" className={smallBtn} disabled={i === 0} onClick={() => onMove(line.key, -1)} aria-label={t("production.line.up")} title={t("production.line.up")}>▲</button>
                  <button type="button" className={smallBtn} disabled={i === rows.length - 1} onClick={() => onMove(line.key, 1)} aria-label={t("production.line.down")} title={t("production.line.down")}>▼</button>
                </>
              )}
              <button type="button" className={smallBtn} onClick={() => onDuplicate(line.key)} aria-label={t("production.line.duplicate")} title={t("production.line.duplicate")}>⧉</button>
              <button type="button" className={smallBtn} onClick={() => onRemove(line.key)} aria-label={t("production.line.remove")} title={t("production.line.remove")}>✕</button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// Enlace a la ficha del Codex: se resuelve al hacer clic buscando el nombre en el
// grafo (el id del modelo de producción no es la ruta de la nota).
function SheetLink({ name }: { name: string }) {
  const t = useT();
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "missing">("idle");
  const go = async () => {
    setState("loading");
    try {
      const results = await fetchSearch(name);
      const isSheet = (type: string | null) => type === "units" || type === "buildings";
      const norm = (s: string) => s.trim().toLowerCase();
      const hit =
        results.find((r) => isSheet(r.type) && norm(r.title) === norm(name)) ??
        results.find((r) => isSheet(r.type));
      if (hit) {
        router.push(`/graph?path=${encodeURIComponent(hit.path)}`);
        return;
      }
    } catch {
      /* cae al estado "sin ficha" */
    }
    setState("missing");
  };
  return (
    <button
      type="button"
      onClick={go}
      disabled={state !== "idle"}
      className="text-xs font-semibold text-[var(--red-500)] underline decoration-dotted underline-offset-2 hover:decoration-solid disabled:no-underline disabled:opacity-60"
    >
      {state === "missing" ? t("production.line.sheetMissing") : state === "loading" ? "…" : `${t("production.line.sheet")} ↗`}
    </button>
  );
}
