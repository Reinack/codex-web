import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductionPlanner } from "@/components/production/ProductionPlanner";

export const metadata: Metadata = {
  title: "Producción",
  description:
    "Planificador de economía y producción militar de Age of Empires II: cuántos aldeanos necesitás para sostener una composición de ejército.",
};

// El planificador lee la composición de la URL (useSearchParams): Suspense deja
// prerenderizar el resto de la página y renderiza el planificador en el cliente.
export default function ProductionPage() {
  return (
    <Suspense fallback={<div className="h-72 animate-pulse border border-[var(--rule)] bg-[rgba(255,248,228,0.3)]" />}>
      <ProductionPlanner />
    </Suspense>
  );
}
