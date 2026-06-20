import { type NextRequest, NextResponse } from "next/server";
import { fetchCodex, CodexApiError, REVALIDATE } from "@/lib/api/client";
import { NoteSchema } from "@/lib/api/schema";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path")?.trim();
  if (!path) {
    return NextResponse.json({ error: "Falta el parámetro 'path'." }, { status: 400 });
  }
  try {
    const data = await fetchCodex(
      `/api/note?path=${encodeURIComponent(path)}`,
      NoteSchema,
      { revalidate: REVALIDATE.civs },
    );
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof CodexApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status === 404 ? 404 : 502 });
    }
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
