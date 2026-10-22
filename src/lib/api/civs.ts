// Módulo de datos de civilizaciones. Lo consumen tanto los Server Components (RSC)
// como el route handler BFF, para no duplicar la lógica de fetch+validación.
import "server-only";
import { fetchCodex, REVALIDATE } from "./client";
import { CivListSchema, CivDetailSchema, type CivListItem, type CivDetail } from "./schema";

export function getCivs(): Promise<CivListItem[]> {
  return fetchCodex("/api/civs", CivListSchema, { revalidate: REVALIDATE.civs });
}

export async function getCiv(slug: string): Promise<CivDetail> {
  // El endpoint de detalle es case-sensitive (matchea path "civs/{name}.md").
  // Resolvemos el `name` title-case desde el listado (cacheado) a partir del
  // slug lowercase de la URL. Así las URLs quedan limpias sin romper el match.
  const civs = await getCivs();
  const name = civs.find((c) => c.slug === slug.toLowerCase())?.name ?? slug;
  return fetchCodex(`/api/civ/${encodeURIComponent(name)}`, CivDetailSchema, {
    revalidate: REVALIDATE.civs,
  });
}
