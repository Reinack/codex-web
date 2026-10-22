// Route Handler BFF: proxy tipado sobre /api/civ-units del Express. Devuelve las
// líneas construibles + unidades únicas de una civ (para filtrar la grilla de counters).
import { type NextRequest, NextResponse } from "next/server";
import { fetchCodex, CodexApiError, REVALIDATE } from "@/lib/api/client";
import { CivUnitsSchema } from "@/lib/api/schema";

export async function GET(req: NextRequest) {
  const civ = req.nextUrl.searchParams.get("civ")?.trim();
  if (!civ) {
    return NextResponse.json({ error: "Falta el parámetro 'civ'." }, { status: 400 });
  }
  try {
    const data = await fetchCodex(`/api/civ-units?civ=${encodeURIComponent(civ)}`, CivUnitsSchema, {
      revalidate: REVALIDATE.civs,
    });
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
