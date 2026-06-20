// Fetch del lado del CLIENTE: pega al route handler BFF (mismo origen), no al
// backend. Reutiliza el mismo esquema zod, así el cliente también obtiene tipos
// validados en runtime. Pensado para usarse como queryFn de TanStack Query.
import { CounterGraphSchema, type CounterGraph } from "./schema";

export async function fetchCounterGraph(unit: string): Promise<CounterGraph> {
  const res = await fetch(`/api/counters?unit=${encodeURIComponent(unit)}`);
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `Error ${res.status}`;
    throw new Error(message);
  }
  return CounterGraphSchema.parse(await res.json());
}
