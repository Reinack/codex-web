// Route Handler BFF: proxy tipado sobre /api/eco-catalog del Express. Devuelve el
// catálogo de la calculadora de producción (items, fuentes, techs, civs).
import { NextResponse } from "next/server";
import { fetchCodex, CodexApiError, REVALIDATE } from "@/lib/api/client";
import { EcoCatalogSchema } from "@/lib/api/schema";

export async function GET() {
  try {
    const data = await fetchCodex("/api/eco-catalog", EcoCatalogSchema, {
      revalidate: REVALIDATE.civs, // catálogo estable (cambia solo con un re-deploy de datos)
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof CodexApiError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
