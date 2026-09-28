"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchGraph, fetchNote } from "@/lib/api/explore-client";
import { GraphExplorer } from "@/components/GraphExplorer";
import { GraphCatalog } from "@/components/GraphCatalog";
import { NoteArticle } from "@/components/NoteArticle";
import { pathToSlug, type NoteData } from "@/lib/api/schema";
import { relLabel } from "@/lib/graph/rels";
import { useT } from "@/lib/i18n/I18nProvider";

function GraphInner() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const path = params.get("path") ?? "";
  // La selección vale para el centro actual: al cambiar de centro (explorar, back
  // del navegador) el panel vuelve a mostrar el nodo central.
  const [pick, setPick] = useState<{ center: string; node: string } | null>(null);
  const selected = pick?.center === path ? pick.node : path || null;
  const setSelected = (node: string | null) => setPick(node ? { center: path, node } : null);
  const [tab, setTab] = useState<"article" | "links">("article");

  const graphQ = useQuery({
    queryKey: ["graph", path],
    queryFn: () => fetchGraph(path),
    enabled: !!path,
  });
  const noteQ = useQuery({
    queryKey: ["note", selected, "content"],
    queryFn: () => fetchNote(selected!, true),
    enabled: !!selected,
  });

  const explore = (p: string) => {
    router.push(`/graph?path=${encodeURIComponent(p)}`);
  };

  if (!path)
    return (
      <main className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t("graph.title")}</h1>
        <GraphCatalog onPick={explore} />
      </main>
    );

  return (
    <main className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{t("graph.title")}</h1>
          <Link href="/graph" className="text-sm hover:text-[var(--red-500)]">
            {t("graph.backToCatalog")}
          </Link>
        </div>
        <p className="text-sm text-zinc-500">
          Centro: <span className="font-mono">{path}</span> · pasá el mouse para resaltar vecinos,
          click para ver el detalle, doble click para expandir desde ese nodo.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_400px] 2xl:grid-cols-[1fr_460px]">
        <div className="relative">
          {graphQ.isFetching && (
            <span className="absolute right-3 top-3 z-10 rounded-full bg-zinc-900/80 px-2 py-1 text-xs text-white">
              cargando…
            </span>
          )}
          {graphQ.isError ? (
            <div className="flex h-[560px] items-center justify-center rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-600 dark:border-rose-900 dark:bg-rose-950/40">
              {graphQ.error instanceof Error ? graphQ.error.message : "Error al cargar el grafo."}
            </div>
          ) : graphQ.data ? (
            <GraphExplorer
              graph={graphQ.data}
              centerId={path}
              onSelect={setSelected}
              onExplore={explore}
            />
          ) : (
            <div className="h-[560px] animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
          )}
        </div>

        <aside className="surface flex min-h-[320px] flex-col gap-3 p-4 text-sm lg:h-[max(560px,calc(100vh-260px))]">
          {!selected ? (
            <p className="text-zinc-500">{t("graph.clickNode")}</p>
          ) : noteQ.isLoading ? (
            <p className="text-zinc-500">cargando…</p>
          ) : noteQ.data ? (
            <>
              <div className="flex flex-col gap-1">
                <h2 className="font-display text-lg font-bold leading-tight">{noteQ.data.title}</h2>
                <span className="text-xs text-zinc-500">
                  {[noteQ.data.type, ...(noteQ.data.aliases ?? [])].filter(Boolean).join(" · ")}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {selected !== path && (
                  <button onClick={() => explore(selected)} className="aoe-btn px-3 py-1 text-xs">
                    {t("graph.explore")}
                  </button>
                )}
                {selected.startsWith("civs/") && (
                  <Link
                    href={`/civs/${pathToSlug(selected).toLowerCase()}`}
                    className="field px-3 py-1 text-xs hover:text-[var(--red-500)]"
                  >
                    {t("graph.viewCard")}
                  </Link>
                )}
              </div>
              <div className="flex border-b border-[var(--rule)] font-display text-[12px] font-bold tracking-[0.04em]">
                {(["article", "links"] as const).map((k) => {
                  const active = (noteQ.data.sections.length ? tab : "links") === k;
                  return (
                    <button
                      key={k}
                      onClick={() => setTab(k)}
                      disabled={k === "article" && !noteQ.data.sections.length}
                      aria-pressed={active}
                      className={`-mb-px border-b-2 px-3 py-1.5 transition-colors disabled:opacity-40 ${
                        active
                          ? "border-[var(--red-500)] text-[var(--red-500)]"
                          : "border-transparent hover:text-[var(--red-500)]"
                      }`}
                    >
                      {k === "article"
                        ? t("graph.article")
                        : `${t("graph.connections")} (${noteQ.data.neighbors.length})`}
                    </button>
                  );
                })}
              </div>
              <div className="min-h-0 flex-1 overflow-auto pr-1">
                {tab === "article" && noteQ.data.sections.length ? (
                  <NoteArticle note={noteQ.data} onPick={setSelected} />
                ) : (
                  <NeighborGroups neighbors={noteQ.data.neighbors} onPick={setSelected} />
                )}
              </div>
            </>
          ) : (
            <p className="text-zinc-500">Sin datos del nodo.</p>
          )}
        </aside>
      </div>
    </main>
  );
}

// Orden de relevancia: las relaciones tipadas (counters, UU, tier…) antes que el
// genérico "relacionado con" (LINKS_TO).
const REL_ORDER = [
  "counterea a",
  "unidad única de",
  "tecnología única de",
  "se mejora a",
  "rankeada en",
  "define",
  "tiene",
];

function NeighborGroups({
  neighbors,
  onPick,
}: {
  neighbors: NoteData["neighbors"];
  onPick: (path: string) => void;
}) {
  const t = useT();
  const groups = new Map<string, NoteData["neighbors"]>();
  for (const nb of neighbors) {
    const k = relLabel(nb.rel);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(nb);
  }
  const entries = [...groups.entries()].sort((a, b) => {
    const ia = REL_ORDER.indexOf(a[0]);
    const ib = REL_ORDER.indexOf(b[0]);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

  if (entries.length === 0) {
    return <p className="text-xs text-zinc-400">{t("graph.noConnections")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {entries.map(([label, items]) => (
        <div key={label} className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            {label} ({items.length})
          </span>
          <ul className="flex flex-col gap-0.5">
            {items.map((nb) => (
              <li key={nb.path}>
                <button
                  onClick={() => onPick(nb.path)}
                  className="flex w-full items-center justify-between gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-amber-500/10"
                >
                  <span className="truncate">{nb.title}</span>
                  {nb.type && <span className="shrink-0 text-zinc-400">{nb.type}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}


export default function GraphPage() {
  return (
    <Suspense fallback={<div className="h-[560px] animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />}>
      <GraphInner />
    </Suspense>
  );
}
