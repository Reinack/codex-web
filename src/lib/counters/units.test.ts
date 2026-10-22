import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { UNIT_CATALOG, isShownUnit } from "./units.ts";

const firstOf = (kind: string) => UNIT_CATALOG.find((u) => u.kind === kind)!.id;

describe("visibilidad de unidades por civ", () => {
  it("sin civ elegida solo se ven las genéricas", () => {
    assert.ok(isShownUnit(firstOf("generic"), null));
    assert.ok(!isShownUnit(firstOf("regional"), null));
    assert.ok(!isShownUnit(firstOf("unique"), null));
  });

  it("únicas y regionales aparecen solo si una civ elegida las construye", () => {
    const regional = firstOf("regional");
    const unique = firstOf("unique");
    assert.ok(isShownUnit(regional, new Set([regional])));
    assert.ok(!isShownUnit(unique, new Set([regional])));
  });

  it("los ids que no están en el catálogo se muestran", () => {
    assert.ok(isShownUnit("woad-raider", null));
    assert.ok(isShownUnit(undefined, null));
  });
});
