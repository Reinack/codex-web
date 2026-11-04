// Route Handler BFF del Lab: proxy con lista blanca sobre los endpoints del Express que alimentan
// build orders, timings, mapas, equipos, draft, simulador, scouting, estudio y el catálogo de GameKit.
// Todos son datos estáticos (JSON generado desde la wiki) salvo el simulador, que va sin caché.
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchCodex, CodexApiError } from "@/lib/api/client";

const GET_ALLOWED =
  /^(icons|build-orders|timings|scouting|team|team-civs|draft-data|draft-vs|compare|quiz|maps|maps\/[a-z0-9-]+|sim\/(catalog|civs|matrix))$/;
const POST_ALLOWED = /^(sim|passive)$/;
const REVALIDATE_STATIC = 60 * 60; // 1 h: los datos cambian solo con un re-deploy del backend

type Ctx = { params: Promise<{ path: string[] }> };

async function handle(req: NextRequest, ctx: Ctx, method: "GET" | "POST") {
  const { path } = await ctx.params;
  const key = path.join("/");
  if (!(method === "GET" ? GET_ALLOWED : POST_ALLOWED).test(key)) {
    return NextResponse.json({ error: "ruta no permitida" }, { status: 404 });
  }
  const qs = method === "GET" ? req.nextUrl.search : "";
  const dynamic = key.startsWith("sim") || key === "passive" || key.startsWith("draft-vs") || key.startsWith("team") && key !== "team-civs";
  try {
    const data = await fetchCodex(`/api/${key}${qs}`, z.unknown(), {
      method,
      ...(method === "POST" ? { body: await req.text(), headers: { "Content-Type": "application/json" }, cache: "no-store" as const } : {}),
      ...(method === "GET" && !dynamic ? { revalidate: REVALIDATE_STATIC } : method === "GET" ? { cache: "no-store" as const } : {}),
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof CodexApiError) {
      // 4xx del backend (p. ej. "elegí dos civilizaciones distintas"): se devuelve tal cual para que la UI lo muestre
      const status = err.status >= 400 && err.status < 500 ? err.status : 502;
      return NextResponse.json({ error: err.message }, { status });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error desconocido" }, { status: 500 });
  }
}

export const GET = (req: NextRequest, ctx: Ctx) => handle(req, ctx, "GET");
export const POST = (req: NextRequest, ctx: Ctx) => handle(req, ctx, "POST");
