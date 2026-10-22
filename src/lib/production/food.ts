// Mezcla de fuentes de comida. En la práctica la comida casi nunca sale de una sola
// fuente: en Feudal conviven los 2 jabalíes y las 8 ovejas del inicio con bayas y
// granjas, y algunas civs agregan la suya (Gurjaras: ganado guarnecido en el molino).
// Cada fila es "N aldeanos en esta fuente"; lo que falta lo cubre la fuente de relleno.
import type { FoodRowInput } from "./engine.ts";

export type FoodKind =
  | "sheep" | "cow" | "boar" | "deer" | "elk"
  | "berries" | "farm" | "shore_fish" | "fishing_ship" | "fish_trap" | "oyster_ship";

export type FoodKindInfo = {
  /** Id de fuente del modelo de oferta (tasa por aldeano, mejoras, bonos de civ). */
  source: string;
  /** Comida que trae cada animal (sin bonos). Sin dato = no se calcula duración. */
  perAnimal?: number;
  /** Ganado (los bonos de "ganado dura más" aplican). */
  livestock?: boolean;
};

// Comida por unidad de fuente, de la bóveda (maps/Arena.md y maps/Arabia.md, inicio estándar:
// 8 ovejas · 2 jabalíes · 6 arbustos · 3-4 ciervos): oveja 100, vaca 150, jabalí 340, ciervo 140,
// arbusto de bayas 125; alce 380 (strategies/gather-rates.md). Sin dato = no se calcula duración.
export const FOOD_KINDS: Record<FoodKind, FoodKindInfo> = {
  sheep: { source: "sheep", perAnimal: 100, livestock: true },
  cow: { source: "sheep", perAnimal: 150, livestock: true },
  boar: { source: "hunt", perAnimal: 340 },
  deer: { source: "hunt", perAnimal: 140 },
  elk: { source: "hunt", perAnimal: 380 },
  berries: { source: "berries", perAnimal: 125 },
  farm: { source: "farm" },
  shore_fish: { source: "shore_fish" },
  fishing_ship: { source: "fishing_ship" },
  fish_trap: { source: "fish_trap" },
  oyster_ship: { source: "oyster_ship" },
};

export const FOOD_KIND_ORDER = Object.keys(FOOD_KINDS) as FoodKind[];
export const isFoodKind = (v: string): v is FoodKind => v in FOOD_KINDS;

export type FoodRowState = {
  key: string;
  kind: FoodKind;
  /** Aldeanos (o barcos) trabajando esta fuente. */
  count: number;
  /** Animales (o arbustos) disponibles para calcular cuánto dura; 0 = no se sabe. */
  animals: number;
};

export const MAX_FOOD_ROWS = 8;
export const MAX_GATHERERS = 99;

/** Estado → entrada del motor: la comida total de la fila es animales × comida por animal × bono de civ. */
export function foodRowsToInput(rows: FoodRowState[], stockMult: (livestock: boolean) => number): FoodRowInput[] {
  return rows.map((r) => {
    const info = FOOD_KINDS[r.kind];
    const stock = info.perAnimal && r.animals > 0 ? r.animals * info.perAnimal * stockMult(!!info.livestock) : 0;
    return { key: r.key, source: info.source, count: r.count, stock };
  });
}

// ── Ganado guarnecido en molinos (Gurjaras) ──────────────────────────────────
export const GARRISON_MAX_PER_MILL = 10;

/** Comida/min TOTAL de UN molino según cuántas ovejas (100 de comida) tiene guarnecidas (0 a 10).
 *  Tabla de la bóveda (Clippings/Gurjaras.md, wiki oficial, desde la actualización 66692: retornos
 *  decrecientes): cada oveja suma menos que la anterior (la 1.ª aporta 6,1; la 10.ª, 1,3). */
const GARRISON_FOOD_PER_MIN = [0, 6.1, 10.4, 13.7, 16.5, 18.8, 20.8, 22.6, 24.1, 25.6, 26.9] as const;

export const garrisonFoodPerMill = (animals: number): number =>
  GARRISON_FOOD_PER_MIN[Math.max(0, Math.min(GARRISON_MAX_PER_MILL, Math.round(animals)))];

export const garrisonFood = (mills: number, animals: number): number => Math.max(0, mills) * garrisonFoodPerMill(animals);

/** Inicio típico de Arabia/Arena: 2 jabalíes y 8 ovejas (el reparto de aldeanos es un ejemplo, editable). */
export function typicalStart(newKey: () => string): FoodRowState[] {
  return [
    { key: newKey(), kind: "boar", count: 3, animals: 2 },
    { key: newKey(), kind: "sheep", count: 5, animals: 8 },
  ];
}
