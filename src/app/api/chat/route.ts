// Route Handler BFF del chat GraphRAG.
//
// El backend (/api/chat del Express) hace shell-out a Python y devuelve UN JSON
// completo — NO streamea. Acá lo convertimos en un stream NDJSON token-a-token
// para una UI de escritura progresiva. El efecto typewriter es COSMÉTICO (lo
// genera este handler, no el LLM); se hace explícito para no falsear el origen.
import { type NextRequest, NextResponse } from "next/server";
import { fetchCodex, CodexApiError } from "@/lib/api/client";
import { ChatResponseSchema } from "@/lib/api/schema";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  let question: string;
  try {
    const body: unknown = await req.json();
    question =
      body && typeof body === "object" && "question" in body
        ? String((body as { question: unknown }).question).trim()
        : "";
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }
  if (!question) {
    return NextResponse.json({ error: "Falta 'question'." }, { status: 400 });
  }

  // Llamada de una sola pasada al backend (sin caché: cada chat es fresco).
  let answer;
  try {
    answer = await fetchCodex("/api/chat", ChatResponseSchema, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
      cache: "no-store",
    });
  } catch (err) {
    if (err instanceof CodexApiError) {
      const status = err.status === 429 ? 429 : 502;
      return NextResponse.json({ error: err.message }, { status });
    }
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const encoder = new TextEncoder();
  const send = (obj: unknown) => encoder.encode(JSON.stringify(obj) + "\n");

  const stream = new ReadableStream({
    async start(controller) {
      // Trocea conservando los espacios para un typewriter natural.
      const tokens = answer.text.split(/(\s+)/);
      for (const value of tokens) {
        if (value) controller.enqueue(send({ type: "token", value }));
        await sleep(12);
      }
      controller.enqueue(
        send({
          type: "meta",
          hits: answer.hits_meta,
          related: answer.related,
          abstained: answer.abstained,
          maxScore: answer.max_score,
        }),
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
