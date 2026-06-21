// Dataset TEMPORAL de radares por civ (escala 1–10), copiado de los bloques
// `## Radar` del vault AoE. Cubre solo las civs ya cargadas en el vault.
//
// TODO: reemplazar por un endpoint del backend (/api/civ-radar/:slug) una vez
// re-ingestado el vault con los bloques Radar. Esto existe para validar el diseño
// del gráfico antes de cablear la tubería completa.

export const PHASE_AXES = [
  "Dark",
  "Feudal",
  "Castle",
  "Imperial",
  "Arabia",
  "Open",
  "Closed",
  "Water",
] as const;

export const CATEGORY_AXES = [
  "Infantería",
  "Caballería",
  "Arqueros",
  "Asedio",
  "Naval",
  "Monjes",
  "Defensa",
  "Economía",
] as const;

export const RADAR_MAX = 10;

export type CivRadar = { phase: number[]; category: number[] };

// Clave = slug lowercase de la civ. Orden de valores = el de los ejes de arriba.
export const CIV_RADAR: Record<string, CivRadar> = {
  aztecs: { phase: [9, 6, 9, 8, 8, 8, 9, 4], category: [8, 1, 6, 8, 4, 10, 6, 8] },
  bulgarians: { phase: [2, 8, 6, 6, 6, 6, 8, 2], category: [8, 7, 3, 5, 2, 3, 7, 6] },
  ethiopians: { phase: [2, 8, 8, 6, 8, 8, 9, 4], category: [6, 4, 9, 9, 4, 6, 6, 7] },
  tatars: { phase: [8, 8, 9, 8, 8, 6, 4, 6], category: [4, 7, 8, 6, 6, 6, 5, 7] },
  teutons: { phase: [6, 9, 6, 8, 8, 4, 9, 4], category: [8, 8, 3, 7, 3, 7, 9, 6] },
  vietnamese: { phase: [6, 9, 9, 8, 8, 6, 8, 6], category: [5, 5, 9, 6, 6, 6, 6, 7] },
};

export function getCivRadar(slug: string): CivRadar | null {
  return CIV_RADAR[slug.toLowerCase()] ?? null;
}
