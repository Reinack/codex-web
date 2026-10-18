// Estado del planificador, su (de)serialización en la URL y las plantillas.
// Puro y sin React: se prueba aparte (plan.test.ts) y lo usan también otras páginas
// (civ, matchups) para armar un enlace "planificar producción".
import {
  ACTIVITY_STEPS, AGES, DEFAULT_EFFICIENCY, RESOURCES, zero,
  type Age, type Have, type PlanLine,
} from "./engine.ts";
import { MAX_FOOD_ROWS, MAX_GATHERERS, isFoodKind, type FoodRowState } from "./food.ts";

export type PlanState = {
  /** Slug de la civ; "" = genérica. */
  civ: string;
  age: Age;
  lines: PlanLine[];
  /** null = la fuente de comida estándar de la edad. */
  foodSource: string | null;
  /** null = las mejoras estándar de la edad. */
  techs: string[] | null;
  efficiency: number;
  houses: boolean;
  passive: { relics: number; tradeCarts: number; feitorias: number };
  /** Fuentes de comida con aldeanos fijos (2 jabalíes, 8 ovejas, bayas…); el resto lo cubre `foodSource`. */
  foodRows: FoodRowState[];
  /** Ganado guarnecido en molinos (solo Gurjaras): molinos y ovejas por molino. */
  garrison: { mills: number; animals: number };
  /** Modo "¿puedo sostenerlo?": compara contra `have`. */
  sustain: boolean;
  have: Have;
};

export const MAX_LINES = 24;
export const MAX_BUILDINGS = 30;

export const DEFAULT_STATE: PlanState = {
  civ: "",
  age: "feudal",
  lines: [],
  foodSource: null,
  techs: null,
  efficiency: DEFAULT_EFFICIENCY,
  houses: true,
  passive: { relics: 0, tradeCarts: 0, feitorias: 0 },
  foodRows: [],
  garrison: { mills: 0, animals: 0 },
  sustain: false,
  have: zero(),
};

let seq = 0;
/** Clave estable para una línea nueva (solo para React; no viaja en la URL). */
export const newLineKey = (): string => `n${++seq}`;

export const snapActivity = (v: number): number =>
  ACTIVITY_STEPS.reduce((best, s) => (Math.abs(s - v) < Math.abs(best - v) ? s : best), 100 as number);

const clampInt = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, Math.round(v)));
const ID = /^[a-z0-9_]{1,64}$/i;
const SLUG = /^[a-z0-9_-]{1,40}$/i;

// ── URL ─────────────────────────────────────────────────────────────────────
// ?civ=franks&age=castle&l=knight:2:100,crossbow:3:50&fs=sheep&t=a,b&e=90&ho=0&p=2,0,0&have=20,10,8,0
//   l     líneas  id:edificios:actividad          (en orden de prioridad)
//   fs    fuente de comida (omitida = estándar de la edad)
//   t     mejoras de recolección (omitida = estándar; vacía = ninguna)
//   e     eficiencia en % (omitida = 90)
//   ho    0 = sin casas
//   fm    filas de comida kind:aldeanos:animales   (kind: sheep|cow|boar|deer|elk|berries|farm|…)
//   gg    ganado guarnecido (Gurjaras) molinos:ovejas por molino
//   p     reliquias,trade carts,feitorías
//   have  aldeanos disponibles comida,madera,oro,piedra (su presencia activa el modo sostener)

type ParamsLike = { get(name: string): string | null };

const ints = (raw: string | null, n: number): number[] | null => {
  if (raw === null) return null;
  const parts = raw.split(",").map((x) => Number.parseInt(x, 10));
  if (parts.length !== n || parts.some((x) => !Number.isFinite(x))) return null;
  return parts;
};

export function decodeState(params: ParamsLike): PlanState {
  const s: PlanState = {
    ...DEFAULT_STATE, passive: { ...DEFAULT_STATE.passive }, have: zero(), lines: [], foodRows: [],
    garrison: { ...DEFAULT_STATE.garrison },
  };

  const civ = params.get("civ");
  if (civ && SLUG.test(civ)) s.civ = civ.toLowerCase();
  const age = params.get("age");
  if (age && (AGES as readonly string[]).includes(age)) s.age = age as Age;

  const l = params.get("l");
  if (l) {
    for (const [i, chunk] of l.split(",").entries()) {
      if (s.lines.length >= MAX_LINES) break;
      const [id, b, a] = chunk.split(":");
      if (!id || !ID.test(id)) continue;
      const buildings = clampInt(Number.parseInt(b ?? "1", 10) || 1, 1, MAX_BUILDINGS);
      const activity = snapActivity(Number.parseInt(a ?? "100", 10) || 100);
      s.lines.push({ key: `u${i}`, itemId: id, buildings, activity });
    }
  }

  const fs = params.get("fs");
  if (fs && ID.test(fs)) s.foodSource = fs;
  const t = params.get("t");
  if (t !== null) s.techs = t.split(",").filter((x) => ID.test(x));
  const e = Number.parseInt(params.get("e") ?? "", 10);
  if (Number.isFinite(e)) s.efficiency = clampInt(e, 50, 100) / 100;
  if (params.get("ho") === "0") s.houses = false;
  const fm = params.get("fm");
  if (fm) {
    for (const [i, chunk] of fm.split(",").entries()) {
      if (s.foodRows.length >= MAX_FOOD_ROWS) break;
      const [kind, c, a] = chunk.split(":");
      if (!kind || !isFoodKind(kind)) continue;
      s.foodRows.push({
        key: `f${i}`, kind,
        count: clampInt(Number.parseInt(c ?? "0", 10) || 0, 0, MAX_GATHERERS),
        animals: clampInt(Number.parseInt(a ?? "0", 10) || 0, 0, MAX_GATHERERS),
      });
    }
  }
  const gg = ints(params.get("gg"), 2);
  if (gg) s.garrison = { mills: clampInt(gg[0], 0, 8), animals: clampInt(gg[1], 0, 10) };
  const p = ints(params.get("p"), 3);
  if (p) s.passive = { relics: clampInt(p[0], 0, 99), tradeCarts: clampInt(p[1], 0, 99), feitorias: clampInt(p[2], 0, 99) };
  const have = ints(params.get("have"), 4);
  if (have) {
    s.sustain = true;
    RESOURCES.forEach((r, i) => { s.have[r] = clampInt(have[i], 0, 999); });
  }
  return s;
}

/** Query string (sin "?") del estado; omite todo lo que está en su valor por defecto. */
export function encodeState(s: PlanState): string {
  const parts: string[] = [];
  const add = (k: string, v: string) => parts.push(`${k}=${v}`);
  if (s.civ) add("civ", encodeURIComponent(s.civ));
  if (s.age !== DEFAULT_STATE.age) add("age", s.age);
  if (s.lines.length) add("l", s.lines.map((x) => `${encodeURIComponent(x.itemId)}:${x.buildings}:${x.activity}`).join(","));
  if (s.foodSource) add("fs", encodeURIComponent(s.foodSource));
  if (s.techs) add("t", s.techs.map(encodeURIComponent).join(","));
  if (Math.abs(s.efficiency - DEFAULT_EFFICIENCY) > 1e-9) add("e", String(Math.round(s.efficiency * 100)));
  if (!s.houses) add("ho", "0");
  if (s.foodRows.length) add("fm", s.foodRows.map((r) => `${r.kind}:${r.count}:${r.animals}`).join(","));
  if (s.garrison.mills > 0) add("gg", `${s.garrison.mills},${s.garrison.animals}`);
  const { relics, tradeCarts, feitorias } = s.passive;
  if (relics || tradeCarts || feitorias) add("p", `${relics},${tradeCarts},${feitorias}`);
  if (s.sustain) add("have", RESOURCES.map((r) => s.have[r]).join(","));
  return parts.join("&");
}

/** Enlace a /production con una composición ya armada (lo usan civ y matchups). */
export function productionHref(partial: Partial<Pick<PlanState, "civ" | "age">> & {
  lines?: { itemId: string; buildings?: number; activity?: number }[];
}): string {
  const state: PlanState = {
    ...DEFAULT_STATE,
    civ: partial.civ ?? "",
    age: partial.age ?? DEFAULT_STATE.age,
    lines: (partial.lines ?? []).map((x, i) => ({
      key: `u${i}`, itemId: x.itemId, buildings: x.buildings ?? 1, activity: x.activity ?? 100,
    })),
  };
  const q = encodeState(state);
  return q ? `/production?${q}` : "/production";
}

// ── Plantillas ──────────────────────────────────────────────────────────────
// Punto de partida editable: al aplicarlas se copian a la lista y se pueden cambiar.

export type Template = {
  id: string;
  age: Age;
  lines: { itemId: string; buildings: number; activity?: number }[];
};

export const TEMPLATES: Template[] = [
  { id: "scouts-feudal", age: "feudal", lines: [{ itemId: "scout", buildings: 2 }] },
  { id: "archers-feudal", age: "feudal", lines: [{ itemId: "archer", buildings: 3 }] },
  { id: "knights-castle", age: "castle", lines: [{ itemId: "knight", buildings: 3 }] },
  {
    id: "knights-xbows", age: "castle",
    lines: [{ itemId: "knight", buildings: 2 }, { itemId: "crossbow", buildings: 3 }],
  },
  {
    id: "xbows-siege", age: "castle",
    lines: [{ itemId: "crossbow", buildings: 3 }, { itemId: "batteringram", buildings: 1 }],
  },
];

/** Líneas de una plantilla (solo las que existen en el catálogo). */
export function templateLines(t: Template, exists: (itemId: string) => boolean): PlanLine[] {
  return t.lines
    .filter((x) => exists(x.itemId))
    .map((x) => ({ key: newLineKey(), itemId: x.itemId, buildings: x.buildings, activity: x.activity ?? 100 }));
}
