import type { Metadata } from "next";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Árbol tecnológico",
  description: "Árbol tecnológico interactivo de Age of Empires II por civilización.",
};

// El árbol es una app d3 standalone (sub-proyecto Aoe2-Tech-Tree-Advanced) que el
// backend sirve en /tree/. La embebemos: reusar el sub-app es lo correcto en vez
// de re-portar miles de líneas de d3 a React.
export default function TreePage() {
  const src = `${env.CODEX_API_BASE}/tree/`;
  return (
    <main className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Árbol tecnológico</h1>
        <p className="text-sm text-zinc-500">
          Elegí una civilización en el panel del árbol; click en una unidad/tech abre su
          ficha (con datos del grafo del codex).
        </p>
      </header>
      <iframe
        src={src}
        title="Árbol tecnológico de AoE2"
        className="h-[82vh] w-full rounded-xl border border-zinc-200 bg-white dark:border-zinc-800"
        loading="lazy"
      />
    </main>
  );
}
