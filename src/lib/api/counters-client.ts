// Fetch del lado del CLIENTE: pega al route handler BFF (mismo origen), no al
// backend. Reutiliza el mismo esquema zod, así el cliente también obtiene tipos
// validados en runtime. Pensado para usarse como queryFn de TanStack Query.
import { CounterGraphSchema, CivUnitsSchema, type CounterGraph, type CivUnits } from "./schema";

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `Error ${res.status}`;
    throw new Error(message);
  }
  return res.json();
}

export async function fetchCounterGraph(unit: string): Promise<CounterGraph> {
  return CounterGraphSchema.parse(await getJson(`/api/counters?unit=${encodeURIComponent(unit)}`));
}

export async function fetchCivUnits(slug: string): Promise<CivUnits> {
  return CivUnitsSchema.parse(await getJson(`/api/civ-units?civ=${encodeURIComponent(slug)}`));
}
