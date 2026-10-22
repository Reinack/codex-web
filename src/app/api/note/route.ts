import { type NextRequest, NextResponse } from "next/server";
import { fetchCodex, CodexApiError, REVALIDATE } from "@/lib/api/client";
import { NoteSchema } from "@/lib/api/schema";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path")?.trim();
  if (!path) {
    return NextResponse.json({ error: "Falta el parámetro 'path'." }, { status: 400 });
  }
  const content = req.nextUrl.searchParams.get("content") === "1" ? "&content=1" : "";
  try {
    const data = await fetchCodex(
      `/api/note?path=${encodeURIComponent(path)}${content}`,
      NoteSchema,
      // Con artículo, 1 h: si el front sale antes que el backend nuevo, la respuesta
      // sin `sections`/`links` no queda pegada un día entero.
      { revalidate: content ? REVALIDATE.counters : REVALIDATE.civs },
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
