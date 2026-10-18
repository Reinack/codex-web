// Fetch del lado del CLIENTE para la calculadora de producción: pega a los route
// handlers BFF (mismo origen) y reutiliza los esquemas zod. Pensado como queryFn
// de TanStack Query.
import { EcoCatalogSchema, ProductionSchema, type EcoCatalog, type Production } from "./schema";

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, init);
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

export async function fetchEcoCatalog(): Promise<EcoCatalog> {
  return EcoCatalogSchema.parse(await getJson("/api/eco-catalog"));
}

export type ProductionRequest = {
  items: { id: string; lines: number }[];
  age: string;
  civ: string | null;
  techs?: string[];
  supply?: unknown;
};

export type CivCosts = {
  /** Costo por ítem ya ajustado por los bonos de la civ en esa edad. */
  costs: Record<string, { food: number; wood: number; gold: number; stone: number }>;
  /** Bonos de la civ que devolvió el backend (costos aplicados; generación NO modelada). */
  civMods: Record<string, unknown>[];
};

// Los bonos de costo de las civs viven solo en el backend. Se le pide UNA vez por
// (civ, edad) el costo ajustado de todos los ítems (lines: 1) y el resto del cálculo
// se hace en el cliente, así que cambiar edificios/actividad no genera pedidos.
export async function fetchCivCosts(civ: string, age: string, ids: string[]): Promise<CivCosts> {
  const data = await fetchProduction({ items: ids.map((id) => ({ id, lines: 1 })), age, civ, techs: [] });
  return {
    costs: Object.fromEntries(data.perItem.map((p) => [p.id, p.cost])),
    civMods: data.appliedCivMods ?? [],
  };
}

export async function fetchProduction(body: ProductionRequest): Promise<Production> {
  return ProductionSchema.parse(
    await getJson("/api/production", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}
