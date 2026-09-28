"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchGraph, fetchNote } from "@/lib/api/explore-client";
import { GraphExplorer } from "@/components/GraphExplorer";
import { GraphCatalog } from "@/components/GraphCatalog";
import { pathToSlug, type NoteData } from "@/lib/api/schema";
import { relLabel } from "@/lib/graph/rels";
import { useT } from "@/lib/i18n/I18nProvider";

function GraphInner() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const path = params.get("path") ?? "";
  const [selected, setSelected] = useState<string | null>(null);

  const graphQ = useQuery({
    queryKey: ["graph", path],
    queryFn: () => fetchGraph(path),
    enabled: !!path,
  });
  const noteQ = useQuery({
    queryKey: ["note", selected],
    queryFn: () => fetchNote(selected!),
    enabled: !!selected,
  });

  const explore = (p: string) => {
    setSelected(null);
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

      <div className="grid gap-4 lg:grid-cols-[1fr_300px] 2xl:grid-cols-[1fr_380px]">
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

        <aside className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          {!selected ? (
            <p className="text-zinc-500">{t("graph.clickNode")}</p>
          ) : noteQ.isLoading ? (
            <p className="text-zinc-500">cargando…</p>
          ) : noteQ.data ? (
            <>
              <h2 className="text-base font-semibold">{noteQ.data.title}</h2>
              {noteQ.data.type && <span className="text-xs text-zinc-500">{noteQ.data.type}</span>}
              <div className="flex gap-2">
                <button
                  onClick={() => explore(selected)}
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600"
                >
                  {t("graph.explore")}
                </button>
                {selected.startsWith("civs/") && (
                  <Link
                    href={`/civs/${pathToSlug(selected).toLowerCase()}`}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs dark:border-zinc-700"
                  >
                    {t("graph.viewCard")}
                  </Link>
                )}
              </div>
              <NeighborGroups neighbors={noteQ.data.neighbors} onPick={setSelected} />
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
    <div className="flex max-h-[60vh] flex-col gap-3 overflow-auto">
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
