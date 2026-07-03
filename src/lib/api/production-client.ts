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

export async function fetchProduction(body: ProductionRequest): Promise<Production> {
  return ProductionSchema.parse(
    await getJson("/api/production", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}
