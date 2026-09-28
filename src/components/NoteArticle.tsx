"use client";

import { useMemo } from "react";
import ReactMarkdown, { defaultUrlTransform, type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { NoteData } from "@/lib/api/schema";

// [[destino]], [[destino|texto]], [[destino#ancla|texto]] y la variante con "\|" que
// Obsidian usa dentro de tablas. Se reescriben a links markdown con esquema wiki:
// antes de parsear, así el "|" del alias no rompe las filas de las tablas.
const WIKILINK_RE = /\[\[([^\]|#\\]+)(?:#[^\]|\\]*)?(?:\\?\|([^\]]+))?\]\]/g;
// Líneas que son solo tags de Obsidian ("#unit #archery #age/feudal-age").
const TAG_LINE_RE = /^\s*(#[\p{L}\p{N}_/-]+\s*)+$/gmu;

// Una sección que tras quitar comentarios y subtítulos queda vacía es plantilla sin
// completar ("<!-- Completa según… -->"): no se muestra.
const isEmptyTemplate = (body: string) =>
  !body.replace(/<!--[\s\S]*?-->/g, "").replace(/^\s*#{1,6}\s.*$/gm, "").trim();

function toMarkdown(sections: NoteData["sections"]): string {
  return sections
    .filter(({ text }) => !isEmptyTemplate(text))
    .map(({ heading, text }) => {
      let body = text.replace(/<!--[\s\S]*?-->/g, "").replace(TAG_LINE_RE, "");
      // La intro abre con "# Título", que ya muestra el panel.
      if (heading === "intro") body = body.replace(/^\s*#\s+.*\n?/, "");
      body = body.replace(
        WIKILINK_RE,
        (_, target: string, label?: string) =>
          `[${(label ?? target).trim()}](wiki:${encodeURIComponent(target.trim())})`,
      );
      return heading === "intro" ? body : `## ${heading}\n\n${body}`;
    })
    .join("\n\n");
}

// Clave de resolución: nombre de archivo sin carpeta ni extensión, en minúsculas.
const key = (s: string) =>
  s.replace(/\.md$/i, "").split("/").pop()!.trim().toLowerCase();

export function NoteArticle({
  note,
  onPick,
}: {
  note: NoteData;
  onPick: (path: string) => void;
}) {
  const markdown = useMemo(() => toMarkdown(note.sections), [note.sections]);

  // Los [[links]] se resuelven contra los LINKS_TO de la nota: primero por ruta
  // exacta ("technologies/military/fletching"), después por nombre de archivo o
  // título. Si el destino no está en el grafo queda como texto subrayado punteado.
  const resolve = useMemo(() => {
    const exact = new Map<string, string>();
    const loose = new Map<string, string>();
    for (const l of [...note.links, ...note.neighbors]) {
      exact.set(l.path.replace(/\.md$/i, "").toLowerCase(), l.path);
      loose.set(key(l.path), l.path);
      loose.set(l.title.toLowerCase(), l.path);
    }
    return (target: string) => {
      const t = target.trim().toLowerCase();
      return exact.get(t) ?? loose.get(key(t)) ?? loose.get(t);
    };
  }, [note.links, note.neighbors]);

  const components = useMemo<Components>(
    () => ({
      h2: ({ children }) => (
        <h3 className="mt-4 border-b border-[var(--rule-soft)] pb-1 font-display text-[13px] font-bold uppercase tracking-[0.06em] text-[var(--red-500)]">
          {children}
        </h3>
      ),
      h3: ({ children }) => (
        <h4 className="mt-3 font-display text-[12px] font-bold tracking-[0.04em] text-[var(--ink-700)]">
          {children}
        </h4>
      ),
      h4: ({ children }) => <h5 className="mt-2 font-semibold">{children}</h5>,
      p: ({ children }) => <p className="my-1.5 leading-relaxed">{children}</p>,
      ul: ({ children }) => <ul className="my-1.5 list-disc space-y-0.5 pl-5">{children}</ul>,
      ol: ({ children }) => <ol className="my-1.5 list-decimal space-y-0.5 pl-5">{children}</ol>,
      blockquote: ({ children }) => (
        <blockquote className="my-2 border-l-2 border-[var(--gold)] pl-3 italic text-[var(--ink-700)]">
          {children}
        </blockquote>
      ),
      table: ({ children }) => (
        <div className="my-2 overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">{children}</table>
        </div>
      ),
      th: ({ children }) => (
        <th className="border-b border-[var(--rule)] px-1.5 py-1 text-left font-semibold">
          {children}
        </th>
      ),
      td: ({ children }) => (
        <td className="border-b border-[var(--rule-soft)] px-1.5 py-1 align-top">{children}</td>
      ),
      code: ({ children }) => (
        <code className="bg-[rgba(75,51,28,0.08)] px-1 text-[12px]">{children}</code>
      ),
      a: ({ href, children }) => {
        if (href?.startsWith("wiki:")) {
          const target = decodeURIComponent(href.slice(5));
          const path = resolve(target);
          return path ? (
            <button
              onClick={() => onPick(path)}
              className="text-[var(--red-500)] underline decoration-[var(--gold)] underline-offset-2 hover:decoration-[var(--red-500)]"
            >
              {children}
            </button>
          ) : (
            <span className="text-[var(--ink-700)] underline decoration-dotted underline-offset-2">
              {children}
            </span>
          );
        }
        return (
          <a href={href} target="_blank" rel="noreferrer" className="text-[var(--red-500)] underline">
            {children}
          </a>
        );
      },
    }),
    [resolve, onPick],
  );

  if (!note.sections.length) return null;

  return (
    <div className="text-[13px] text-[var(--ink-900)]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
        urlTransform={(url) => (url.startsWith("wiki:") ? url : defaultUrlTransform(url))}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
