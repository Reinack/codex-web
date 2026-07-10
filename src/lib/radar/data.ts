// Dataset TEMPORAL de radares por civ (escala 1–10), copiado de los bloques
// `## Radar` del vault AoE. Cubre solo las civs ya cargadas en el vault.
//
// TODO: reemplazar por un endpoint del backend (/api/civ-radar/:slug) una vez
// re-ingestado el vault con los bloques Radar. Esto existe para validar el diseño
// del gráfico antes de cablear la tubería completa.

// Ejes de Radar 1: 4 edades + 4 tipos de mapa del vault
// ([[maps/tipo-abierto]], [[maps/tipo-cerrado]], [[maps/tipo-agua]], [[maps/tipo-nomada]]).
export const PHASE_AXES = [
  "Dark",
  "Feudal",
  "Castle",
  "Imperial",
  "Abierto",
  "Cerrado",
  "Agua",
  "Nómada",
] as const;

// NOTA (2026-06-22): el eje "Economía" fue reemplazado por "Pólvora" (gunpowder).
// El slot 8 de cada array `category` representa Pólvora. Las 53 civs ya fueron
// recalibradas contra meta/gunpowder-overview.md (rúbrica aditiva HC/BBC/BT/CG +
// bonus) y meta/gunpowder-civs.md (refinamiento Hera del tope).
export const CATEGORY_AXES = [
  "Infantería",
  "Caballería",
  "Arqueros",
  "Asedio",
  "Naval",
  "Monjes",
  "Defensa",
  "Pólvora",
] as const;

export const RADAR_MAX = 10;

export type CivRadar = { phase: number[]; category: number[] };

// Clave = slug lowercase de la civ. Orden de valores = el de los ejes de arriba.
// phase = [Dark, Feudal, Castle, Imperial, Abierto, Cerrado, Agua, Nómada]
// category = [Infantería, Caballería, Arqueros, Asedio, Naval, Monjes, Defensa, Pólvora]
// Ejes de mapa (Abierto/Cerrado/Nómada) recalibrados 2026-06-22 (Hera Arabia / Arena+BF /
// Nomad+African Clearing). Los 8 ejes de `category` recalibrados con rúbricas aditivas
// trazables (ver meta/{infantry,cavalry,archers,siege,naval,defense,monk,gunpowder}-overview.md).
// Ejes de edad (Dark–Imperial) recalibrados 2026-06-22: Viper directo (6 civs) + heurística de
// timing (47) — ver meta/age-overview.md. Solo el eje Agua queda como estimación (pausa post-Warlords).
// Fallback local: se usa solo si el backend (/api/civ-radar) no está disponible
// todavía (p. ej. antes de redeployar aoe2-codex con el endpoint).
export const FALLBACK_RADAR: Record<string, CivRadar> = {
  armenians: { phase: [6, 7, 8, 7, 8, 6, 7, 7], category: [8, 5, 6, 3, 6, 10, 5, 1] },
  aztecs: { phase: [9, 6, 9, 8, 6, 9, 4, 4], category: [9, 1, 6, 5, 2, 10, 7, 1] }, // Pólvora=1 (sin pólvora)
  bengalis: { phase: [4, 5, 8, 6, 2, 5, 5, 5], category: [5, 8, 6, 4, 5, 9, 7, 1] },
  berbers: { phase: [5, 7, 7, 7, 4, 4, 7, 6], category: [5, 10, 8, 6, 8, 5, 7, 5] },
  bohemians: { phase: [4, 5, 7, 8, 2, 8, 3, 3], category: [7, 4, 5, 7, 2, 8, 8, 10] },
  britons: { phase: [6, 7, 7, 7, 1, 5, 5, 4], category: [6, 5, 10, 5, 6, 5, 7, 1] },
  bulgarians: { phase: [2, 8, 6, 6, 4, 8, 2, 2], category: [8, 9, 6, 6, 2, 5, 9, 1] },
  burgundians: { phase: [6, 7, 9, 7, 4, 8, 5, 5], category: [7, 8, 3, 4, 3, 8, 8, 7] },
  burmese: { phase: [5, 6, 7, 7, 4, 6, 5, 6], category: [8, 9, 5, 6, 4, 9, 7, 3] },
  byzantines: { phase: [5, 6, 7, 7, 8, 8, 7, 7], category: [6, 8, 7, 4, 8, 9, 9, 5] },
  celts: { phase: [5, 7, 7, 7, 4, 7, 5, 5], category: [9, 6, 4, 8, 6, 2, 6, 1] },
  chinese: { phase: [8, 8, 10, 8, 10, 8, 7, 8], category: [6, 6, 10, 5, 6, 6, 8, 3] },
  cumans: { phase: [5, 7, 8, 5, 1, 3, 4, 5], category: [6, 10, 8, 4, 1, 3, 3, 1] },
  dravidians: { phase: [5, 7, 7, 6, 6, 5, 8, 7], category: [10, 5, 8, 7, 9, 5, 6, 6] },
  ethiopians: { phase: [2, 8, 8, 6, 8, 9, 4, 5], category: [6, 5, 9, 9, 4, 4, 6, 5] },
  franks: { phase: [6, 7, 9, 8, 6, 7, 4, 4], category: [7, 9, 3, 6, 5, 5, 9, 5] },
  georgians: { phase: [6, 7, 8, 7, 8, 7, 5, 7], category: [6, 9, 5, 6, 2, 7, 7, 3] },
  goths: { phase: [6, 6, 7, 6, 2, 5, 4, 5], category: [9, 6, 5, 5, 5, 3, 3, 4] },
  gurjaras: { phase: [7, 7, 8, 7, 6, 6, 6, 6], category: [4, 8, 5, 5, 5, 6, 7, 5] },
  hindustanis: { phase: [6, 7, 8, 8, 8, 6, 7, 7], category: [4, 9, 7, 5, 3, 7, 4, 8] },
  huns: { phase: [6, 7, 8, 6, 4, 4, 4, 2], category: [4, 10, 6, 2, 5, 4, 2, 1] },
  incas: { phase: [5, 6, 9, 7, 8, 7, 5, 6], category: [7, 1, 9, 5, 3, 7, 7, 1] },
  italians: { phase: [5, 6, 7, 8, 6, 6, 9, 8], category: [6, 7, 9, 4, 8, 8, 8, 7] },
  japanese: { phase: [6, 8, 8, 7, 6, 6, 8, 7], category: [9, 5, 9, 4, 7, 8, 6, 3] },
  jurchens: { phase: [5, 6, 8, 6, 4, 5, 4, 4], category: [5, 9, 5, 7, 5, 6, 8, 5] },
  khitans: { phase: [7, 9, 10, 8, 9, 6, 5, 6], category: [7, 7, 7, 4, 3, 4, 5, 1] },
  khmer: { phase: [8, 8, 10, 9, 10, 8, 5, 7], category: [3, 10, 9, 6, 4, 5, 6, 3] },
  koreans: { phase: [5, 6, 7, 6, 4, 7, 8, 7], category: [6, 4, 9, 7, 7, 4, 10, 6] },
  lithuanians: { phase: [5, 6, 9, 8, 6, 8, 5, 7], category: [5, 9, 6, 4, 4, 8, 7, 6] },
  magyars: { phase: [6, 8, 8, 8, 6, 4, 5, 6], category: [5, 10, 10, 4, 4, 5, 8, 1] },
  malay: { phase: [7, 8, 8, 9, 9, 5, 10, 7], category: [7, 5, 6, 6, 7, 8, 6, 4] },
  malians: { phase: [6, 7, 8, 7, 6, 5, 6, 7], category: [7, 5, 6, 6, 5, 7, 7, 5] },
  mapuche: { phase: [5, 6, 7, 6, 6, 6, 5, 5], category: [6, 3, 5, 5, 2, 3, 4, 1] },
  mayans: { phase: [7, 8, 9, 8, 9, 7, 4, 5], category: [7, 1, 10, 3, 3, 5, 8, 1] },
  mongols: { phase: [8, 9, 10, 8, 9, 5, 5, 7], category: [5, 9, 10, 7, 5, 2, 4, 1] },
  muisca: { phase: [4, 5, 7, 6, 4, 6, 5, 5], category: [5, 1, 6, 6, 3, 9, 5, 1] },
  persians: { phase: [8, 8, 10, 9, 9, 8, 8, 8], category: [5, 10, 6, 5, 6, 3, 5, 5] },
  poles: { phase: [5, 6, 8, 8, 4, 6, 6, 6], category: [6, 5, 6, 5, 3, 6, 7, 4] },
  portuguese: { phase: [6, 6, 7, 8, 9, 7, 9, 8], category: [6, 6, 6, 6, 8, 7, 8, 7] }, // Pólvora=7 (Hera #4; coincide con Economía vieja)
  romans: { phase: [6, 8, 8, 7, 6, 6, 6, 5], category: [8, 6, 4, 4, 5, 7, 8, 1] },
  saracens: { phase: [4, 5, 7, 6, 2, 5, 7, 7], category: [5, 9, 10, 7, 8, 8, 6, 5] },
  shu: { phase: [6, 7, 8, 7, 8, 6, 5, 6], category: [6, 4, 8, 5, 7, 3, 5, 1] },
  sicilians: { phase: [5, 6, 7, 6, 1, 6, 6, 5], category: [9, 6, 4, 6, 7, 3, 3, 1] },
  slavs: { phase: [5, 6, 7, 7, 2, 6, 4, 5], category: [9, 9, 4, 7, 4, 8, 4, 1] },
  spanish: { phase: [4, 5, 7, 7, 2, 7, 7, 8], category: [7, 8, 6, 4, 7, 9, 8, 7] },
  tatars: { phase: [8, 8, 9, 8, 8, 4, 6, 6], category: [3, 10, 10, 4, 4, 5, 8, 4] },
  teutons: { phase: [6, 9, 6, 8, 1, 9, 4, 3], category: [9, 6, 3, 8, 4, 8, 9, 6] },
  tupi: { phase: [6, 7, 9, 7, 9, 7, 5, 6], category: [6, 1, 6, 3, 2, 5, 7, 1] },
  turks: { phase: [4, 5, 7, 8, 2, 7, 6, 6], category: [5, 7, 6, 5, 7, 5, 8, 9] }, // Pólvora=9 (Hera #2)
  vietnamese: { phase: [6, 9, 9, 8, 10, 8, 6, 7], category: [5, 7, 10, 5, 5, 6, 8, 4] },
  vikings: { phase: [7, 8, 8, 8, 8, 5, 9, 7], category: [9, 3, 5, 4, 8, 4, 6, 1] },
  wei: { phase: [7, 8, 10, 8, 10, 8, 5, 6], category: [4, 8, 7, 4, 4, 5, 6, 1] },
  wu: { phase: [6, 7, 8, 8, 8, 6, 5, 6], category: [8, 8, 5, 3, 6, 6, 6, 1] },
};

export function getCivRadarFallback(slug: string): CivRadar | null {
  return FALLBACK_RADAR[slug.toLowerCase()] ?? null;
}
