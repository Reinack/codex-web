// Helper central del patrón BFF: hace fetch al Express, valida la respuesta contra
// un esquema zod y devuelve datos ya tipados. Es el ÚNICO punto donde la app habla
// con el backend, así que aquí viven la política de caché y el manejo de errores.
import type { z } from "zod";
import { env } from "@/lib/env";

// === DECISIÓN DE DISEÑO (tu punto de contribución, ver plan §"Dónde escribís vos") ==
// Política de revalidación (ISR). Trade-off real: frescura vs. cold-start de Render
// (~50 s cuando el backend free-tier duerme). Las civs cambian rara vez → caché larga;
// el chat debe ser siempre fresco → se pide con `cache: "no-store"` en su route handler.
// Ajustá estos números a tu gusto; son segundos.
export const REVALIDATE = {
  civs: 60 * 60 * 24, // 24 h  — listado y detalle de civilizaciones
  counters: 60 * 60, //  1 h  — grafo de counters
} as const;

/** Error de backend con el status HTTP, para que el route handler decida la respuesta. */
export class CodexApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CodexApiError";
  }
}

type FetchOpts = RequestInit & { revalidate?: number };

export async function fetchCodex<T>(
  path: string,
  schema: z.ZodType<T>,
  opts: FetchOpts = {},
): Promise<T> {
  const { revalidate, headers, ...rest } = opts;

  const res = await fetch(`${env.CODEX_API_BASE}${path}`, {
    ...rest,
    headers: { Accept: "application/json", ...headers },
    // ISR cuando se pasa `revalidate`; si no, respeta `cache` del caller (p.ej. no-store).
    next: revalidate !== undefined ? { revalidate } : undefined,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new CodexApiError(
      `Backend respondió ${res.status} en ${path}${body ? `: ${body.slice(0, 200)}` : ""}`,
      res.status,
    );
  }

  const json: unknown = await res.json();
  return schema.parse(json); // contrato ejecutable: falla ruidoso si el shape cambió
}
