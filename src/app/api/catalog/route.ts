import { type NextRequest, NextResponse } from "next/server";
import { fetchCodex, CodexApiError, REVALIDATE } from "@/lib/api/client";
import { CatalogCountsSchema, CatalogItemsSchema } from "@/lib/api/schema";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type")?.trim();
  try {
    const data = type
      ? await fetchCodex(`/api/catalog?type=${encodeURIComponent(type)}`, CatalogItemsSchema, {
          revalidate: REVALIDATE.civs,
        })
      : await fetchCodex(`/api/catalog`, CatalogCountsSchema, { revalidate: REVALIDATE.civs });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof CodexApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status === 400 ? 400 : 502 });
    }
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
