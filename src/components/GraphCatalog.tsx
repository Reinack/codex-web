"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCatalog, fetchCatalogCounts } from "@/lib/api/explore-client";
import type { CatalogItem } from "@/lib/api/schema";
import { useT } from "@/lib/i18n/I18nProvider";

// Categorías del vault (carpeta = n.type), en orden de interés para explorar.
const CATEGORIES = [
  "units",
  "technologies",
  "buildings",
  "civs",
  "strategies",
  "maps",
  "matchups",
  "meta",
] as const;

// Subcarpetas del vault → etiqueta legible ("archery" → "Archery", "unique-techs" → "Unique techs").
function groupLabel(g: string | null): string {
  if (!g) return "General";
  const s = g.replace(/[-_]/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function GraphCatalog({ onPick }: { onPick: (path: string) => void }) {
  const t = useT();
  const [type, setType] = useState<string>("units");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"alpha" | "degree">("alpha");
  // Celular: los grupos arrancan plegados (con filtro activo se abren solos).
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (g: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(g)) n.delete(g);
      else n.add(g);
      return n;
    });

  const countsQ = useQuery({ queryKey: ["catalog-counts"], queryFn: fetchCatalogCounts });
  const itemsQ = useQuery({ queryKey: ["catalog", type], queryFn: () => fetchCatalog(type) });

  const counts = useMemo(
    () => new Map(countsQ.data?.map((c) => [c.type, c.count]) ?? []),
    [countsQ.data],
  );

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const items = (itemsQ.data ?? []).filter(
      (it) =>
        !needle ||
        it.title.toLowerCase().includes(needle) ||
        (it.aliases ?? []).some((a) => a.toLowerCase().includes(needle)),
    );
    const sorted = [...items].sort((a, b) =>
      sort === "degree" ? b.degree - a.degree : a.title.localeCompare(b.title),
    );
    const map = new Map<string, CatalogItem[]>();
    for (const it of sorted) {
      const k = groupLabel(it.group);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    // "General" (notas sueltas en la raíz de la categoría) va al final.
    return [...map.entries()].sort((a, b) =>
      a[0] === "General" ? 1 : b[0] === "General" ? -1 : a[0].localeCompare(b[0]),
    );
  }, [itemsQ.data, q, sort]);

  const maxDegree = Math.max(1, ...(itemsQ.data ?? []).map((it) => it.degree));

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">{t("graph.catalog")}</h2>
        <p className="text-sm text-zinc-500">{t("graph.catalogIntro")}</p>
      </header>

      {/* Pestañas de categoría con conteo */}
      <nav className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 font-display text-[13px] font-semibold tracking-[0.03em] md:flex-wrap md:overflow-visible">
        {CATEGORIES.map((c) => {
          const active = c === type;
          return (
            <button
              key={c}
              onClick={() => {
                setType(c);
                setQ("");
              }}
              aria-pressed={active}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap border px-3 py-1.5 transition-colors ${
                active
                  ? "border-[var(--gold)] bg-[linear-gradient(180deg,#9a1c14,#6e120c)] text-[#f3e6c8]"
                  : "surface surface-hover"
              }`}
            >
              {t(`cat.${c}`)}
              {counts.has(c) && (
                <span className={`text-[11px] ${active ? "text-[#e9cf8f]" : "text-zinc-500"}`}>
                  {counts.get(c)}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("graph.filter")}
          className="field w-full min-w-0 px-3 py-1.5 text-sm sm:w-auto sm:min-w-[220px] sm:flex-none"
        />
        <div className="flex border border-[var(--rule)] text-xs">
          {(["alpha", "degree"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              aria-pressed={sort === s}
              className={`px-2.5 py-1.5 ${
                sort === s ? "bg-[var(--red-500)] text-[#f3e6c8]" : "hover:bg-[rgba(138,24,18,0.1)]"
              }`}
            >
              {t(s === "alpha" ? "graph.sortAlpha" : "graph.sortDegree")}
            </button>
          ))}
        </div>
        {itemsQ.data && (
          <span className="text-xs text-zinc-500">
            {groups.reduce((n, [, items]) => n + items.length, 0)} / {itemsQ.data.length}
          </span>
        )}
      </div>

      {itemsQ.isError ? (
        <p className="border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700">
          {t("graph.catalogError")}
        </p>
      ) : itemsQ.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="surface h-40 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {groups.map(([label, items]) => (
            <div key={label} className="surface flex min-w-0 flex-col gap-1.5 p-3">
              <button
                onClick={() => toggle(label)}
                aria-expanded={open.has(label) || !!q}
                className="flex items-center justify-between text-left font-display text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--red-500)] md:pointer-events-none"
              >
                <span>
                  {label} <span className="text-zinc-500">({items.length})</span>
                </span>
                <span className="text-zinc-500 md:hidden">{open.has(label) || q ? "−" : "+"}</span>
              </button>
              <ul className={`${open.has(label) || q ? "flex" : "hidden md:flex"} max-h-72 flex-col overflow-auto`}>
                {items.map((it) => (
                  <li key={it.path}>
                    <button
                      onClick={() => onPick(it.path)}
                      title={it.aliases?.join(" · ") || undefined}
                      className="group flex w-full items-center gap-2 px-1.5 py-2 text-left text-sm hover:bg-[rgba(138,24,18,0.08)] md:py-1"
                    >
                      <span className="flex-1 truncate group-hover:text-[var(--red-500)]">
                        {it.title}
                      </span>
                      {/* barra de conectividad: cuántas aristas tiene en el grafo */}
                      <span
                        className="h-1 shrink-0 bg-[var(--gold)] opacity-70"
                        style={{ width: `${Math.max(4, (it.degree / maxDegree) * 48)}px` }}
                        aria-hidden
                      />
                      <span className="w-8 shrink-0 text-right text-[11px] text-zinc-500">
                        {it.degree}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
