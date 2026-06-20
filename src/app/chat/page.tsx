"use client";

import { useState } from "react";
import { streamChat, type ChatMeta } from "@/lib/chat/stream";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  meta?: ChatMeta;
  pending?: boolean;
};

const EXAMPLES = [
  "¿Cómo juego Scout Rush con Franks?",
  "¿Qué counterea a los Camellos?",
  "Mejor build order para Mayans en Arabia",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const patch = (id: string, fn: (m: Message) => Message) =>
    setMessages((prev) => prev.map((m) => (m.id === id ? fn(m) : m)));

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setBusy(true);
    setInput("");
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text: question };
    const botId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: botId, role: "assistant", text: "", pending: true },
    ]);

    try {
      await streamChat(question, {
        onToken: (value) =>
          patch(botId, (m) => ({ ...m, text: m.text + value, pending: false })),
        onMeta: (meta) => patch(botId, (m) => ({ ...m, meta, pending: false })),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al consultar.";
      patch(botId, (m) => ({ ...m, text: `⚠️ ${message}`, pending: false }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-[70vh] flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Chat GraphRAG</h1>
        <p className="text-sm text-zinc-500">
          Preguntá sobre estrategia: responde a partir del grafo (retrieval híbrido +
          Gemini). El razonamiento muestra los fragmentos usados.
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-4">
        {messages.length === 0 ? (
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => ask(ex)}
                className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:border-amber-400 dark:border-zinc-700 dark:text-zinc-400"
              >
                {ex}
              </button>
            ))}
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {messages.map((m) => (
              <li key={m.id}>
                <Bubble message={m} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="sticky bottom-4 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribí tu pregunta…"
          disabled={busy}
          className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
        >
          {busy ? "…" : "Enviar"}
        </button>
      </form>
    </main>
  );
}

function Bubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? "bg-amber-500 text-white"
            : "border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
        }`}
      >
        {message.pending ? (
          <span className="inline-flex gap-1 text-zinc-400">
            <span className="animate-pulse">pensando</span>
          </span>
        ) : (
          <p className="whitespace-pre-wrap">{message.text}</p>
        )}

        {message.meta && message.meta.hits.length > 0 && (
          <details className="mt-2 border-t border-zinc-200 pt-2 dark:border-zinc-800">
            <summary className="cursor-pointer text-xs text-zinc-500">
              🔍 Ver razonamiento ({message.meta.hits.length} fragmentos)
            </summary>
            <ul className="mt-2 flex flex-col gap-1">
              {message.meta.hits.map((h, i) => (
                <li key={i} className="text-xs text-zinc-500">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {h.note}
                  </span>{" "}
                  · {h.heading} ·{" "}
                  <span className="tabular-nums">{h.score.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
