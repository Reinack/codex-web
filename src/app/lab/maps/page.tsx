import type { Metadata } from "next";
import { Suspense } from "react";
import { MapsTab } from "@/components/lab/MapsTab";

export const metadata: Metadata = {
  title: "Mapas",
  description: "Guías por mapa de Age of Empires II: generación, cómo se juega y civs que destacan.",
};

// MapsTab lee el mapa elegido de la URL (useSearchParams): Suspense deja prerenderizar el resto.
export default function Page() {
  return (
    <Suspense fallback={<div className="h-72 animate-pulse border border-[var(--rule)] bg-[rgba(255,248,228,0.3)]" />}>
      <MapsTab />
    </Suspense>
  );
}
