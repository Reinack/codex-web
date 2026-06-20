"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchGraph, fetchNote, fetchCivsClient } from "@/lib/api/explore-client";
import { GraphExplorer } from "@/components/GraphExplorer";
import { pathToSlug } from "@/lib/api/schema";

function GraphInner() {
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

  if (!path) return <CivPicker onPick={explore} />;

  return (
    <main className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Explorador del grafo</h1>
        <p className="text-sm text-zinc-500">
          Centro: <span className="font-mono">{path}</span> · click en un nodo para ver sus
          conexiones y seguir explorando.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
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
            <GraphExplorer graph={graphQ.data} centerId={path} onSelect={setSelected} />
          ) : (
            <div className="h-[560px] animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
          )}
        </div>

        <aside className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          {!selected ? (
            <p className="text-zinc-500">Clickeá un nodo para ver el detalle.</p>
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
                  Explorar
                </button>
                {selected.startsWith("civs/") && (
                  <Link
                    href={`/civs/${pathToSlug(selected).toLowerCase()}`}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs dark:border-zinc-700"
                  >
                    Ver ficha
                  </Link>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-zinc-500">
                  Conexiones ({noteQ.data.neighbors.length})
                </span>
                <ul className="flex max-h-72 flex-col gap-1 overflow-auto">
                  {noteQ.data.neighbors.map((nb) => (
                    <li key={nb.path}>
                      <button
                        onClick={() => setSelected(nb.path)}
                        className="flex w-full items-center justify-between gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-amber-500/10"
                      >
                        <span className="truncate">{nb.title}</span>
                        <span className="shrink-0 text-zinc-400">{nb.rel}</span>
                      </button>
                    </li>
                  ))}
                </ul>
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

function CivPicker({ onPick }: { onPick: (path: string) => void }) {
  const { data, isLoading } = useQuery({ queryKey: ["civs"], queryFn: fetchCivsClient });
  return (
    <main className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Explorador del grafo</h1>
        <p className="text-sm text-zinc-500">
          Elegí una civilización para empezar a explorar el grafo de conocimiento.
        </p>
      </header>
      {isLoading ? (
        <p className="text-sm text-zinc-500">cargando civilizaciones…</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {data?.map((c) => (
            <li key={c.slug}>
              <button
                onClick={() => onPick(`civs/${c.name}.md`)}
                className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:border-amber-400 dark:border-zinc-700 dark:text-zinc-400"
              >
                {c.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export default function GraphPage() {
  return (
    <Suspense fallback={<div className="h-[560px] animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />}>
      <GraphInner />
    </Suspense>
  );
}
