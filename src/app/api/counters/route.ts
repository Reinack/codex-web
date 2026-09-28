// Route Handler BFF para el grafo de counters. El cliente (TanStack Query) pega acá;
// nunca al backend directo. Proxy tipado sobre /api/counter-graph del Express.
import { type NextRequest, NextResponse } from "next/server";
import { fetchCodex, CodexApiError, REVALIDATE } from "@/lib/api/client";
import { CounterGraphSchema } from "@/lib/api/schema";
import { unitIconUrl } from "@/lib/tree/assets";

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
    // Enriquecemos cada nodo con la URL absoluta de su ícono (server-side, así el
    // asset host no se expone como config en el cliente).
    const enriched = {
      ...data,
      nodes: data.nodes.map((n) => ({
        data: { ...n.data, img: unitIconUrl(n.data.imgKey) },
      })),
    };
    return NextResponse.json(enriched);
  } catch (err) {
    if (err instanceof CodexApiError) {
      if (err.status === 404) {
        // Unidad todavía sin tabla de counters en el vault (p. ej. las regionales
        // del Update 185872 antes de re-ingestar): mensaje para el usuario, no el
        // error crudo del backend.
        return NextResponse.json(
          { error: `Todavía no hay counters documentados para “${unit}”. Van a aparecer cuando se actualice el grafo.` },
          { status: 404 },
        );
      }
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
