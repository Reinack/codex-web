import { test } from "node:test";
import assert from "node:assert/strict";
import { splitNames } from "./iconize.ts";
import { EMPTY_CATALOG, type GkCatalog } from "./types.ts";

const cat: GkCatalog = {
  ...EMPTY_CATALOG,
  names: { "man-at-arms": "manatarms", castle: "castle", mill: "mill", "feudal age": "feudalage" },
};

test("reconoce nombres y conserva el resto del texto", () => {
  const parts = splitNames("Click a Feudal Age, Mill y Castle.", cat);
  assert.deepEqual(parts.filter((p) => p.id).map((p) => p.id), ["feudalage", "mill", "castle"]);
  assert.equal(parts.map((p) => p.text).join(""), "Click a Feudal Age, Mill y Castle.");
});

test("no corta palabras más largas ni distingue mayúsculas", () => {
  assert.equal(splitNames("castles y millones", cat).some((p) => p.id), false);
  assert.equal(splitNames("MILL", cat)[0].id, "mill");
});

test("nombres compuestos con guiones", () => {
  assert.equal(splitNames("sube a Man-at-Arms", cat).find((p) => p.id)?.id, "manatarms");
});

test("catálogo vacío: devuelve el texto entero", () => {
  assert.deepEqual(splitNames("Mill", EMPTY_CATALOG), [{ text: "Mill" }]);
});
