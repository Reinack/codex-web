import type { Metadata } from "next";
import { getCivs } from "@/lib/api/civs";
import { CivCard } from "@/components/CivCard";

export const metadata: Metadata = { title: "Civilizaciones" };

export default async function CivsPage() {
  const civs = await getCivs();
  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Civilizaciones</h1>
        <p className="text-sm text-zinc-500">
          {civs.length} civilizaciones en el grafo · tier de Arabia (tier list de Hera).
        </p>
      </header>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {civs.map((civ) => (
          <li key={civ.slug}>
            <CivCard civ={civ} />
          </li>
        ))}
      </ul>
    </main>
  );
}
