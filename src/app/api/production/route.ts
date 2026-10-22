// Route Handler BFF: proxy tipado sobre /api/production del Express. Reenvía el
// cuerpo (items + edad + civ + techs + supply) como POST y valida el resultado.
import { type NextRequest, NextResponse } from "next/server";
import { fetchCodex, CodexApiError } from "@/lib/api/client";
import { ProductionSchema } from "@/lib/api/schema";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido." }, { status: 400 });
  }
  try {
    const data = await fetchCodex("/api/production", ProductionSchema, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof CodexApiError) {
      const status = err.status === 400 ? 400 : 502;
      return NextResponse.json({ error: err.message }, { status });
    }
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
