import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_STATE, MAX_BUILDINGS, MAX_LINES, TEMPLATES, decodeState, encodeState, productionHref, snapActivity, templateLines,
} from "./plan.ts";

const parse = (qs: string) => decodeState(new URLSearchParams(qs));

describe("URL del planificador", () => {
  it("el estado por defecto no escribe nada", () => {
    assert.equal(encodeState(DEFAULT_STATE), "");
  });

  it("ida y vuelta conserva composición, civ, edad y supuestos", () => {
    const s = parse("civ=franks&age=castle&l=knight:2:100,crossbow:3:50&fs=sheep&t=doublebitaxe_m,goldmining_m&e=80&ho=0&p=2,1,0&have=20,10,8,0");
    assert.equal(s.civ, "franks");
    assert.equal(s.age, "castle");
    assert.deepEqual(s.lines.map((l) => [l.itemId, l.buildings, l.activity]), [["knight", 2, 100], ["crossbow", 3, 50]]);
    assert.equal(s.foodSource, "sheep");
    assert.deepEqual(s.techs, ["doublebitaxe_m", "goldmining_m"]);
    assert.equal(s.efficiency, 0.8);
    assert.equal(s.houses, false);
    assert.deepEqual(s.passive, { relics: 2, tradeCarts: 1, feitorias: 0 });
    assert.equal(s.sustain, true);
    assert.deepEqual(s.have, { food: 20, wood: 10, gold: 8, stone: 0 });
    assert.equal(encodeState(s), "civ=franks&age=castle&l=knight:2:100,crossbow:3:50&fs=sheep&t=doublebitaxe_m,goldmining_m&e=80&ho=0&p=2,1,0&have=20,10,8,0");
  });

  it("distingue 'sin mejoras' (t vacío) de 'mejoras estándar' (sin t)", () => {
    assert.equal(parse("age=castle").techs, null);
    assert.deepEqual(parse("t=").techs, []);
    assert.equal(encodeState({ ...DEFAULT_STATE, techs: [] }), "t=");
  });

  it("descarta basura: edad, ids, números y actividades raras", () => {
    const s = parse("age=medieval&civ=%3Cscript%3E&l=knight:99:73,<b>:1:1,archer:x:y,,&e=5&p=1,2&have=1,2,3");
    assert.equal(s.age, DEFAULT_STATE.age);
    assert.equal(s.civ, "");
    assert.deepEqual(s.lines.map((l) => [l.itemId, l.buildings, l.activity]), [["knight", MAX_BUILDINGS, 50], ["archer", 1, 100]]);
    assert.equal(s.efficiency, 0.5);
    assert.deepEqual(s.passive, DEFAULT_STATE.passive);
    assert.equal(s.sustain, false);
  });

  it("limita la cantidad de líneas", () => {
    const l = Array.from({ length: MAX_LINES + 10 }, () => "knight:1:100").join(",");
    assert.equal(parse(`l=${l}`).lines.length, MAX_LINES);
  });

  it("snapActivity lleva cualquier valor al paso más cercano", () => {
    assert.equal(snapActivity(100), 100);
    assert.equal(snapActivity(80), 100);
    assert.equal(snapActivity(60), 50);
    assert.equal(snapActivity(30), 25);
    assert.equal(snapActivity(1), 25);
  });

  it("productionHref arma un enlace que se vuelve a leer igual", () => {
    const href = productionHref({ civ: "franks", age: "castle", lines: [{ itemId: "knight", buildings: 2 }] });
    assert.equal(href, "/production?civ=franks&age=castle&l=knight:2:100");
    const s = parse(href.split("?")[1]);
    assert.equal(s.lines[0].itemId, "knight");
    assert.equal(productionHref({}), "/production");
  });
});

describe("URL: mezcla de comida y Gurjaras", () => {
  it("ida y vuelta de las filas de comida y del ganado guarnecido", () => {
    const qs = "civ=gurjaras&age=feudal&fm=boar:3:2,sheep:5:8,berries:2:6&gg=2,8";
    const s = parse(qs);
    assert.deepEqual(s.foodRows.map((r) => [r.kind, r.count, r.animals]), [["boar", 3, 2], ["sheep", 5, 8], ["berries", 2, 6]]);
    assert.deepEqual(s.garrison, { mills: 2, animals: 8 });
    // feudal es la edad por defecto: no se escribe
    assert.equal(encodeState(s), "civ=gurjaras&fm=boar:3:2,sheep:5:8,berries:2:6&gg=2,8");
  });

  it("descarta fuentes desconocidas, topes y basura", () => {
    const s = parse("fm=dragon:3:2,boar:999:999,:::,sheep:x:y&gg=99,99");
    assert.deepEqual(s.foodRows.map((r) => [r.kind, r.count, r.animals]), [["boar", 99, 99], ["sheep", 0, 0]]);
    assert.deepEqual(s.garrison, { mills: 8, animals: 10 });
  });

  it("limita la cantidad de filas y no escribe nada por defecto", () => {
    const fm = Array.from({ length: 20 }, () => "sheep:1:1").join(",");
    assert.equal(parse(`fm=${fm}`).foodRows.length, 8);
    assert.equal(parse("").foodRows.length, 0);
    assert.equal(encodeState(DEFAULT_STATE), "");
  });
});

describe("plantillas", () => {
  it("sólo incluye las unidades que existen en el catálogo", () => {
    const t = TEMPLATES.find((x) => x.id === "knights-xbows")!;
    assert.equal(templateLines(t, () => true).length, 2);
    assert.deepEqual(templateLines(t, (id) => id === "knight").map((l) => l.itemId), ["knight"]);
  });

  it("cada plantilla tiene líneas y una edad válida", () => {
    for (const t of TEMPLATES) {
      assert.ok(t.lines.length > 0, t.id);
      assert.ok(["feudal", "castle", "imperial", "dark"].includes(t.age), t.id);
    }
  });

  it("las líneas aplicadas tienen claves únicas", () => {
    const keys = TEMPLATES.flatMap((t) => templateLines(t, () => true)).map((l) => l.key);
    assert.equal(new Set(keys).size, keys.length);
  });
});
