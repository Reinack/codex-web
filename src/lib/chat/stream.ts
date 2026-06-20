// Parser del stream NDJSON del chat (lado cliente). Lee la respuesta del BFF
// línea por línea: cada línea es un evento JSON ({type:"token"|"meta"|"error"}).
// Bufferea fragmentos parciales hasta encontrar un '\n' completo.
export type ChatHit = { note: string; heading: string; score: number };

export type ChatMeta = {
  hits: ChatHit[];
  related: string[];
  abstained: boolean;
  maxScore: number;
};

type Handlers = {
  onToken: (value: string) => void;
  onMeta: (meta: ChatMeta) => void;
  signal?: AbortSignal;
};

export async function streamChat(question: string, h: Handlers): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
    signal: h.signal,
  });

  if (!res.ok || !res.body) {
    const body: unknown = await res.json().catch(() => null);
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `Error ${res.status}`;
    throw new Error(message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;

      const evt = JSON.parse(line) as
        | { type: "token"; value: string }
        | { type: "meta" } & ChatMeta
        | { type: "error"; message: string };

      if (evt.type === "token") h.onToken(evt.value);
      else if (evt.type === "meta") h.onMeta(evt);
      else if (evt.type === "error") throw new Error(evt.message);
    }
  }
}
