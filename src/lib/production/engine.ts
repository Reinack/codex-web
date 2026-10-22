// Motor del planificador de producción. Funciones puras, sin React ni red: reciben
// el catálogo del backend (/api/eco-catalog, ya normalizado a EcoModel) y devuelven
// la demanda y los aldeanos por recurso. Es la misma matemática que
// aoe2-codex/web/lib/eco.mjs (solve), con estos agregados:
//   · edificios × actividad (100/50/25 %) en vez de "una línea = un edificio";
//   · eficiencia de recolección con rango (no se promete un número exacto);
//   · casas (población) y comparación contra la economía disponible ("¿puedo sostener?");
//   · mezcla de fuentes de comida (jabalíes + ovejas + bayas + granjas…) con su duración;
//   · bonificaciones económicas de civilización (ver civ-eco.ts) y goteos pasivos.
//
//   DEMANDA  drain_r = Σ costo_r × (edificios × actividad) × 60 / tiempo      [rec/min]
//   OFERTA   rate_s  = tasa de la fuente × Π(1 + mejora_pct/100) × bonos de civ [rec/min por aldeano]
//   COMIDA   a recolectar = demanda − pasivos − lo que producen las filas fijas; el resto lo cubre
//            la fuente de relleno (granja por defecto).
//   RESULT.  aldeanos_r = ceil( max(0, a recolectar) / (rate × eficiencia) )
//
// Los costos ya ajustados por bonos de civ llegan de afuera (`costs`): el backend es
// la única fuente de esos bonos y acá no se duplican.

export const RESOURCES = ["food", "wood", "gold", "stone"] as const;
export type Res = (typeof RESOURCES)[number];
export const AGES = ["dark", "feudal", "castle", "imperial"] as const;
export type Age = (typeof AGES)[number];
export type ResMap = Record<Res, number>;

/** Pasos de actividad de un edificio: 100 % = produce sin parar. */
export const ACTIVITY_STEPS = [100, 50, 25] as const;
/** Población que suma una casa (DE). Las unidades ocupan 1 de población. */
export const POP_PER_HOUSE = 5;
/** El rango de aldeanos va de (eficiencia + 10 pts, tope 100 %) a (eficiencia − 10 pts). */
export const EFFICIENCY_SPREAD = 0.1;
export const DEFAULT_EFFICIENCY = 0.9;
/** Si el costo de la casa no viene en el catálogo. */
const FALLBACK_HOUSE_COST: ResMap = { food: 0, wood: 25, gold: 0, stone: 0 };

const EPS = 1e-6;

export const zero = (): ResMap => ({ food: 0, wood: 0, gold: 0, stone: 0 });
export const ageIndex = (age: string): number => Math.max(0, (AGES as readonly string[]).indexOf(age));

// ── Modelo (lo que sale del catálogo) ───────────────────────────────────────

export type ModelItem = {
  id: string;
  name: string;
  kind: "unit" | "building";
  category: string;
  age: string;
  cost: ResMap;
  time: number;
};

export type ModelSource = {
  label: string;
  resource: Res;
  ratePerAge: Record<string, number>;
  /** Mejoras de recolección que afectan a esta fuente. */
  techs: string[];
  /** "fishingship": el recolector es un barco, no un aldeano. */
  perUnit?: string;
  /** Madera que cuesta volver a sembrar por cada `foodCapacityPerAge` de comida. */
  reseed?: { wood: number; foodCapacityPerAge: Record<string, number> };
};

export type ModelTech = { name: string; pct: number };

export type EcoModel = {
  items: Record<string, ModelItem>;
  sources: Record<string, ModelSource>;
  techs: Record<string, ModelTech>;
  defaultSources: Record<string, Partial<Record<Res, string>>>;
  defaultTechs: Record<string, string[]>;
  passive: { relic: number; tradeCart: number; feitoria: ResMap };
  houseCost: ResMap;
};

// Forma mínima del catálogo (estructural: el tipo zod del cliente y los fixtures de
// los tests la cumplen sin importar zod acá).
export type RawCatalog = {
  items: {
    id: string; name: string; kind: string; category: string; age?: string;
    cost: Partial<ResMap>; time: number;
  }[];
  sources: Record<string, {
    label: string; resource: string; ratePerAge: Record<string, number>;
    techs?: string[]; perUnit?: string; reseed?: unknown;
  }>;
  supplyTechs: Record<string, { name: string; mod: Record<string, unknown> }>;
  defaults: Record<string, Record<string, unknown>>;
  passive: Record<string, unknown>;
};

const isRes = (v: string): v is Res => (RESOURCES as readonly string[]).includes(v);
const num = (v: unknown, fallback = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const fullCost = (c: Partial<ResMap>): ResMap => ({
  food: num(c.food), wood: num(c.wood), gold: num(c.gold), stone: num(c.stone),
});

/** Porcentaje con que una mejora multiplica la tasa de recolección (misma regla que el backend). */
export function techPct(mod: Record<string, unknown>): number {
  return num(mod.gather_speed_pct ?? mod.carry_capacity ?? mod.speed_pct);
}

export function buildEcoModel(raw: RawCatalog): EcoModel {
  const items: Record<string, ModelItem> = {};
  for (const it of raw.items) {
    items[it.id] = {
      id: it.id, name: it.name, category: it.category, age: it.age ?? "dark",
      kind: it.kind === "building" ? "building" : "unit",
      cost: fullCost(it.cost), time: num(it.time),
    };
  }

  const sources: Record<string, ModelSource> = {};
  for (const [id, s] of Object.entries(raw.sources)) {
    if (!isRes(s.resource)) continue;
    const rs = s.reseed as { wood?: unknown; foodCapacityPerAge?: Record<string, number> } | undefined;
    sources[id] = {
      label: s.label, resource: s.resource, ratePerAge: s.ratePerAge, techs: s.techs ?? [],
      perUnit: s.perUnit,
      reseed: rs && rs.foodCapacityPerAge ? { wood: num(rs.wood), foodCapacityPerAge: rs.foodCapacityPerAge } : undefined,
    };
  }

  const techs: Record<string, ModelTech> = {};
  for (const [id, t] of Object.entries(raw.supplyTechs)) techs[id] = { name: t.name, pct: techPct(t.mod) };

  const defaultSources: EcoModel["defaultSources"] = {};
  const defaultTechs: EcoModel["defaultTechs"] = {};
  for (const [age, d] of Object.entries(raw.defaults)) {
    const bySource: Partial<Record<Res, string>> = {};
    for (const r of RESOURCES) if (typeof d[r] === "string") bySource[r] = d[r] as string;
    defaultSources[age] = bySource;
    defaultTechs[age] = Array.isArray(d.techs) ? (d.techs as string[]) : [];
  }

  const p = raw.passive as {
    relic?: { ratePerMin?: unknown }; trade_cart?: { ratePerMin?: unknown }; feitoria?: { ratePerMin?: Partial<ResMap> };
  };
  const passive = {
    relic: num(p.relic?.ratePerMin, 30),
    tradeCart: num(p.trade_cart?.ratePerMin, 40),
    feitoria: fullCost(p.feitoria?.ratePerMin ?? {}),
  };

  const house = items.house;
  return { items, sources, techs, defaultSources, defaultTechs, passive, houseCost: house ? house.cost : FALLBACK_HOUSE_COST };
}

// ── Entrada / salida ────────────────────────────────────────────────────────

export type PlanLine = {
  key: string;
  itemId: string;
  /** Edificios produciendo en paralelo. */
  buildings: number;
  /** % del tiempo que el edificio produce (1–100; la UI usa 100/50/25). */
  activity: number;
};

/** Una fuente de comida con aldeanos fijos (p. ej. 3 en jabalí con 2 jabalíes = 680 de comida). */
export type FoodRowInput = {
  key: string;
  /** Id de fuente del modelo (sheep, hunt, berries, farm…). */
  source: string;
  /** Aldeanos (o barcos) trabajando esta fuente. */
  count: number;
  /** Comida total disponible en la fuente (0 = ilimitada o no se sabe). */
  stock: number;
};

export type Trickle = { from: string; to: Res; ratio: number };

/** Efectos de la civilización sobre la oferta (ver civ-eco.ts). */
export type EcoEffects = {
  /** Multiplicador de tasa por id de fuente (ritmo de trabajo y "depositan +X %"). */
  rateMult: Record<string, number>;
  /** Multiplica la comida que rinde una granja/trampa antes de resembrarse. */
  reseedCapMult: Record<string, number>;
  /** Multiplica lo que aportan las MEJORAS de granja por encima de la base (Sicilianos). */
  reseedUpgradeMult: Record<string, number>;
  /** Multiplica la madera de resembrado (granjas más baratas). */
  reseedWoodMult: Record<string, number>;
  /** Mientras se recolecta `from` se genera `to` (Polacos, Portugueses, Shu). */
  trickles: Trickle[];
};

export const NO_EFFECTS: EcoEffects = {
  rateMult: {}, reseedCapMult: {}, reseedUpgradeMult: {}, reseedWoodMult: {}, trickles: [],
};

export type PlanInput = {
  lines: PlanLine[];
  age: Age;
  /** Costos ya ajustados por civ; si falta un id se usa el costo base del catálogo. */
  costs?: Record<string, ResMap>;
  /** Fuente de relleno de comida; null = la estándar de la edad. */
  foodSource: string | null;
  /** Fuentes de comida con aldeanos fijos (se cuentan antes que el relleno). */
  foodRows?: FoodRowInput[];
  /** Mejoras de recolección investigadas; null = las estándar de la edad. */
  techs: string[] | null;
  /** Rendimiento real vs. teórico (0.5–1). */
  efficiency: number;
  /** Sumar la madera de las casas que pide la población nueva. */
  houses: boolean;
  passive: { relics: number; tradeCarts: number; feitorias: number };
  /** Bonos económicos de la civ. */
  effects?: EcoEffects;
  /** Ingreso pasivo extra por minuto (p. ej. ganado guarnecido de los Gurjaras). */
  extraPassive?: Partial<ResMap>;
};

export type Range = { low: number; mid: number; high: number };

export type LineResult = {
  key: string;
  itemId: string;
  name: string;
  kind: "unit" | "building";
  buildings: number;
  activity: number;
  time: number;
  cost: ResMap;
  /** Unidades (o construcciones) por minuto de la línea completa. */
  perMin: number;
  /** Recursos por minuto que consume la línea completa (sin casas ni resembrado). */
  drainPerMin: ResMap;
};

export type FoodRowResult = {
  key: string;
  source: string;
  label: string;
  unit: "villager" | "boat";
  count: number;
  /** Tasa por recolector con mejoras y bonos de civ. */
  rate: number;
  civMult: number;
  /** Comida/min que produce la fila con la eficiencia esperada. */
  produced: number;
  stock: number;
  /** Minutos que dura la fuente al ritmo actual (null = no se sabe / ilimitada). */
  durationMin: number | null;
};

export type ResourceResult = {
  res: Res;
  /** Fuente de relleno (la que cubre lo que no cubren las filas). */
  sourceId: string;
  sourceLabel: string;
  unit: "villager" | "boat";
  mods: string[];
  /** Multiplicador de la civ sobre la tasa de la fuente de relleno. */
  civMult: number;
  /** Tasa nominal por recolector (rec/min) con las mejoras y los bonos de civ. */
  rate: number;
  demand: { direct: number; houses: number; reseed: number; gross: number };
  /** Ingresos pasivos (reliquias, trade, feitorías, ganado guarnecido…) aplicados. */
  passive: number;
  /** Goteos de civ (p. ej. Shu: comida por la madera que se corta) aplicados. */
  trickle: number;
  net: number;
  /** Aldeanos totales de este recurso (filas + relleno). null = el relleno no rinde en esta edad. */
  needed: Range | null;
  /** Solo la fuente de relleno (lo marginal). Para wood/gold/stone es igual a `needed`. */
  fill: Range | null;
  /** Comida: filas fijas con su duración. */
  rows: FoodRowResult[];
  /** Comida que sobra por minuto si las filas producen más de lo necesario. */
  surplus: number;
  /** Barcos pesqueros (filas + relleno); no entran al total de aldeanos. */
  boats: number;
  /** Fracción de los recolectores totales (con la eficiencia esperada); 0 si no hay. */
  share: number;
};

export type PlanResult = {
  lines: LineResult[];
  resources: Record<Res, ResourceResult>;
  /** Solo recolectores aldeanos (los barcos pesqueros no cuentan). */
  total: Range;
  /** Recursos con demanda que ninguna fuente cubre en esta edad. */
  unreachable: Res[];
  bottleneck: Res | null;
  popPerMin: number;
  housesPerMin: number;
  efficiency: number;
};

export const clampEfficiency = (e: number): number => Math.min(1, Math.max(0.5, Number.isFinite(e) ? e : DEFAULT_EFFICIENCY));

/** Tasa efectiva de una fuente: base de la edad × (1 + pct) de cada mejora que le aplica. */
export function sourceRate(model: EcoModel, sourceId: string, age: string, techs: string[]): number {
  const src = model.sources[sourceId];
  if (!src) return 0;
  let rate = src.ratePerAge[age] ?? 0;
  for (const id of techs) {
    if (!src.techs.includes(id)) continue;
    const t = model.techs[id];
    if (t) rate *= 1 + t.pct / 100;
  }
  return rate;
}

/** Mejoras de recolección efectivas: las investigadas, o las estándar de la edad. */
export function effectiveTechs(model: EcoModel, age: string, techs: string[] | null): string[] {
  return techs ?? model.defaultTechs[age] ?? model.defaultTechs.feudal ?? [];
}

type PreparedRow = { input: FoodRowInput; rate: number; unit: "villager" | "boat" };

type Prepared = {
  model: EcoModel;
  input: PlanInput;
  ageKey: string;
  techs: string[];
  effects: EcoEffects;
  sourceIds: Record<Res, string | undefined>;
  /** Tasa por recolector de la fuente de relleno de cada recurso (con mejoras y bonos de civ). */
  rates: ResMap;
  rows: PreparedRow[];
  passiveIncome: ResMap;
  efficiency: number;
};

const unitOf = (model: EcoModel, sourceId: string | undefined): "villager" | "boat" =>
  sourceId && model.sources[sourceId]?.perUnit ? "boat" : "villager";

function prepare(model: EcoModel, input: PlanInput): Prepared {
  const ageKey = input.age;
  const techs = effectiveTechs(model, ageKey, input.techs);
  const effects = input.effects ?? NO_EFFECTS;
  const rateOf = (id: string) => sourceRate(model, id, ageKey, techs) * (effects.rateMult[id] ?? 1);
  const defaults = model.defaultSources[ageKey] ?? model.defaultSources.feudal ?? {};
  const sourceIds = {} as Record<Res, string | undefined>;
  const rates = zero();
  for (const r of RESOURCES) {
    const chosen = r === "food" && input.foodSource && model.sources[input.foodSource]?.resource === "food"
      ? input.foodSource
      : defaults[r];
    sourceIds[r] = chosen;
    rates[r] = chosen ? rateOf(chosen) : 0;
  }
  const rows: PreparedRow[] = (input.foodRows ?? [])
    .filter((r) => r.count > 0 && model.sources[r.source]?.resource === "food")
    .map((r) => ({ input: r, rate: rateOf(r.source), unit: unitOf(model, r.source) }));

  const passiveIncome = zero();
  const { relics, tradeCarts, feitorias } = input.passive;
  passiveIncome.gold += Math.max(0, relics) * model.passive.relic + Math.max(0, tradeCarts) * model.passive.tradeCart;
  for (const r of RESOURCES) {
    passiveIncome[r] += Math.max(0, feitorias) * model.passive.feitoria[r] + Math.max(0, input.extraPassive?.[r] ?? 0);
  }
  return { model, input, ageKey, techs, effects, sourceIds, rates, rows, passiveIncome, efficiency: clampEfficiency(input.efficiency) };
}

type Resolved = { line: PlanLine; item: ModelItem; cost: ResMap };

function resolveLines(p: Prepared, lines: PlanLine[]): Resolved[] {
  const out: Resolved[] = [];
  for (const line of lines) {
    const item = p.model.items[line.itemId];
    if (!item || item.time <= 0 || line.buildings <= 0 || line.activity <= 0) continue;
    out.push({ line, item, cost: p.input.costs?.[line.itemId] ?? item.cost });
  }
  return out;
}

/** Madera de resembrado por cada unidad de comida que rinde una fuente (granja, trampa de peces). */
function reseedRatio(p: Prepared, sourceId: string): number {
  const src = p.model.sources[sourceId];
  if (!src?.reseed) return 0;
  const caps = src.reseed.foodCapacityPerAge;
  const values = Object.values(caps);
  const capAge = caps[p.ageKey] ?? caps.feudal ?? 0;
  const base = values.length ? Math.min(...values) : capAge;
  // Las mejoras son lo que está por encima de la capacidad base (Sicilianos: +125 % sobre eso).
  const cap = (base + (capAge - base) * (p.effects.reseedUpgradeMult[sourceId] ?? 1)) * (p.effects.reseedCapMult[sourceId] ?? 1);
  const wood = src.reseed.wood * (p.effects.reseedWoodMult[sourceId] ?? 1);
  return cap > 0 ? wood / cap : 0;
}

type Flow = {
  direct: ResMap;
  houses: ResMap;
  popPerMin: number;
  housesPerMin: number;
  reseed: number;
  /** Goteos de civ por recurso (rec/min). */
  trickle: ResMap;
  gross: ResMap;
  /** A recolectar por recurso, ya restados pasivos y goteos. */
  net: ResMap;
  rowProduced: number[];
  rowsFood: number;
  /** Comida que tiene que cubrir la fuente de relleno. */
  fillAlloc: number;
  surplusFood: number;
};

/** Todos los flujos de recursos de un conjunto de líneas a una eficiencia dada.
 *  `scale[i]` multiplica los edificios efectivos de la línea i. */
function flows(p: Prepared, rs: Resolved[], scale: number[] | undefined, eff: number): Flow {
  const direct = zero();
  let popPerMin = 0;
  rs.forEach(({ line, item, cost }, i) => {
    const effBuildings = line.buildings * (line.activity / 100) * (scale ? scale[i] : 1);
    const perMin = (effBuildings * 60) / item.time;
    for (const r of RESOURCES) direct[r] += cost[r] * perMin;
    if (item.kind === "unit") popPerMin += perMin;
  });
  const houses = zero();
  const housesPerMin = p.input.houses ? popPerMin / POP_PER_HOUSE : 0;
  for (const r of RESOURCES) houses[r] = housesPerMin * p.model.houseCost[r];

  const rowProduced = p.rows.map((r) => r.input.count * r.rate * eff);
  const rowsFood = rowProduced.reduce((s, v) => s + v, 0);
  const rowRatio = p.rows.map((r) => reseedRatio(p, r.input.source));
  const fillSrc = p.sourceIds.food;
  const fillRatio = fillSrc ? reseedRatio(p, fillSrc) : 0;
  const passive = p.passiveIncome;

  let trickle = zero();
  const net = zero();
  let reseed = 0;
  let fillAlloc = 0;
  for (let iter = 0; iter < 40; iter++) {
    // Los goteos dependen de lo que se recolecta, y lo recolectado de los goteos: se itera hasta converger.
    net.food = Math.max(0, direct.food + houses.food - passive.food - trickle.food);
    fillAlloc = Math.max(0, net.food - rowsFood);
    reseed = fillAlloc * fillRatio + rowProduced.reduce((s, v, i) => s + v * rowRatio[i], 0);
    net.wood = Math.max(0, direct.wood + houses.wood + reseed - passive.wood - trickle.wood);
    net.gold = Math.max(0, direct.gold + houses.gold - passive.gold - trickle.gold);
    net.stone = Math.max(0, direct.stone + houses.stone - passive.stone - trickle.stone);

    const next = zero();
    for (const tr of p.effects.trickles) {
      const src = p.model.sources[tr.from];
      if (!src) continue;
      let flow = 0;
      if (src.resource === "food") {
        flow = p.rows.reduce((s, r, i) => s + (r.input.source === tr.from ? rowProduced[i] : 0), 0)
          + (fillSrc === tr.from ? fillAlloc : 0);
      } else if (p.sourceIds[src.resource] === tr.from) {
        flow = net[src.resource];
      }
      next[tr.to] += flow * tr.ratio;
    }
    const diff = RESOURCES.reduce((m, r) => Math.max(m, Math.abs(next[r] - trickle[r])), 0);
    trickle = next;
    if (diff < 1e-9) break;
  }

  const gross = zero();
  for (const r of RESOURCES) gross[r] = direct[r] + houses[r] + (r === "wood" ? reseed : 0);
  return {
    direct, houses, popPerMin, housesPerMin, reseed, trickle, gross, net,
    rowProduced, rowsFood, fillAlloc, surplusFood: Math.max(0, rowsFood - net.food),
  };
}

/** Recolectores necesarios para `net` rec/min a una eficiencia dada. */
function gatherersFor(net: number, rate: number, efficiency: number): number | null {
  if (net <= EPS) return 0;
  if (rate <= 0) return null;
  return Math.ceil(net / (rate * efficiency) - EPS);
}

function effVariants(eff: number): { low: number; mid: number; high: number } {
  return { low: Math.min(1, eff + EFFICIENCY_SPREAD), mid: eff, high: Math.max(0.2, eff - EFFICIENCY_SPREAD) };
}

function rangeOf(f: (eff: number) => number | null, eff: number): Range | null {
  const e = effVariants(eff);
  const mid = f(e.mid);
  const low = f(e.low);
  const high = f(e.high);
  if (mid === null || low === null || high === null) return null;
  return { low, mid, high };
}

export function solvePlan(model: EcoModel, input: PlanInput): PlanResult {
  const p = prepare(model, input);
  const rs = resolveLines(p, input.lines);
  const e = effVariants(p.efficiency);
  const fMid = flows(p, rs, undefined, e.mid);
  const flowAt = new Map<number, Flow>([[e.mid, fMid], [e.low, flows(p, rs, undefined, e.low)], [e.high, flows(p, rs, undefined, e.high)]]);
  const at = (eff: number) => flowAt.get(eff) ?? flows(p, rs, undefined, eff);

  const lines: LineResult[] = rs.map(({ line, item, cost }) => {
    const perMin = (line.buildings * (line.activity / 100) * 60) / item.time;
    const drainPerMin = zero();
    for (const r of RESOURCES) drainPerMin[r] = cost[r] * perMin;
    return {
      key: line.key, itemId: item.id, name: item.name, kind: item.kind, buildings: line.buildings,
      activity: line.activity, time: item.time, cost, perMin, drainPerMin,
    };
  });

  const rowVillagers = p.rows.filter((r) => r.unit === "villager").reduce((s, r) => s + r.input.count, 0);
  const rowBoats = p.rows.filter((r) => r.unit === "boat").reduce((s, r) => s + r.input.count, 0);

  const resources = {} as Record<Res, ResourceResult>;
  const unreachable: Res[] = [];
  const total: Range = { low: 0, mid: 0, high: 0 };
  for (const r of RESOURCES) {
    const sourceId = p.sourceIds[r] ?? "";
    const src = model.sources[sourceId];
    const unit = unitOf(model, sourceId);
    // Lo marginal: a recolectar (o, en comida, lo que no cubren las filas) / (tasa × eficiencia).
    const fill = rangeOf((eff) => gatherersFor(r === "food" ? at(eff).fillAlloc : at(eff).net[r], p.rates[r], eff), p.efficiency);
    let needed: Range | null = fill;
    let boats = 0;
    if (r === "food") {
      boats = rowBoats + (unit === "boat" ? fill?.mid ?? 0 : 0);
      if (fill) {
        const own = unit === "villager" ? fill : { low: 0, mid: 0, high: 0 };
        needed = { low: rowVillagers + own.low, mid: rowVillagers + own.mid, high: rowVillagers + own.high };
      }
    }
    if (!needed) unreachable.push(r);
    else if (r === "food" || unit === "villager") {
      total.low += needed.low; total.mid += needed.mid; total.high += needed.high;
    }

    const rowsOut: FoodRowResult[] = r === "food"
      ? p.rows.map((row, i) => {
          const produced = fMid.rowProduced[i];
          return {
            key: row.input.key, source: row.input.source, label: model.sources[row.input.source]?.label ?? row.input.source,
            unit: row.unit, count: row.input.count, rate: row.rate,
            civMult: p.effects.rateMult[row.input.source] ?? 1, produced, stock: row.input.stock,
            durationMin: row.input.stock > 0 && produced > EPS ? row.input.stock / produced : null,
          };
        })
      : [];

    resources[r] = {
      res: r, sourceId, sourceLabel: src?.label ?? sourceId, unit,
      mods: (src?.techs ?? []).filter((id) => p.techs.includes(id) && model.techs[id]),
      civMult: p.effects.rateMult[sourceId] ?? 1,
      rate: p.rates[r],
      demand: { direct: fMid.direct[r], houses: fMid.houses[r], reseed: r === "wood" ? fMid.reseed : 0, gross: fMid.gross[r] },
      passive: Math.min(p.passiveIncome[r], fMid.gross[r]),
      trickle: fMid.trickle[r],
      net: fMid.net[r], needed, fill, rows: rowsOut,
      surplus: r === "food" ? fMid.surplusFood : 0, boats, share: 0,
    };
  }
  const sumMid = RESOURCES.reduce((s, r) => s + (resources[r].needed?.mid ?? 0), 0);
  let bottleneck: Res | null = null;
  let best = 0;
  for (const r of RESOURCES) {
    const mid = resources[r].needed?.mid ?? 0;
    resources[r].share = sumMid > 0 ? mid / sumMid : 0;
    if (mid > best) { best = mid; bottleneck = r; }
  }
  // Un recurso que ninguna fuente cubre en esta edad es, por definición, el que limita.
  if (unreachable.length) bottleneck = unreachable[0];

  return {
    lines, resources, total, unreachable, bottleneck,
    popPerMin: fMid.popPerMin, housesPerMin: fMid.housesPerMin, efficiency: p.efficiency,
  };
}

// ── ¿Puedo sostener esta composición? ───────────────────────────────────────
// `have` = aldeanos disponibles por recurso. Para la comida son los de la FUENTE DE
// RELLENO (p. ej. granjeros): las filas fijas de la mezcla ya cuentan como economía.

export type Have = Record<Res, number>;

export type ResourceSustain = {
  res: Res;
  have: number;
  need: Range | null;
  status: "ok" | "short";
  /** Aldeanos que faltan con la eficiencia esperada (0 si alcanza). */
  missing: number;
  /** Lo que faltaría si todo rindiera al máximo del rango. */
  missingBestCase: number;
  /** Aldeanos que sobran con la eficiencia esperada. */
  spare: number;
};

export type LineSustain = {
  key: string;
  itemId: string;
  name: string;
  buildings: number;
  /** Cuántos de los edificios de la línea se sostienen (en el orden de la lista). */
  sustained: number;
};

export type Relief = {
  lineKey: string;
  name: string;
  res: Res;
  action: { type: "activity"; to: number } | { type: "building" };
  /** Aldeanos de `res` que se liberan. */
  freed: number;
  /** ¿Con esto solo ya cubrís lo que falta de `res`? */
  covers: boolean;
};

export type SustainResult = {
  perResource: Record<Res, ResourceSustain>;
  ok: boolean;
  /** Recurso que más falta (en aldeanos), si falta alguno. */
  limiting: Res | null;
  /** Fracción de la composición que la economía sostiene (1 = toda; >1 = sobra). Tope 8. */
  coverage: number;
  perLine: LineSustain[];
  relief: Relief[];
};

const MAX_COVERAGE = 8;

export function evaluateSustain(model: EcoModel, input: PlanInput, have: Have): SustainResult {
  const p = prepare(model, input);
  const rs = resolveLines(p, input.lines);
  const result = solvePlan(model, input);

  // Lo que cubre cada recurso, medido en lo que hay que recolectar por minuto (relleno) a la eficiencia esperada.
  const cap = zero();
  for (const r of RESOURCES) cap[r] = Math.max(0, have[r]) * p.rates[r] * p.efficiency;
  const demandOf = (f: Flow): ResMap => ({ food: f.fillAlloc, wood: f.net.wood, gold: f.net.gold, stone: f.net.stone });
  const feasible = (scale: number[]): boolean => {
    const d = demandOf(flows(p, rs, scale, p.efficiency));
    return RESOURCES.every((r) => d[r] <= cap[r] + EPS);
  };

  const perResource = {} as Record<Res, ResourceSustain>;
  let limiting: Res | null = null;
  let worst = 0;
  for (const r of RESOURCES) {
    const need = result.resources[r].fill;
    const mid = need ? need.mid : Infinity;
    const missing = Math.max(0, mid - have[r]);
    perResource[r] = {
      res: r, have: have[r], need,
      status: missing > 0 ? "short" : "ok",
      missing: Number.isFinite(missing) ? missing : 0,
      missingBestCase: need ? Math.max(0, need.low - have[r]) : 0,
      spare: need ? Math.max(0, have[r] - need.mid) : 0,
    };
    if (!need) perResource[r].status = "short";
    if (perResource[r].missing > worst) { worst = perResource[r].missing; limiting = r; }
  }
  if (!limiting) limiting = RESOURCES.find((r) => perResource[r].status === "short") ?? null;
  const ok = RESOURCES.every((r) => perResource[r].status === "ok");

  // Cobertura: cuánto de la composición entera se sostiene (bisección sobre la escala común).
  const all = (s: number) => rs.map(() => s);
  let coverage: number;
  if (rs.length === 0) coverage = 1;
  else if (feasible(all(MAX_COVERAGE))) coverage = MAX_COVERAGE;
  else {
    let lo = 0, hi = MAX_COVERAGE;
    for (let i = 0; i < 40; i++) {
      const m = (lo + hi) / 2;
      if (feasible(all(m))) lo = m; else hi = m;
    }
    coverage = lo < 1e-6 ? 0 : lo;
  }

  // Edificios sostenibles por línea, en el orden de la lista (el orden es la prioridad).
  const perLine: LineSustain[] = [];
  const scale = rs.map(() => 0);
  rs.forEach(({ line, item }, i) => {
    let b = line.buildings;
    for (; b > 0; b--) {
      scale[i] = b / line.buildings;
      if (feasible(scale)) break;
    }
    if (b <= 0) scale[i] = 0;
    perLine.push({ key: line.key, itemId: item.id, name: item.name, buildings: line.buildings, sustained: Math.max(0, b) });
  });

  // Alivio: qué línea, bajada un paso, libera más aldeanos del recurso que falta.
  const relief: Relief[] = [];
  const base = demandOf(flows(p, rs, undefined, p.efficiency));
  for (const r of RESOURCES) {
    if (perResource[r].status !== "short" || !perResource[r].need || p.rates[r] <= 0) continue;
    const effRate = p.rates[r] * p.efficiency;
    const options: Relief[] = [];
    rs.forEach(({ line, item }, i) => {
      const step = nextActivity(line.activity);
      const factor = step !== null ? step / line.activity : line.buildings > 1 ? (line.buildings - 1) / line.buildings : 0;
      const after = demandOf(flows(p, rs, rs.map((_, j) => (j === i ? factor : 1)), p.efficiency));
      const freed = (base[r] - after[r]) / effRate;
      if (freed < 0.5) return;
      options.push({
        lineKey: line.key, name: item.name, res: r, freed: Math.round(freed * 10) / 10,
        action: step !== null ? { type: "activity", to: step } : { type: "building" },
        covers: freed + EPS >= perResource[r].missing,
      });
    });
    // Preferir la opción que alcanza con menos sacrificio; si ninguna alcanza, las que más liberan.
    const covering = options.filter((o) => o.covers).sort((a, b) => a.freed - b.freed);
    const picked = covering.length ? covering.slice(0, 2) : options.sort((a, b) => b.freed - a.freed).slice(0, 2);
    relief.push(...picked);
  }

  return { perResource, ok, limiting, coverage, perLine, relief };
}

/** Próximo paso de actividad hacia abajo, o null si ya está en el mínimo. */
export function nextActivity(activity: number): number | null {
  const lower = ACTIVITY_STEPS.filter((s) => s < activity);
  return lower.length ? lower[0] : null;
}

/** Aldeanos que cubren la composición con la eficiencia esperada ("usar los necesarios"). */
export function haveFromPlan(result: PlanResult): Have {
  const have = zero();
  for (const r of RESOURCES) have[r] = result.resources[r].fill?.mid ?? 0;
  return have;
}
