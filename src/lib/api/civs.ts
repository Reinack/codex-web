// Módulo de datos de civilizaciones. Lo consumen tanto los Server Components (RSC)
// como el route handler BFF, para no duplicar la lógica de fetch+validación.
import "server-only";
import { fetchCodex, REVALIDATE } from "./client";
import { CivListSchema, CivDetailSchema, type CivListItem, type CivDetail } from "./schema";

export function getCivs(): Promise<CivListItem[]> {
  return fetchCodex("/api/civs", CivListSchema, { revalidate: REVALIDATE.civs });
}

export function getCiv(slug: string): Promise<CivDetail> {
  return fetchCodex(`/api/civ/${encodeURIComponent(slug)}`, CivDetailSchema, {
    revalidate: REVALIDATE.civs,
  });
}
