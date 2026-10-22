import { type NextRequest, NextResponse } from "next/server";
import { fetchCodex, CodexApiError, REVALIDATE } from "@/lib/api/client";
import { MatchupSchema } from "@/lib/api/schema";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const me = sp.get("me")?.trim();
  const vs = sp.get("vs")?.trim();
  const map = sp.get("map")?.trim() ?? "";
  if (!me || !vs) {
    return NextResponse.json({ error: "Faltan 'me' y/o 'vs'." }, { status: 400 });
  }
  const qs = new URLSearchParams({ me, vs, map }).toString();
  try {
    const data = await fetchCodex(`/api/matchup?${qs}`, MatchupSchema, {
      revalidate: REVALIDATE.counters,
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof CodexApiError) {
      const status = err.status === 404 || err.status === 400 ? err.status : 502;
      return NextResponse.json({ error: err.message }, { status });
    }
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
