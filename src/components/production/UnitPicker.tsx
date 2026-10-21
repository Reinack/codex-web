"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/I18nProvider";
import type { EcoItem } from "@/lib/api/schema";
import { ageIndex } from "@/lib/production/engine";
import { ItemIcon } from "./ui";

// Categorías de unidades (el edificio que las produce), en orden de despliegue.
// Las construcciones (kind "building") van juntas en un último grupo.
const UNIT_CATS = ["barracks", "archery", "stable", "siege", "dock", "monastery", "castle", "market", "tc"];
const BUILDINGS = "buildings";

type Props = {
  items: EcoItem[];
  counts: Record<string, number>;
  planAge: string;
  onAdd: (itemId: string) => void;
};

export function UnitPicker({ items, counts, planAge, onAdd }: Props) {
  const t = useT();
  const [picked, setPicked] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const planIdx = ageIndex(planAge);

  const byGroup: Record<string, EcoItem[]> = {};
  for (const it of items) {
    const g = it.kind === "building" ? BUILDINGS : it.category;
    (byGroup[g] ||= []).push(it);
  }
  for (const list of Object.values(byGroup)) {
    list.sort((a, b) => ageIndex(a.age) - ageIndex(b.age) || a.name.localeCompare(b.name));
  }
  const groups = [...UNIT_CATS, BUILDINGS].filter((g) => byGroup[g]?.length);
  if (!groups.length) return <p className="text-sm text-zinc-500">{t("production.add.noneCiv")}</p>;

  const current = picked && groups.includes(picked) ? picked : groups[0];
  const q = query.trim().toLowerCase();
  const visible = q
    ? groups.flatMap((g) => byGroup[g]).filter((it) => it.name.toLowerCase().includes(q))
    : byGroup[current];
  const label = (g: string) => t(g === BUILDINGS ? "production.cat.buildings" : `production.cat.${g}`);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("production.add.search")}
          aria-label={t("production.add.search")}
          className="field w-full sm:w-56"
        />
        <div className={`-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0 ${q ? "opacity-40" : ""}`}>
          {groups.map((g) => {
            const n = byGroup[g].reduce((acc, it) => acc + (counts[it.id] || 0), 0);
            const on = g === current && !q;
            return (
              <button
                key={g}
                type="button"
                onClick={() => { setPicked(g); setQuery(""); }}
                aria-pressed={on}
                className={`shrink-0 whitespace-nowrap border px-2.5 py-1.5 text-sm font-semibold transition-colors ${
                  on
                    ? "border-[var(--gold)] bg-[var(--red-500)] text-[var(--btn-text)]"
                    : "border-[var(--rule)] bg-[rgba(255,248,228,0.35)] hover:border-[var(--red-500)]"
                }`}
              >
                {label(g)}
                {n > 0 ? <span className="ml-1 tabular-nums opacity-80">· {n}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("production.add.none")}</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-1.5">
          {visible.map((it) => {
            const n = counts[it.id] || 0;
            const later = ageIndex(it.age) > planIdx;
            const mark =
              it.variant === "unique" ? "border-l-[3px] border-l-violet-400"
                : it.variant === "regional" ? "border-l-[3px] border-l-sky-400" : "";
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => onAdd(it.id)}
                title={it.name}
                className={`relative flex flex-col items-center gap-1 border px-1 py-1.5 text-center transition-colors ${mark} ${
                  n
                    ? "border-[var(--red-500)] bg-[rgba(138,24,18,0.1)] shadow-[0_0_0_2px_var(--ring)]"
                    : "border-[var(--rule)] bg-[rgba(255,248,228,0.3)] hover:border-[var(--red-500)]"
                } ${later ? "opacity-60" : ""}`}
              >
                <span className="flex h-10 w-10 items-center justify-center bg-zinc-950/90 ring-1 ring-black/10">
                  <ItemIcon name={it.name} imgPath={it.imgPath} className="h-8 w-8" />
                </span>
                {n > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 min-w-[1.1rem] bg-[var(--red-500)] px-1 text-[11px] font-bold leading-[1.1rem] text-[var(--btn-text)] tabular-nums">
                    {n}
                  </span>
                )}
                <span className="w-full truncate text-[11px] leading-tight">{it.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
