// Proxy same-origin de íconos del árbol. Evita el problema de CORS al dibujar
// imágenes cross-origin en el canvas de Cytoscape. Valida la ruta para no permitir
// fetchear cualquier cosa del backend (anti path-traversal / SSRF).
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

// Íconos del árbol: por carpeta (Unit/Building/…) o los de recurso en la raíz de img/.
const SAFE_PATH = /^img\/((Unit|Building|Tech|Ages|Civs)\/[A-Za-z0-9_]+|food|wood|gold|stone)\.png$/;

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams.get("p") ?? "";
  if (!SAFE_PATH.test(p)) {
    return new NextResponse("ruta inválida", { status: 400 });
  }
  const upstream = await fetch(`${env.CODEX_API_BASE}/tree/${p}`);
  if (!upstream.ok) {
    return new NextResponse("no encontrado", { status: upstream.status });
  }
  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/png",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
