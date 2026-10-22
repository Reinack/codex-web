import "server-only";
import { fetchCodex, REVALIDATE } from "./client";
import { RadarSchema, type RadarData } from "./schema";
import { getCivRadarFallback } from "@/lib/radar/data";

// Radar de una civ desde el backend; si el endpoint aún no existe (backend sin
// redeployar) o falla, cae al dataset local. Devuelve null si no hay datos.
export async function getCivRadar(slug: string): Promise<RadarData | null> {
  try {
    return await fetchCodex(`/api/civ-radar/${encodeURIComponent(slug)}`, RadarSchema, {
      revalidate: REVALIDATE.civs,
    });
  } catch {
    return getCivRadarFallback(slug);
  }
}
