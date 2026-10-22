import { type NextRequest, NextResponse } from "next/server";
import { fetchCodex, CodexApiError, REVALIDATE } from "@/lib/api/client";
import { SearchResultsSchema } from "@/lib/api/schema";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json([]);
  try {
    const data = await fetchCodex(
      `/api/search?q=${encodeURIComponent(q)}`,
      SearchResultsSchema,
      { revalidate: REVALIDATE.counters },
    );
    return NextResponse.json(data);
  } catch (err) {
    const status = err instanceof CodexApiError ? 502 : 500;
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status });
  }
}
