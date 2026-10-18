import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CIV_ECO, civEcoBonuses, civHasGarrison, isModeled, resolveCivEffects, stockMultiplier } from "./civ-eco.ts";
import {
  FOOD_KINDS, GARRISON_MAX_PER_MILL, foodRowsToInput, garrisonFood, garrisonFoodPerMill, typicalStart,
} from "./food.ts";

const round1 = (v: number) => Math.round(v * 10) / 10;

describe("bonos económicos de civ", () => {
  it("cubre las 7 civs con bonos de generación que ya conoce el backend", () => {
    // civ-mods.json del backend marca gen en estas civs: ninguna puede quedar afuera.
    for (const civ of ["jurchens", "malay", "mayans", "poles", "portuguese", "shu", "tatars"]) {
      assert.ok(civEcoBonuses(civ).length > 0, civ);
    }
  });

  it("cada bono tiene texto en español e inglés e ids únicos por civ", () => {
    for (const [civ, list] of Object.entries(CIV_ECO)) {
      const ids = list.map((b) => b.id);
      assert.equal(new Set(ids).size, ids.length, civ);
      for (const b of list) {
        assert.ok(b.text.es.length > 3 && b.text.en.length > 3, `${civ}/${b.id}`);
      }
    }
  });

  it("Británicos: pastores +25 %; Mongoles: cazadores +40 %; Francos: bayas +15 %", () => {
    assert.equal(resolveCivEffects("britons", "castle").rateMult.sheep, 1.25);
    assert.equal(resolveCivEffects("mongols", "feudal").rateMult.hunt, 1.4);
    assert.equal(resolveCivEffects("franks", "feudal").rateMult.berries, 1.15);
  });

  it("Eslavos, Celtas, Coreanos y Turcos mejoran su recurso (Turcos +25 %)", () => {
    assert.equal(resolveCivEffects("slavs", "castle").rateMult.farm, 1.15);
    assert.equal(resolveCivEffects("celts", "castle").rateMult.lumberjack, 1.15);
    assert.equal(resolveCivEffects("koreans", "castle").rateMult.stone_miner, 1.2);
    assert.equal(resolveCivEffects("turks", "castle").rateMult.gold_miner, 1.25);
  });

  it("Japoneses: barcos pesqueros +5/10/15/20 % según la edad", () => {
    assert.equal(round1(resolveCivEffects("japanese", "dark").rateMult.fishing_ship * 100), 105);
    assert.equal(round1(resolveCivEffects("japanese", "feudal").rateMult.fishing_ship * 100), 110);
    assert.equal(round1(resolveCivEffects("japanese", "imperial").rateMult.fish_trap * 100), 120);
  });

  it("Romanos suben a los aldeanos pero no a los barcos; Daneses suman comida de aldeanos y barcos", () => {
    const romans = resolveCivEffects("romans", "castle").rateMult;
    assert.equal(romans.lumberjack, 1.05);
    assert.equal(romans.farm, 1.05);
    assert.equal(romans.fishing_ship, undefined);
    const danes = resolveCivEffects("danes", "castle").rateMult;
    assert.equal(danes.farm, 1.05);
    assert.equal(danes.fishing_ship, 1.05);
    assert.equal(danes.lumberjack, undefined);
  });

  it("los bonos se acumulan sin pisarse (Romanos × nada más)", () => {
    const fx = resolveCivEffects("romans", "castle");
    assert.deepEqual(fx.trickles, []);
    assert.equal(resolveCivEffects("", "castle").rateMult.sheep, undefined); // sin civ: neutro
  });

  it("efectos de resembrado: Mayas, Sicilianos, Teutones y Malayos", () => {
    assert.equal(resolveCivEffects("mayans", "castle").reseedCapMult.farm, 1.15);
    assert.equal(resolveCivEffects("sicilians", "castle").reseedUpgradeMult.farm, 2.25);
    assert.equal(resolveCivEffects("teutons", "castle").reseedWoodMult.farm, 0.6);
    const malay = resolveCivEffects("malay", "castle");
    assert.equal(malay.reseedCapMult.fish_trap, 3);
    assert.equal(malay.reseedWoodMult.fish_trap, 0.67);
  });

  it("goteos: Polacos piedra→oro, Portugueses bayas→madera, Shu madera→comida", () => {
    assert.deepEqual(resolveCivEffects("poles", "castle").trickles, [{ from: "stone_miner", to: "gold", ratio: 0.33 }]);
    assert.deepEqual(resolveCivEffects("portuguese", "castle").trickles, [{ from: "berries", to: "wood", ratio: 0.33 }]);
    assert.deepEqual(resolveCivEffects("shu", "castle").trickles, [{ from: "lumberjack", to: "food", ratio: 0.1 }]);
  });

  it("la comida de los animales: Tatars +50 % al ganado, Mayas +15 % a todo", () => {
    assert.equal(stockMultiplier("tatars", true), 1.5);
    assert.equal(stockMultiplier("tatars", false), 1);
    assert.equal(stockMultiplier("mayans", false), 1.15);
    assert.equal(stockMultiplier("mayans", true), 1.15);
    assert.equal(stockMultiplier("", true), 1);
  });

  it("solo los Gurjaras guarnecen ganado; lo no modelado se distingue", () => {
    assert.equal(civHasGarrison("gurjaras"), true);
    assert.equal(civHasGarrison("tatars"), false);
    assert.equal(isModeled(civEcoBonuses("aztecs")[0]), false); // carga +3: se muestra, no se modela
    assert.equal(isModeled(civEcoBonuses("britons")[0]), true);
  });
});

describe("mezcla de comida", () => {
  it("ganado guarnecido de los Gurjaras: tabla de la bóveda (Clippings/Gurjaras.md)", () => {
    const total = [0, 6.1, 10.4, 13.7, 16.5, 18.8, 20.8, 22.6, 24.1, 25.6, 26.9];
    total.forEach((v, n) => assert.equal(garrisonFoodPerMill(n), v, `${n} ovejas`));
    assert.equal(round1(garrisonFoodPerMill(10) - garrisonFoodPerMill(9)), 1.3); // columna "marginal" de la tabla
    assert.equal(garrisonFoodPerMill(25), garrisonFoodPerMill(GARRISON_MAX_PER_MILL)); // tope de 10 por molino
    assert.equal(garrisonFoodPerMill(-3), 0);
  });

  it("3 ovejas solas rinden más que las otras 7 juntas (lo dice la bóveda)", () => {
    assert.ok(garrisonFoodPerMill(3) > garrisonFoodPerMill(10) - garrisonFoodPerMill(3));
  });

  it("rinde decreciente y se suma por molino", () => {
    const m = (n: number) => garrisonFoodPerMill(n);
    assert.ok(m(2) - m(1) > m(10) - m(9));
    assert.equal(round1(garrisonFood(3, 8)), round1(3 * m(8)));
    assert.equal(garrisonFood(0, 8), 0);
  });

  it("la comida de una fila sale de los animales y del bono de civ", () => {
    const rows = [
      { key: "a", kind: "boar" as const, count: 3, animals: 2 },
      { key: "b", kind: "sheep" as const, count: 5, animals: 8 },
      { key: "c", kind: "berries" as const, count: 2, animals: 6 },
      { key: "d", kind: "farm" as const, count: 4, animals: 9 },
    ];
    const plain = foodRowsToInput(rows, () => 1);
    assert.deepEqual(plain.map((r) => r.stock), [680, 800, 750, 0]); // 2×340 · 8×100 · 6×125 · sin límite
    assert.deepEqual(plain.map((r) => r.source), ["hunt", "sheep", "berries", "farm"]);
    const tatars = foodRowsToInput(rows, (livestock) => stockMultiplier("tatars", livestock));
    assert.equal(tatars[1].stock, 1200); // ovejas +50 %
    assert.equal(tatars[0].stock, 680); // el jabalí no es ganado
  });

  it("sin animales cargados no se inventa un stock", () => {
    const [r] = foodRowsToInput([{ key: "a", kind: "boar", count: 3, animals: 0 }], () => 1);
    assert.equal(r.stock, 0);
  });

  it("valores de comida de la bóveda: oveja 100, vaca 150, jabalí 340, ciervo 140, alce 380, arbusto 125", () => {
    assert.deepEqual(
      ["sheep", "cow", "boar", "deer", "elk", "berries"].map((k) => FOOD_KINDS[k as keyof typeof FOOD_KINDS].perAnimal),
      [100, 150, 340, 140, 380, 125],
    );
  });

  it("el inicio típico trae 2 jabalíes y 8 ovejas", () => {
    let n = 0;
    const rows = typicalStart(() => `k${n++}`);
    assert.deepEqual(rows.map((r) => [r.kind, r.animals]), [["boar", 2], ["sheep", 8]]);
    assert.equal(new Set(rows.map((r) => r.key)).size, rows.length);
  });
});
