"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCounterGraph } from "@/lib/api/counters-client";
import { CounterGraph } from "@/components/CounterGraph";
import type { CyNodeData } from "@/lib/api/schema";

const QUICK = [
  { label: "Caballeros", q: "knight" },
  { label: "Arqueros", q: "archer" },
  { label: "Escaramuza", q: "skirmisher" },
  { label: "Camellos", q: "camel" },
  { label: "Monjes", q: "monk" },
  { label: "Mangoneles", q: "mangonel" },
  { label: "Águilas", q: "eagle" },
  { label: "Exploradores", q: "scout" },
];

export default function CountersPage() {
  const [unit, setUnit] = useState("knight");
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<CyNodeData | null>(null);

  const { data, isFetching, isError, error } = useQuery({
    queryKey: ["counters", unit],
    queryFn: () => fetchCounterGraph(unit),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (q) {
      setUnit(q);
      setSelected(null);
    }
  };

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Grafo de counters</h1>
        <p className="text-sm text-zinc-500">
          Buscá una unidad: el centro es la unidad, alrededor lo que la{" "}
          <span className="text-rose-500">counterea</span> y a lo que ella{" "}
          <span className="text-emerald-500">le gana</span>.
        </p>
      </header>

      <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="p. ej. knight, mangonel, jaguar…"
          className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600"
        >
          Buscar
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {QUICK.map((b) => (
          <button
            key={b.q}
            onClick={() => {
              setUnit(b.q);
              setSelected(null);
            }}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              unit === b.q
                ? "border-amber-400 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                : "border-zinc-300 text-zinc-600 hover:border-amber-400 dark:border-zinc-700 dark:text-zinc-400"
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="relative">
          {isFetching && (
            <span className="absolute right-3 top-3 z-10 rounded-full bg-zinc-900/80 px-2 py-1 text-xs text-white">
              cargando…
            </span>
          )}
          {isError ? (
            <div className="flex h-[480px] items-center justify-center rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-600 dark:border-rose-900 dark:bg-rose-950/40">
              {error instanceof Error ? error.message : "No se encontró la unidad."}
            </div>
          ) : data ? (
            <CounterGraph graph={data} onSelect={setSelected} />
          ) : (
            <div className="h-[480px] animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
          )}
        </div>

        <aside className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          {selected ? (
            <SelectedPanel data={selected} />
          ) : (
            <>
              <h2 className="font-medium">{data?.heading ?? "—"}</h2>
              <p className="text-zinc-500">Clickeá un nodo para ver el detalle.</p>
              {data?.notes?.map((n, i) => (
                <p key={i} className="text-xs text-zinc-500">
                  {n}
                </p>
              ))}
            </>
          )}
        </aside>
      </div>
    </main>
  );
}

function SelectedPanel({ data }: { data: CyNodeData }) {
  const dirLabel =
    data.dir === "beats" ? "Le gana a" : data.dir === "counter" ? "La counterea" : null;
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">{data.label ?? data.id}</h2>
      {dirLabel && <span className="text-xs text-zinc-500">{dirLabel}</span>}
      <dl className="flex flex-col gap-1 text-xs">
        {data.tier ? (
          <div className="flex justify-between">
            <dt className="text-zinc-500">Fuerza</dt>
            <dd className="font-medium">{data.tier}</dd>
          </div>
        ) : null}
        {typeof data.weight === "number" ? (
          <div className="flex justify-between">
            <dt className="text-zinc-500">Peso</dt>
            <dd className="font-medium tabular-nums">{data.weight.toFixed(2)}</dd>
          </div>
        ) : null}
        {data.context ? (
          <div className="flex justify-between">
            <dt className="text-zinc-500">Contexto</dt>
            <dd className="font-medium">{data.context}</dd>
          </div>
        ) : null}
      </dl>
      {typeof data.nota === "string" && data.nota ? (
        <p className="rounded-lg bg-zinc-100 p-2 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {data.nota}
        </p>
      ) : null}
    </div>
  );
}
