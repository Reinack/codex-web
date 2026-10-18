// Tests del motor. Corren con el test runner de Node (sin dependencias):
//   npm test
// Los casos "paridad" reproducen salidas reales de POST /api/production del backend
// (aoe2-codex, lib/eco.mjs) con eficiencia 100 % y sin casas, para garantizar que el
// motor del cliente da el mismo número que el motor original.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  NO_EFFECTS, buildEcoModel, evaluateSustain, nextActivity, solvePlan,
  type EcoEffects, type PlanInput, type PlanLine, type RawCatalog,
} from "./engine.ts";

const item = (id: string, name: string, category: string, cost: Record<string, number>, time: number, kind = "unit") =>
  ({ id, name, kind, category, age: "castle", cost, time });

const CATALOG: RawCatalog = {
  items: [
    item("knight", "Knight", "stable", { food: 60, gold: 75 }, 30),
    item("crossbow", "Crossbowman", "archery", { wood: 25, gold: 45 }, 27),
    item("batteringram", "Battering Ram", "siege", { wood: 160, gold: 75 }, 36),
    item("house", "House", "economy", { wood: 25 }, 25, "building"),
  ],
  sources: {
    sheep: { label: "Ovejas", resource: "food", ratePerAge: { feudal: 20, castle: 20 }, techs: ["wheelbarrow"] },
    farm: {
      label: "Granja", resource: "food", ratePerAge: { dark: 0, feudal: 15, castle: 18 }, techs: ["wheelbarrow"],
      reseed: { wood: 60, foodCapacityPerAge: { feudal: 175, castle: 250 } },
    },
    hunt: { label: "Caza", resource: "food", ratePerAge: { feudal: 24, castle: 24 }, techs: [] },
    berries: { label: "Bayas", resource: "food", ratePerAge: { feudal: 19, castle: 20 }, techs: [] },
    fishing_ship: { label: "Barco", resource: "food", ratePerAge: { castle: 28 }, techs: [], perUnit: "fishingship" },
    lumberjack: { label: "Leñador", resource: "wood", ratePerAge: { feudal: 22, castle: 27 }, techs: ["doublebitaxe_m"] },
    gold_miner: { label: "Minero de oro", resource: "gold", ratePerAge: { feudal: 20, castle: 26 }, techs: ["goldmining_m"] },
    stone_miner: { label: "Minero de piedra", resource: "stone", ratePerAge: { feudal: 20, castle: 26 }, techs: [] },
  },
  supplyTechs: {
    doublebitaxe_m: { name: "Double-Bit Axe", mod: { gather_speed_pct: 20 } },
    goldmining_m: { name: "Gold Mining", mod: { gather_speed_pct: 15 } },
    wheelbarrow: { name: "Wheelbarrow", mod: { speed_pct: 10 } },
  },
  defaults: {
    feudal: { food: "farm", wood: "lumberjack", gold: "gold_miner", stone: "stone_miner", techs: ["doublebitaxe_m"] },
    castle: { food: "farm", wood: "lumberjack", gold: "gold_miner", stone: "stone_miner", techs: [] },
  },
  passive: {
    relic: { ratePerMin: 30 }, trade_cart: { ratePerMin: 40 },
    feitoria: { ratePerMin: { food: 10, wood: 7, gold: 8, stone: 3 } },
  },
};

const model = buildEcoModel(CATALOG);

const line = (itemId: string, buildings: number, activity = 100, key = `${itemId}-${buildings}-${activity}`): PlanLine =>
  ({ key, itemId, buildings, activity });

// Entrada "como el backend": sin casas, eficiencia 100 %, sin ingresos pasivos.
const base = (lines: PlanLine[], extra: Partial<PlanInput> = {}): PlanInput => ({
  lines, age: "castle", foodSource: null, techs: null, efficiency: 1, houses: false,
  passive: { relics: 0, tradeCarts: 0, feitorias: 0 }, ...extra,
});

const round1 = (v: number) => Math.round(v * 10) / 10;

describe("paridad con el backend", () => {
  it("2 caballeros + 3 ballesteros, Castillos, economía estándar → 14/9/24, total 47", () => {
    const r = solvePlan(model, base([line("knight", 2), line("crossbow", 3)]));
    assert.equal(r.resources.food.needed?.mid, 14);
    assert.equal(r.resources.wood.needed?.mid, 9);
    assert.equal(r.resources.gold.needed?.mid, 24);
    assert.equal(r.resources.stone.needed?.mid, 0);
    assert.equal(r.total.mid, 47);
    assert.equal(r.bottleneck, "gold");
    assert.equal(round1(r.resources.food.demand.gross), 240);
    assert.equal(round1(r.resources.wood.demand.reseed), 57.6);
    assert.equal(round1(r.resources.wood.demand.gross), 224.3);
    assert.equal(round1(r.resources.gold.demand.gross), 600);
  });

  it("con ovejas, mejoras de leñador y oro, 2 reliquias y un ariete → 12/14/23, total 49", () => {
    const r = solvePlan(model, base(
      [line("knight", 2), line("crossbow", 3), line("batteringram", 1)],
      { foodSource: "sheep", techs: ["doublebitaxe_m", "goldmining_m"], passive: { relics: 2, tradeCarts: 0, feitorias: 0 } },
    ));
    assert.equal(r.resources.food.needed?.mid, 12);
    assert.equal(r.resources.wood.needed?.mid, 14);
    assert.equal(r.resources.gold.needed?.mid, 23);
    assert.equal(r.total.mid, 49);
    assert.equal(round1(r.resources.wood.demand.reseed), 0); // ovejas: sin resembrado
    assert.equal(round1(r.resources.gold.demand.gross), 725);
    assert.equal(round1(r.resources.gold.passive), 60);
    assert.equal(round1(r.resources.wood.rate), 32.4); // 27 × 1.2
    assert.equal(round1(r.resources.gold.rate), 29.9); // 26 × 1.15
  });
});

describe("actividad y edificios", () => {
  it("2 edificios al 50 % demandan lo mismo que 1 al 100 %", () => {
    const a = solvePlan(model, base([line("knight", 2, 50)]));
    const b = solvePlan(model, base([line("knight", 1, 100)]));
    assert.equal(a.resources.gold.demand.gross, b.resources.gold.demand.gross);
    assert.equal(a.total.mid, b.total.mid);
  });

  it("dos líneas del mismo ítem suman", () => {
    const a = solvePlan(model, base([line("knight", 1, 100, "a"), line("knight", 1, 50, "b")]));
    const b = solvePlan(model, base([line("knight", 1.5)]));
    assert.equal(round1(a.resources.gold.demand.gross), round1(b.resources.gold.demand.gross));
  });

  it("ignora ítems desconocidos, líneas en 0 y tiempo 0", () => {
    const r = solvePlan(model, base([line("nada", 3), line("knight", 0), line("knight", 1, 0)]));
    assert.equal(r.lines.length, 0);
    assert.equal(r.total.mid, 0);
    assert.equal(r.bottleneck, null);
  });

  it("nextActivity baja 100 → 50 → 25 → null", () => {
    assert.equal(nextActivity(100), 50);
    assert.equal(nextActivity(50), 25);
    assert.equal(nextActivity(25), null);
  });
});

describe("casas y resembrado", () => {
  it("las casas suman madera según la población nueva", () => {
    const lines = [line("knight", 2), line("crossbow", 3)];
    const off = solvePlan(model, base(lines));
    const on = solvePlan(model, base(lines, { houses: true }));
    // 2×(60/30) + 3×(60/27) = 10.667 unidades/min → 2.133 casas/min × 25 = 53.3 madera/min
    assert.equal(round1(on.popPerMin), 10.7);
    assert.equal(round1(on.resources.wood.demand.houses), 53.3);
    assert.equal(round1(on.resources.wood.demand.gross - off.resources.wood.demand.gross), 53.3 + 0);
    assert.equal(on.resources.gold.demand.gross, off.resources.gold.demand.gross);
  });

  it("las construcciones no ocupan población: no piden casas", () => {
    const r = solvePlan(model, base([line("house", 2)], { houses: true }));
    assert.equal(r.popPerMin, 0);
    assert.equal(r.resources.wood.demand.houses, 0);
  });

  it("el resembrado sale solo de la comida recolectada, no de la que cubre un pasivo", () => {
    const r = solvePlan(model, base([line("knight", 1)], { passive: { relics: 0, tradeCarts: 0, feitorias: 24 } }));
    // 120 comida/min − 240 de feitorías → 0 recolectada → sin resembrado
    assert.equal(r.resources.wood.demand.reseed, 0);
  });
});

describe("rangos y supuestos", () => {
  it("la eficiencia ensancha el rango: 90 % → 51 (47–57)", () => {
    const r = solvePlan(model, base([line("knight", 2), line("crossbow", 3)], { efficiency: 0.9 }));
    assert.equal(r.total.mid, 51);
    assert.equal(r.total.low, 47);
    assert.equal(r.total.high, 57);
    assert.ok(r.total.low <= r.total.mid && r.total.mid <= r.total.high);
  });

  it("la eficiencia se acota a 50–100 %", () => {
    const hi = solvePlan(model, base([line("knight", 2)], { efficiency: 3 }));
    const lo = solvePlan(model, base([line("knight", 2)], { efficiency: 0.1 }));
    assert.equal(hi.efficiency, 1);
    assert.equal(lo.efficiency, 0.5);
  });

  it("una fuente sin rendimiento en la edad queda 'inalcanzable', no infinita", () => {
    const r = solvePlan(model, base([line("knight", 1)], { age: "dark" }));
    // La granja no rinde en la Edad Oscura (tasa 0): la comida no se puede cubrir con esa fuente.
    assert.ok(r.unreachable.includes("food"));
    assert.equal(r.resources.food.needed, null);
    assert.equal(r.bottleneck, "food");
  });

  it("los barcos pesqueros no suman al total de aldeanos", () => {
    const r = solvePlan(model, base([line("knight", 2)], { foodSource: "fishing_ship" }));
    assert.equal(r.resources.food.unit, "boat");
    assert.equal(r.total.mid, r.resources.wood.needed!.mid + r.resources.gold.needed!.mid);
  });

  it("usa los costos ajustados por civ cuando llegan", () => {
    const cheap = solvePlan(model, base([line("knight", 1)], { costs: { knight: { food: 30, wood: 0, gold: 75, stone: 0 } } }));
    assert.equal(round1(cheap.resources.food.demand.gross), 60);
  });
});

describe("¿puedo sostener esta composición?", () => {
  const lines = [line("knight", 2), line("crossbow", 3)];
  const plan = base(lines);

  it("con exactamente los necesarios, alcanza", () => {
    const s = evaluateSustain(model, plan, { food: 14, wood: 9, gold: 24, stone: 0 });
    assert.equal(s.ok, true);
    assert.equal(s.limiting, null);
    assert.ok(s.coverage >= 1);
    assert.deepEqual(s.perLine.map((l) => l.sustained), [2, 3]);
  });

  it("le faltan 4 aldeanos de oro", () => {
    const s = evaluateSustain(model, plan, { food: 14, wood: 9, gold: 20, stone: 0 });
    assert.equal(s.ok, false);
    assert.equal(s.limiting, "gold");
    assert.equal(s.perResource.gold.missing, 4);
    assert.equal(s.perResource.food.status, "ok");
  });

  it("sostiene los 2 establos pero ningún cuartel de ballesteros (prioridad = orden)", () => {
    // 12 mineros × 26 = 312 oro/min: 2 establos usan 300, no queda para 1 arquería (100).
    const s = evaluateSustain(model, plan, { food: 20, wood: 30, gold: 12, stone: 0 });
    assert.deepEqual(s.perLine.map((l) => l.sustained), [2, 0]);
    assert.ok(Math.abs(s.coverage - 312 / 600) < 0.001);
  });

  it("invertir el orden cambia a quién se le da prioridad", () => {
    const s = evaluateSustain(model, base([line("crossbow", 3), line("knight", 2)]), { food: 20, wood: 30, gold: 12, stone: 0 });
    assert.deepEqual(s.perLine.map((l) => l.sustained), [3, 0]); // 300 de oro en ballesteros; el establo ya no entra
  });

  it("sugiere bajar una línea y dice cuántos aldeanos libera", () => {
    const s = evaluateSustain(model, plan, { food: 20, wood: 30, gold: 12, stone: 0 });
    const gold = s.relief.filter((r) => r.res === "gold");
    assert.ok(gold.length > 0);
    // Faltan 12 de oro; bajar una línea al 50 % libera 150/26 ≈ 5,8 y no alcanza solo.
    assert.equal(gold[0].freed, 5.8);
    assert.equal(gold[0].covers, false);
    assert.deepEqual(gold[0].action, { type: "activity", to: 50 });
  });

  it("si bajar una línea alcanza, lo marca como suficiente", () => {
    const s = evaluateSustain(model, plan, { food: 20, wood: 30, gold: 20, stone: 0 }); // faltan 4
    const gold = s.relief.find((r) => r.res === "gold");
    assert.ok(gold && gold.covers);
  });

  it("sin economía no sostiene nada; la cobertura es 0", () => {
    const s = evaluateSustain(model, plan, { food: 0, wood: 0, gold: 0, stone: 0 });
    assert.equal(s.coverage, 0);
    assert.deepEqual(s.perLine.map((l) => l.sustained), [0, 0]);
  });

  it("una composición vacía siempre se sostiene", () => {
    const s = evaluateSustain(model, base([]), { food: 0, wood: 0, gold: 0, stone: 0 });
    assert.equal(s.ok, true);
    assert.equal(s.coverage, 1);
  });
});

// ── Mezcla de fuentes de comida y bonos de civilización ─────────────────────
const fx = (patch: Partial<EcoEffects>): EcoEffects => ({ ...NO_EFFECTS, ...patch });
const row = (key: string, source: string, count: number, stock = 0) => ({ key, source, count, stock });
const knights2 = [line("knight", 2)]; // 240 comida/min, 300 oro/min

describe("mezcla de fuentes de comida", () => {
  it("jabalíes y ovejas bajan lo que tiene que cubrir la granja (y su resembrado)", () => {
    const r = solvePlan(model, base(knights2, { foodRows: [row("a", "hunt", 3), row("b", "sheep", 5)] }));
    // filas: 3×24 + 5×20 = 172; faltan 68 → 4 granjeros (68/18 = 3,8)
    assert.equal(r.resources.food.fill?.mid, 4);
    assert.equal(r.resources.food.needed?.mid, 12);
    assert.equal(round1(r.resources.wood.demand.reseed), 16.3); // 68 × 60/250, no 240 × 60/250
    assert.equal(r.resources.food.rows.length, 2);
  });

  it("sin filas es idéntico al cálculo de siempre", () => {
    const a = solvePlan(model, base(knights2));
    const b = solvePlan(model, base(knights2, { foodRows: [], effects: NO_EFFECTS }));
    assert.deepEqual(a.resources.food.needed, b.resources.food.needed);
    assert.equal(a.total.mid, b.total.mid);
  });

  it("si las filas producen de más, el relleno es 0 y la comida sobra", () => {
    const r = solvePlan(model, base([line("knight", 1)], { foodRows: [row("a", "hunt", 10)] }));
    assert.equal(r.resources.food.fill?.mid, 0);
    assert.equal(r.resources.food.needed?.mid, 10);
    assert.equal(round1(r.resources.food.surplus), 120);
    assert.equal(r.resources.wood.demand.reseed, 0);
  });

  it("calcula cuánto dura una fuente finita: 2 jabalíes (680) con 3 cazadores", () => {
    const r = solvePlan(model, base(knights2, { foodRows: [row("a", "hunt", 3, 680)] }));
    assert.equal(round1(r.resources.food.rows[0].durationMin ?? 0), 9.4); // 680 / (3 × 24)
    const sinStock = solvePlan(model, base(knights2, { foodRows: [row("a", "hunt", 3, 0)] }));
    assert.equal(sinStock.resources.food.rows[0].durationMin, null);
  });

  it("ignora filas con 0 aldeanos o de una fuente que no es comida", () => {
    const r = solvePlan(model, base(knights2, { foodRows: [row("a", "hunt", 0), row("b", "lumberjack", 4)] }));
    assert.equal(r.resources.food.rows.length, 0);
    assert.equal(r.resources.food.fill?.mid, 14);
  });

  it("los barcos de una fila no cuentan como aldeanos", () => {
    const r = solvePlan(model, base(knights2, { foodRows: [row("a", "fishing_ship", 3)] }));
    assert.equal(r.resources.food.boats, 3);
    assert.equal(r.resources.food.needed?.mid, 9); // 240 − 84 = 156 → 9 granjeros
  });

  it("con eficiencia 90 % el rango de la comida se mueve con las filas", () => {
    const r = solvePlan(model, base(knights2, { efficiency: 0.9, foodRows: [row("a", "hunt", 3), row("b", "sheep", 5)] }));
    assert.equal(r.resources.food.fill?.low, 4);
    assert.ok((r.resources.food.fill?.high ?? 0) > (r.resources.food.fill?.low ?? 0));
  });
});

describe("bonos económicos de civilización", () => {
  it("Británicos: pastores +25 % suben lo que produce una fila de ovejas", () => {
    const rows = [row("a", "sheep", 4)];
    const plain = solvePlan(model, base(knights2, { foodRows: rows }));
    const brit = solvePlan(model, base(knights2, { foodRows: rows, effects: fx({ rateMult: { sheep: 1.25 } }) }));
    assert.equal(plain.resources.food.rows[0].produced, 80);
    assert.equal(brit.resources.food.rows[0].produced, 100);
    assert.equal(brit.resources.food.rows[0].civMult, 1.25);
    assert.ok((brit.resources.food.fill?.mid ?? 99) <= (plain.resources.food.fill?.mid ?? 0));
  });

  it("Mongoles: cazadores +40 % (24 → 33,6 por aldeano)", () => {
    const r = solvePlan(model, base(knights2, { foodRows: [row("a", "hunt", 3)], effects: fx({ rateMult: { hunt: 1.4 } }) }));
    assert.equal(round1(r.resources.food.rows[0].rate), 33.6);
  });

  it("el bono de la fuente de relleno también cuenta (Eslavos: granjeros +15 %)", () => {
    const r = solvePlan(model, base(knights2, { effects: fx({ rateMult: { farm: 1.15 } }) }));
    assert.equal(round1(r.resources.food.rate), 20.7);
    assert.equal(r.resources.food.fill?.mid, 12); // 240 / 20,7
  });

  it("Teutones: granjas -40 % abaratan el resembrado", () => {
    const r = solvePlan(model, base(knights2, { effects: fx({ reseedWoodMult: { farm: 0.6 } }) }));
    assert.equal(round1(r.resources.wood.demand.reseed), 34.6); // 57,6 × 0,6
  });

  it("Mayas: las granjas rinden +15 % antes de resembrarse", () => {
    const r = solvePlan(model, base(knights2, { effects: fx({ reseedCapMult: { farm: 1.15 } }) }));
    assert.equal(round1(r.resources.wood.demand.reseed), 50.1); // 57,6 / 1,15
  });

  it("Sicilianos: las mejoras de granja dan +125 % (capacidad 250 → 343,75)", () => {
    const r = solvePlan(model, base(knights2, { effects: fx({ reseedUpgradeMult: { farm: 2.25 } }) }));
    assert.equal(round1(r.resources.wood.demand.reseed), 41.9); // 240 × 60/343,75
  });

  it("Shu: cada madera cortada da 0,1 de comida (se resuelve iterando)", () => {
    const r = solvePlan(model, base([line("knight", 2), line("crossbow", 3)], {
      effects: fx({ trickles: [{ from: "lumberjack", to: "food", ratio: 0.1 }] }),
    }));
    assert.equal(round1(r.resources.wood.net), 219.0);
    assert.equal(round1(r.resources.food.net), 218.1); // 240 − 0,1 × 219
    assert.ok(Math.abs(r.resources.food.trickle - 0.1 * r.resources.wood.net) < 0.01);
  });

  it("Portugueses: los recolectores de bayas generan 0,33 de madera por comida", () => {
    const r = solvePlan(model, base([line("knight", 1)], {
      foodRows: [row("a", "berries", 5)],
      effects: fx({ trickles: [{ from: "berries", to: "wood", ratio: 0.33 }] }),
    }));
    assert.equal(round1(r.resources.wood.trickle), 33); // 5 × 20 × 0,33
    assert.equal(r.resources.wood.needed?.mid, 0);
  });

  it("Polacos: la piedra minada genera oro (0,33 por piedra)", () => {
    const stoneItem = item("castle", "Castle", "military", { stone: 300 }, 60, "building");
    const m = buildEcoModel({ ...CATALOG, items: [...CATALOG.items, stoneItem] });
    const r = solvePlan(m, base([line("castle", 1), line("knight", 1)], {
      effects: fx({ trickles: [{ from: "stone_miner", to: "gold", ratio: 0.33 }] }),
    }));
    assert.equal(round1(r.resources.stone.net), 300);
    assert.equal(round1(r.resources.gold.trickle), 99); // 300 × 0,33
    assert.equal(round1(r.resources.gold.net), 51); // knight ×1 = 150 oro/min − 99
  });
});

describe("¿puedo sostenerlo? con filas de comida", () => {
  const rows = [row("a", "hunt", 3), row("b", "sheep", 5)];
  it("have.food son los granjeros de relleno: 4 alcanzan", () => {
    const s = evaluateSustain(model, base(knights2, { foodRows: rows }), { food: 4, wood: 30, gold: 20, stone: 0 });
    assert.equal(s.ok, true);
  });

  it("con 2 granjeros faltan 2 de comida", () => {
    const s = evaluateSustain(model, base(knights2, { foodRows: rows }), { food: 2, wood: 30, gold: 20, stone: 0 });
    assert.equal(s.ok, false);
    assert.equal(s.limiting, "food");
    assert.equal(s.perResource.food.missing, 2);
  });

  it("las filas cuentan como economía aunque no haya granjeros", () => {
    const s = evaluateSustain(model, base([line("knight", 1)], { foodRows: [row("a", "hunt", 10)] }), { food: 0, wood: 5, gold: 10, stone: 0 });
    assert.equal(s.perResource.food.status, "ok");
  });
});
