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
// phase = [Dark, Feudal, Castle, Imperial, Abierto, Cerrado, Agua, Nómada]
// category = [Infantería, Caballería, Arqueros, Asedio, Naval, Monjes, Defensa, Economía]
// Las 6 primeras civs mapean ratings reales del Viper; el resto son primeras
// estimaciones (marcadas ~ en el vault) pendientes de refinar.
export const CIV_RADAR: Record<string, CivRadar> = {
  armenians: { phase: [5, 7, 8, 7, 8, 6, 7, 5], category: [8, 4, 7, 6, 8, 7, 6, 5] },
  aztecs: { phase: [9, 6, 9, 8, 8, 9, 4, 4], category: [8, 1, 6, 8, 4, 10, 6, 8] },
  bengalis: { phase: [5, 5, 6, 7, 2, 5, 5, 5], category: [4, 5, 7, 6, 5, 5, 5, 7] },
  berbers: { phase: [5, 6, 7, 6, 4, 5, 7, 6], category: [5, 8, 6, 5, 7, 6, 5, 6] },
  bohemians: { phase: [4, 5, 7, 8, 2, 8, 3, 3], category: [6, 4, 7, 7, 3, 8, 6, 7] },
  britons: { phase: [5, 5, 7, 7, 1, 5, 5, 4], category: [4, 3, 10, 5, 6, 6, 5, 5] },
  bulgarians: { phase: [2, 8, 6, 6, 6, 8, 2, 2], category: [8, 7, 3, 5, 2, 3, 7, 6] },
  burgundians: { phase: [5, 6, 8, 8, 4, 6, 5, 5], category: [6, 8, 6, 7, 5, 6, 5, 8] },
  burmese: { phase: [5, 6, 7, 7, 4, 6, 5, 5], category: [8, 5, 5, 6, 5, 8, 5, 6] },
  byzantines: { phase: [5, 6, 7, 8, 8, 8, 7, 7], category: [7, 7, 6, 6, 7, 7, 9, 6] },
  celts: { phase: [5, 6, 7, 7, 4, 6, 5, 5], category: [8, 4, 5, 9, 5, 5, 6, 6] },
  chinese: { phase: [7, 7, 8, 8, 9, 8, 7, 8], category: [6, 6, 8, 7, 7, 7, 6, 9] },
  cumans: { phase: [4, 9, 6, 5, 1, 3, 4, 5], category: [4, 8, 7, 5, 4, 3, 5, 7] },
  dravidians: { phase: [5, 6, 6, 7, 6, 5, 8, 7], category: [8, 3, 7, 7, 8, 5, 5, 7] },
  ethiopians: { phase: [2, 8, 8, 6, 8, 9, 4, 5], category: [6, 4, 9, 9, 4, 6, 6, 7] },
  franks: { phase: [5, 7, 9, 8, 6, 7, 4, 4], category: [6, 9, 3, 5, 3, 5, 6, 7] },
  georgians: { phase: [5, 6, 8, 8, 8, 7, 5, 5], category: [7, 8, 5, 6, 5, 7, 8, 6] },
  goths: { phase: [5, 6, 7, 8, 2, 5, 4, 5], category: [10, 3, 5, 5, 5, 3, 3, 7] },
  gurjaras: { phase: [6, 7, 7, 7, 6, 6, 6, 6], category: [6, 8, 4, 6, 6, 5, 6, 8] },
  hindustanis: { phase: [5, 7, 8, 8, 8, 6, 7, 7], category: [5, 8, 7, 7, 6, 6, 6, 8] },
  huns: { phase: [6, 8, 7, 6, 4, 4, 4, 2], category: [5, 8, 8, 6, 5, 5, 4, 5] },
  incas: { phase: [6, 7, 8, 7, 8, 7, 5, 6], category: [9, 2, 6, 6, 5, 6, 7, 8] },
  italians: { phase: [5, 6, 7, 8, 6, 6, 9, 8], category: [5, 5, 8, 6, 9, 6, 6, 8] },
  japanese: { phase: [5, 7, 8, 8, 6, 6, 8, 6], category: [9, 4, 7, 6, 8, 6, 6, 6] },
  jurchens: { phase: [5, 6, 7, 7, 4, 5, 4, 4], category: [6, 8, 5, 8, 4, 5, 5, 6] },
  khitans: { phase: [6, 8, 9, 8, 9, 6, 5, 6], category: [5, 7, 9, 7, 5, 5, 6, 7] },
  khmer: { phase: [6, 7, 9, 9, 10, 8, 5, 5], category: [7, 8, 5, 9, 5, 6, 5, 8] },
  koreans: { phase: [5, 5, 6, 7, 4, 7, 8, 6], category: [4, 4, 7, 7, 8, 5, 9, 5] },
  lithuanians: { phase: [6, 7, 8, 7, 6, 7, 5, 6], category: [6, 8, 6, 6, 5, 7, 5, 7] },
  magyars: { phase: [6, 8, 7, 7, 6, 4, 5, 6], category: [6, 8, 8, 6, 5, 6, 4, 6] },
  malay: { phase: [6, 7, 7, 7, 9, 5, 10, 7], category: [6, 5, 5, 6, 10, 5, 4, 8] },
  malians: { phase: [5, 7, 7, 8, 6, 7, 6, 6], category: [8, 7, 6, 7, 5, 6, 7, 7] },
  mapuche: { phase: [5, 7, 7, 7, 6, 6, 5, 5], category: [8, 3, 6, 6, 5, 5, 5, 6] },
  mayans: { phase: [6, 7, 8, 8, 9, 7, 4, 5], category: [7, 2, 9, 6, 4, 5, 6, 9] },
  mongols: { phase: [7, 8, 9, 7, 9, 5, 5, 7], category: [5, 7, 9, 8, 5, 4, 4, 7] },
  muisca: { phase: [5, 6, 6, 6, 4, 6, 5, 5], category: [6, 2, 5, 6, 4, 7, 6, 7] },
  persians: { phase: [7, 7, 8, 8, 9, 8, 8, 8], category: [6, 9, 6, 7, 7, 6, 6, 9] },
  poles: { phase: [5, 7, 8, 7, 4, 6, 6, 6], category: [7, 8, 5, 7, 5, 6, 5, 8] },
  portuguese: { phase: [5, 6, 7, 8, 9, 7, 9, 8], category: [5, 5, 7, 7, 9, 6, 6, 7] },
  romans: { phase: [5, 7, 8, 7, 6, 6, 6, 5], category: [9, 6, 6, 8, 6, 6, 6, 6] },
  saracens: { phase: [5, 6, 7, 7, 2, 5, 7, 7], category: [5, 7, 8, 6, 7, 7, 5, 6] },
  shu: { phase: [6, 7, 9, 7, 8, 6, 5, 6], category: [6, 8, 6, 6, 5, 6, 6, 8] },
  sicilians: { phase: [5, 6, 7, 7, 1, 6, 6, 5], category: [8, 7, 5, 6, 6, 5, 8, 6] },
  slavs: { phase: [5, 6, 7, 7, 2, 6, 4, 5], category: [8, 7, 5, 9, 4, 5, 5, 7] },
  spanish: { phase: [5, 5, 7, 8, 2, 7, 7, 6], category: [6, 7, 5, 7, 7, 8, 6, 6] },
  tatars: { phase: [8, 8, 9, 8, 8, 4, 6, 6], category: [4, 7, 8, 6, 6, 6, 5, 7] },
  teutons: { phase: [6, 9, 6, 8, 8, 9, 4, 3], category: [8, 8, 3, 7, 3, 7, 9, 6] },
  tupi: { phase: [6, 7, 8, 8, 9, 7, 5, 6], category: [8, 3, 7, 7, 5, 6, 6, 8] },
  turks: { phase: [5, 6, 7, 8, 2, 7, 6, 6], category: [5, 7, 5, 7, 6, 4, 6, 6] },
  vietnamese: { phase: [6, 9, 9, 8, 8, 8, 6, 7], category: [5, 5, 9, 6, 6, 6, 6, 7] },
  vikings: { phase: [5, 7, 7, 8, 8, 6, 9, 7], category: [8, 4, 6, 6, 9, 5, 5, 8] },
  wei: { phase: [7, 7, 9, 8, 10, 8, 5, 6], category: [7, 7, 6, 7, 5, 6, 6, 9] },
  wu: { phase: [6, 7, 8, 8, 8, 6, 5, 6], category: [6, 8, 6, 6, 5, 5, 5, 8] },
};

export function getCivRadar(slug: string): CivRadar | null {
  return CIV_RADAR[slug.toLowerCase()] ?? null;
}
