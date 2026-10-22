import type { Metadata } from "next";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Árbol tecnológico",
  description: "Árbol tecnológico interactivo de Age of Empires II por civilización.",
};

// El árbol es una app d3 standalone (sub-proyecto Aoe2-Tech-Tree-Advanced) que el
// backend sirve en /tree/. La embebemos: reusar el sub-app es lo correcto en vez
// de re-portar miles de líneas de d3 a React. Va sin hoja de papiro ni título
// visible (ContentFrame): ocupa todo el alto bajo el encabezado del sitio (62 px
// de encabezado + 16 px de margen).
export default function TreePage() {
  const src = `${env.CODEX_API_BASE}/tree/`;
  return (
    <main className="flex flex-col">
      <h1 className="sr-only">Árbol tecnológico</h1>
      <iframe
        src={src}
        title="Árbol tecnológico de AoE2"
        className="h-[calc(100vh-78px)] min-h-[600px] w-full border border-[var(--gold-line)] bg-white"
        loading="lazy"
      />
    </main>
  );
}
