import { env } from "@/lib/env";

/** URL del emblema PNG de una civ, servido por el backend en /img/civs/{slug}.png. */
export function civEmblemUrl(slug: string): string {
  return `${env.CODEX_API_BASE}/img/civs/${slug}.png`;
}
