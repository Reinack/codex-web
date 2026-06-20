// Route Handler BFF para el grafo de counters. El cliente (TanStack Query) pega acá;
// nunca al backend directo. Proxy tipado sobre /api/counter-graph del Express.
import { type NextRequest, NextResponse } from "next/server";
import { fetchCodex, CodexApiError, REVALIDATE } from "@/lib/api/client";
import { CounterGraphSchema } from "@/lib/api/schema";

export async function GET(req: NextRequest) {
  const unit = req.nextUrl.searchParams.get("unit")?.trim();
  if (!unit) {
    return NextResponse.json({ error: "Falta el parámetro 'unit'." }, { status: 400 });
  }
  try {
    const data = await fetchCodex(
      `/api/counter-graph?unit=${encodeURIComponent(unit)}`,
      CounterGraphSchema,
      { revalidate: REVALIDATE.counters },
    );
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof CodexApiError) {
      const status = err.status === 404 ? 404 : 502;
      return NextResponse.json({ error: err.message }, { status });
    }
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
