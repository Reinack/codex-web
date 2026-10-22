// Route Handler BFF: expone /api/civs del lado de Next.js como proxy tipado sobre
// el Express. El browser pega acá (mismo origen), nunca al backend directo.
import { NextResponse } from "next/server";
import { getCivs } from "@/lib/api/civs";
import { CodexApiError } from "@/lib/api/client";

export async function GET() {
  try {
    const civs = await getCivs();
    return NextResponse.json(civs);
  } catch (err) {
    const status = err instanceof CodexApiError ? 502 : 500;
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status });
  }
}
