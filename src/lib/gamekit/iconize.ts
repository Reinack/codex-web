// Texto → partes con id de ítem. Función pura (sin React) para poder probarla: la usa <GkText>.
import type { GkCatalog } from "./types";

export type TextPart = { text: string; id?: string };

const cache = new WeakMap<GkCatalog, RegExp | false>();

function nameRegex(cat: GkCatalog): RegExp | false {
  let re = cache.get(cat);
  if (re === undefined) {
    const names = Object.keys(cat.names)
      .sort((a, b) => b.length - a.length)
      .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    re = names.length ? new RegExp(`(?<![\\p{L}\\p{N}_-])(${names.join("|")})(?![\\p{L}\\p{N}_])`, "giu") : false;
    cache.set(cat, re);
  }
  return re;
}

/** Parte `text` en trozos; los que coinciden con un nombre de unidad/tecnología/edificio llevan `id`. */
export function splitNames(text: string, cat: GkCatalog): TextPart[] {
  const re = nameRegex(cat);
  if (!re) return [{ text }];
  const out: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const id = cat.names[m[0].toLowerCase()];
    if (!id) continue;
    if (m.index! > last) out.push({ text: text.slice(last, m.index) });
    out.push({ text: m[0], id });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out.length ? out : [{ text }];
}
