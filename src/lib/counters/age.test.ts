import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { arrivesAfter, contextValidAt, countByType, filterByAge } from "./age.ts";
import type { CounterGraph } from "@/lib/api/schema";

// Recorte real de /api/counter-graph?unit=knight (pesos y contextos del vault).
const graph: CounterGraph = {
  heading: "Knight / Cavalier / Paladin",
  unitId: "knight-line",
  source: "graph",
  notes: [],
  nodes: [
    { data: { id: "center", type: "center", age: "castle" } },
    {
      data: {
        id: "c0", uid: "spearman-line", type: "hard", dir: "counter", age: "feudal", weight: 1,
        contexts: [
          { context: "late", tier: "PRIMARIO", weight: 1, nota: "" },
          { context: "early", tier: "SÓLIDO", weight: 0.7, nota: "" },
        ],
      },
    },
    {
      data: {
        id: "b0", uid: "mangonel-line", type: "beats-soft", dir: "beats", age: "castle", weight: 0.7,
        contexts: [{ context: "early", tier: "SÓLIDO", weight: 0.7, nota: "Snipear el Mangonel" }],
      },
    },
    {
      data: {
        id: "b1", uid: "bombard-cannon", type: "beats-hard", dir: "beats", age: "imperial", weight: 1,
        contexts: [{ context: "general", tier: "PRIMARIO", weight: 1, nota: "" }],
      },
    },
  ],
  edges: [
    { data: { id: "e0", source: "c0", target: "center", context: "late" } },
    { data: { id: "e1", source: "c0", target: "center", context: "early" } },
    { data: { id: "e2", source: "center", target: "b0", context: "early" } },
    { data: { id: "e3", source: "center", target: "b1", context: "general" } },
  ],
};

const ids = (g: CounterGraph) => g.nodes.map((n) => n.data.id);

describe("filtro de counters por edad", () => {
  it("sin edad no toca nada", () => {
    assert.equal(filterByAge(graph, null), graph);
  });

  it("early vale hasta Castillos y late desde Castillos", () => {
    assert.ok(contextValidAt("early", "feudal") && contextValidAt("early", "castle"));
    assert.ok(!contextValidAt("early", "imperial"));
    assert.ok(!contextValidAt("late", "feudal") && contextValidAt("late", "imperial"));
    assert.ok(contextValidAt("en-masa", "feudal") && contextValidAt("general", "imperial"));
  });

  it("oculta las líneas que todavía no existen", () => {
    assert.ok(arrivesAfter("imperial", "castle"));
    assert.ok(!arrivesAfter("castle", "castle") && !arrivesAfter(undefined, "feudal"));
    assert.deepEqual(ids(filterByAge(graph, "castle")), ["center", "c0", "b0"]);
  });

  it("recalcula la fuerza con el contexto vigente", () => {
    const castle = filterByAge(graph, "castle").nodes.find((n) => n.data.id === "c0")!.data;
    assert.equal(castle.type, "hard");
    assert.equal(castle.context, "late");
    const imperial = filterByAge(graph, "imperial");
    // El Mangonel solo tiene una relación early: en Imperial desaparece.
    assert.deepEqual(ids(imperial), ["center", "c0", "b1"]);
    assert.deepEqual(imperial.edges.map((e) => e.data.id), ["e0", "e3"]);
  });

  it("cuenta por tipo para la leyenda", () => {
    assert.deepEqual(countByType(filterByAge(graph, "imperial")), { hard: 1, "beats-hard": 1 });
  });
});
