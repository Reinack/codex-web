// Bonificaciones ECONÓMICAS de civilización que el planificador modela.
//
// Fuentes (todo dato tiene origen):
//   · Textos y porcentajes: strings oficiales del juego, tal como los publica el
//     proyecto Aoe2-Tech-Tree-Advanced (public/src/locales/en.js y es.js).
//   · Goteos secundarios (Polacos, Portugueses, Shu): bóveda, strategies/gather-rates.md
//     (wiki oficial de AoE2): 0,33 oro por piedra, 0,33 madera por comida, 0,1 comida por madera.
//   · Ganado guarnecido de los Gurjaras: tabla de la bóveda (Clippings/Gurjaras.md, wiki oficial,
//     actualización 66692): 1 oveja = 6,1 comida/min, 10 = 26,9, con retornos decrecientes (ver food.ts).
//
// Lo que no tiene una traducción exacta al modelo (capacidad de carga, velocidad de
// movimiento, bonos que dependen de la posición) se lista con `info`: se muestra pero
// NO entra al cálculo.
import type { Age, EcoEffects, Res } from "./engine.ts";

export type BonusText = { es: string; en: string };

export type EcoEffect =
  /** Multiplica la tasa de recolección de esas fuentes (pct por edad si es lista). */
  | { type: "rate"; sources: string[]; pct: number | readonly [number, number, number, number] }
  /** "Depositan +X %": el recurso entregado sube X % (equivale a +X % de ingreso). */
  | { type: "dropoff"; sources: string[]; pct: number }
  /** La comida de cada animal / recurso dura +X % (stock). */
  | { type: "stock"; kinds: "livestock" | "all"; pct: number }
  /** La granja / trampa rinde +X % de comida antes de agotarse (menos resembrado). */
  | { type: "reseed_capacity"; sources: string[]; pct: number }
  /** Las mejoras de granja dan +X % de comida adicional. */
  | { type: "farm_upgrades"; sources: string[]; pct: number }
  /** Cambia el costo de volver a sembrar (madera). */
  | { type: "reseed_cost"; sources: string[]; mult: number }
  /** Mientras se recolecta `from`, se genera `to` a razón de `ratio` por unidad. */
  | { type: "trickle"; from: string; to: Res; ratio: number }
  /** Ganado guarnecido en molinos (Gurjaras). */
  | { type: "mill_garrison" }
  /** Se muestra pero no se modela. */
  | { type: "info" };

export type CivEcoBonus = { id: string; text: BonusText; effect: EcoEffect };

const VILLAGER_SOURCES = ["sheep", "hunt", "berries", "farm", "shore_fish", "lumberjack", "gold_miner", "stone_miner"];
const FOOD_VILLAGER = ["sheep", "hunt", "berries", "farm", "shore_fish"];
const BOAT_FOOD = ["fishing_ship", "fish_trap", "oyster_ship"];

export const CIV_ECO: Record<string, CivEcoBonus[]> = {
  britons: [
    { id: "shepherds", effect: { type: "rate", sources: ["sheep"], pct: 25 },
      text: { es: "Los pastores trabajan +25% más rápido", en: "Shepherds work +25% faster" } },
  ],
  celts: [
    { id: "lumberjacks", effect: { type: "rate", sources: ["lumberjack"], pct: 15 },
      text: { es: "Los leñadores trabajan +15% más rápido", en: "Lumberjacks work +15% faster" } },
  ],
  franks: [
    { id: "foragers", effect: { type: "rate", sources: ["berries"], pct: 15 },
      text: { es: "Los recolectores trabajan +15% más rápido", en: "Foragers work +15% faster" } },
  ],
  koreans: [
    { id: "stone", effect: { type: "rate", sources: ["stone_miner"], pct: 20 },
      text: { es: "Los mineros de piedra trabajan +20% más rápido", en: "Stone miners work +20% faster" } },
  ],
  mongols: [
    { id: "hunters", effect: { type: "rate", sources: ["hunt"], pct: 40 },
      text: { es: "Los cazadores trabajan +40% más rápido", en: "Hunters work +40% faster" } },
  ],
  slavs: [
    { id: "farmers", effect: { type: "rate", sources: ["farm"], pct: 15 },
      text: { es: "Los agricultores trabajan +15% más rápido", en: "Farmers work +15% faster" } },
  ],
  turks: [
    { id: "gold", effect: { type: "rate", sources: ["gold_miner"], pct: 25 },
      text: { es: "Los mineros de oro trabajan +25% más rápido", en: "Gold miners work +25% faster" } },
  ],
  japanese: [
    { id: "fishing", effect: { type: "rate", sources: BOAT_FOOD, pct: [5, 10, 15, 20] },
      text: {
        es: "Los barcos pesqueros trabajan +5/10/15/20% más rápido en Alta Edad Media/Feudal/Castillos/Imperial",
        en: "Fishing Ships work +5/10/15/20% faster in Dark/Feudal/Castle/Imperial Age",
      } },
  ],
  romans: [
    { id: "villagers", effect: { type: "rate", sources: VILLAGER_SOURCES, pct: 5 },
      text: { es: "Los aldeanos recolectan, construyen y reparan +5% más rápido", en: "Villagers gather, build, and repair +5% faster" } },
  ],
  malians: [
    { id: "gold-dropoff", effect: { type: "dropoff", sources: ["gold_miner"], pct: 10 },
      text: { es: "Los aldeanos depositan +10% más de oro", en: "Villagers drop off +10% more gold" } },
  ],
  mapuche: [
    { id: "forager-dropoff", effect: { type: "dropoff", sources: ["berries"], pct: 20 },
      text: { es: "Los recolectores depositan +20% más de comida", en: "Foragers drop off +20% food" } },
  ],
  danes: [
    { id: "food-dropoff", effect: { type: "dropoff", sources: [...FOOD_VILLAGER, ...BOAT_FOOD], pct: 5 },
      text: { es: "Los buques de pesca y los aldeanos dejan un 5 % más de comida", en: "Fishing Ships and Villagers drop off +5% food" } },
  ],
  gurjaras: [
    { id: "garrison", effect: { type: "mill_garrison" },
      text: { es: "Se puede guarnecer ganado en el molino para producir comida de forma pasiva", en: "Can garrison livestock in Mills to passively produce food" } },
  ],
  tatars: [
    { id: "livestock-last", effect: { type: "stock", kinds: "livestock", pct: 50 },
      text: { es: "Los animales de granja duran +50% más", en: "Livestock animals last +50% longer" } },
  ],
  jurchens: [
    { id: "no-decay", effect: { type: "info" },
      text: { es: "La carne de animales cazados y de granja no se descompone", en: "Meat of hunted and livestock animals doesn't decay" } },
  ],
  mayans: [
    { id: "resources-last", effect: { type: "stock", kinds: "all", pct: 15 },
      text: { es: "Los recursos duran +15% más", en: "Resources last +15% longer" } },
    { id: "resources-last-farms", effect: { type: "reseed_capacity", sources: ["farm", "fish_trap"], pct: 15 },
      text: { es: "Los recursos duran +15% más (granjas y trampas rinden más)", en: "Resources last +15% longer (farms and traps yield more)" } },
  ],
  sicilians: [
    { id: "farm-upgrades", effect: { type: "farm_upgrades", sources: ["farm"], pct: 125 },
      text: { es: "Las mejoras de granjas proporcionan +125% de comida adicional", en: "Farm upgrades provide +125% additional food" } },
  ],
  teutons: [
    { id: "farm-cost", effect: { type: "reseed_cost", sources: ["farm"], mult: 0.6 },
      text: { es: "Las granjas cuestan -40%", en: "Farms cost -40%" } },
  ],
  malay: [
    { id: "fish-trap-cost", effect: { type: "reseed_cost", sources: ["fish_trap"], mult: 0.67 },
      text: { es: "Las trampas de peces cuestan -33%", en: "Fish Traps cost -33%" } },
    { id: "fish-trap-food", effect: { type: "reseed_capacity", sources: ["fish_trap"], pct: 200 },
      text: { es: "Las trampas de peces proporcionan +200% de comida", en: "Fish Traps provide +200% food" } },
  ],
  poles: [
    { id: "stone-gold", effect: { type: "trickle", from: "stone_miner", to: "gold", ratio: 0.33 },
      text: { es: "Los mineros de piedra generan oro además de piedra", en: "Stone Miners generate gold in addition to stone" } },
  ],
  portuguese: [
    { id: "forager-wood", effect: { type: "trickle", from: "berries", to: "wood", ratio: 0.33 },
      text: { es: "Los recolectores generan madera además de comida", en: "Foragers generate wood in addition to food" } },
  ],
  shu: [
    { id: "lumber-food", effect: { type: "trickle", from: "lumberjack", to: "food", ratio: 0.1 },
      text: { es: "Los leñadores generan comida además de madera", en: "Lumberjacks generate food in addition to wood" } },
  ],

  // ── Se muestran, no se modelan ─────────────────────────────────────────────
  aztecs: [
    { id: "carry", effect: { type: "info" }, text: { es: "Los aldeanos transportan +3 recursos", en: "Villagers carry +3" } },
  ],
  goths: [
    { id: "hunters-carry", effect: { type: "info" },
      text: { es: "Los cazadores transportan +15; los animales cazados duran +20% más", en: "Hunters carry +15; hunted animals last +20% longer" } },
  ],
  dravidians: [
    { id: "fish-carry", effect: { type: "info" },
      text: { es: "Los pescadores y barcos pesqueros transportan +15", en: "Fishermen and Fishing Ships carry +15" } },
  ],
  berbers: [
    { id: "villager-speed", effect: { type: "info" },
      text: { es: "Los aldeanos se mueven +5% más rápido en Alta Edad Media, +10% desde Feudal", en: "Villagers move +5% faster in Dark Age, +10% faster starting in Feudal Age" } },
  ],
  georgians: [
    { id: "church-work", effect: { type: "info" },
      text: { es: "Las Iglesias Fortificadas dan +10% de ritmo de trabajo a aldeanos en 9 casillas de radio", en: "Fortified Churches provide Villagers in a 9 tiles radius with +10% work rate" } },
  ],
  varangians: [
    { id: "gold-trickle", effect: { type: "info" },
      text: { es: "Pastoreo, pesca y caza también generan oro", en: "Shepherding, fishing, and hunting also generate gold" } },
  ],
  khitans: [
    { id: "pastures", effect: { type: "info" }, text: { es: "Los Pastos reemplazan a las Granjas", en: "Pastures replace Farms" } },
  ],
  khmer: [
    { id: "farms-no-mill", effect: { type: "info" },
      text: { es: "Los granjeros no necesitan Molinos ni Centros Urbanos para depositar comida", en: "Farmers don't require Mills or Town Centers to drop off food" } },
  ],
};

export const civEcoBonuses = (civ: string): CivEcoBonus[] => CIV_ECO[civ] ?? [];

export const civHasGarrison = (civ: string): boolean =>
  civEcoBonuses(civ).some((b) => b.effect.type === "mill_garrison");

const mulIn = (map: Record<string, number>, key: string, by: number) => {
  map[key] = (map[key] ?? 1) * by;
};

/** Efectos del motor para una civ en una edad (sin civ: neutro). */
export function resolveCivEffects(civ: string, age: Age): EcoEffects {
  const fx: EcoEffects = { rateMult: {}, reseedCapMult: {}, reseedUpgradeMult: {}, reseedWoodMult: {}, trickles: [] };
  const ageIdx = ["dark", "feudal", "castle", "imperial"].indexOf(age);
  for (const { effect: e } of civEcoBonuses(civ)) {
    switch (e.type) {
      case "rate": {
        const pct = typeof e.pct === "number" ? e.pct : e.pct[Math.max(0, ageIdx)];
        for (const s of e.sources) mulIn(fx.rateMult, s, 1 + pct / 100);
        break;
      }
      case "dropoff":
        for (const s of e.sources) mulIn(fx.rateMult, s, 1 + e.pct / 100);
        break;
      case "reseed_capacity":
        for (const s of e.sources) mulIn(fx.reseedCapMult, s, 1 + e.pct / 100);
        break;
      case "farm_upgrades":
        for (const s of e.sources) mulIn(fx.reseedUpgradeMult, s, 1 + e.pct / 100);
        break;
      case "reseed_cost":
        for (const s of e.sources) mulIn(fx.reseedWoodMult, s, e.mult);
        break;
      case "trickle":
        fx.trickles.push({ from: e.from, to: e.to, ratio: e.ratio });
        break;
      default:
        break;
    }
  }
  return fx;
}

/** Multiplicador de la comida que trae cada animal (Tatars: ganado +50 %; Mayas: +15 %). */
export function stockMultiplier(civ: string, livestock: boolean): number {
  let m = 1;
  for (const { effect: e } of civEcoBonuses(civ)) {
    if (e.type !== "stock") continue;
    if (e.kinds === "all" || livestock) m *= 1 + e.pct / 100;
  }
  return m;
}

/** Resumen de lo que modela el motor para mostrarlo en la configuración. */
export const isModeled = (b: CivEcoBonus): boolean => b.effect.type !== "info";

