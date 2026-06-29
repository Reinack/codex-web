"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchSearch } from "@/lib/api/explore-client";
import type { SearchResult } from "@/lib/api/schema";
import { useT } from "@/lib/i18n/I18nProvider";

// Búsqueda global ES/EN sobre el grafo (título + alias). Debounce 300ms.
// Civs → ficha de civ; resto (unidades/techs/estrategias) → explorador de grafo.
export function GlobalSearch() {
  const router = useRouter();
  const t = useT();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    const id = setTimeout(
      async () => {
        if (term.length < 2) {
          setResults([]);
          setLoading(false);
          return;
        }
        setLoading(true);
        try {
          setResults(await fetchSearch(term));
          setOpen(true);
        } catch {
          setResults([]);
        } finally {
          setLoading(false);
        }
      },
      term.length < 2 ? 0 : 300,
    );
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const go = (r: SearchResult) => {
    setOpen(false);
    setQ("");
    if (r.path.startsWith("civs/")) router.push(`/civs/${r.slug}`);
    else router.push(`/graph?path=${encodeURIComponent(r.path)}`);
  };

  return (
    <div ref={boxRef} className="relative w-full max-w-xs">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={t("header.searchPlaceholder")}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-900"
      />
      {open && (loading || results.length > 0 || q.trim().length >= 2) && (
        <ul className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          {loading && <li className="px-3 py-2 text-xs text-zinc-500">buscando…</li>}
          {!loading &&
            results.map((r) => (
              <li key={r.path}>
                <button
                  onClick={() => go(r)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-amber-500/10"
                >
                  <span className="truncate">{r.title}</span>
                  {r.type && <span className="shrink-0 text-xs text-zinc-500">{r.type}</span>}
                </button>
              </li>
            ))}
          {!loading && results.length === 0 && (
            <li className="px-3 py-2 text-xs text-zinc-500">sin resultados</li>
          )}
        </ul>
      )}
    </div>
  );
}
