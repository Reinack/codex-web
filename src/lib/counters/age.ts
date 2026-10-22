// Filtro del grafo de counters por edad. Cada línea trae su edad mínima (YAML del
// vault, `age` en el nodo) y cada relación un contexto: early vale hasta Castillos,
// late desde Castillos, general y en-masa siempre. Funciones puras: mismo criterio
// que filterByAge() del index.html de Express.
import type { CounterGraph, CyNodeData } from "@/lib/api/schema";

export const AGES = ["feudal", "castle", "imperial"] as const;
export type Age = (typeof AGES)[number];

const AGE_IDX: Record<string, number> = { dark: 0, feudal: 1, castle: 2, imperial: 3 };

export const isAge = (v: unknown): v is Age => typeof v === "string" && (AGES as readonly string[]).includes(v);

/** La línea todavía no existe en esa edad (sin `age` conocida, se asume que sí). */
export function arrivesAfter(unitAge: unknown, age: Age): boolean {
  return typeof unitAge === "string" && unitAge in AGE_IDX && AGE_IDX[unitAge] > AGE_IDX[age];
}

export function contextValidAt(context: unknown, age: Age | null): boolean {
  if (!age) return true;
  if (context === "early") return age !== "imperial";
  if (context === "late") return AGE_IDX[age] >= AGE_IDX.castle;
  return true;
}

type Ctx = { context: string; tier?: string; weight: number; nota?: string };

const strengthOf = (w: number) => (w >= 0.9 ? "hard" : w >= 0.65 ? "soft" : "situational");

function contextsOf(d: CyNodeData): Ctx[] | null {
  const raw = d.contexts;
  if (!Array.isArray(raw)) return null;
  return raw.filter(
    (x): x is Ctx => !!x && typeof x === "object" && typeof (x as Ctx).weight === "number",
  );
}

/** Saca las líneas que no existen en la edad y recalcula la fuerza de cada nodo
 *  con el contexto que vale en esa edad. Con age=null devuelve el grafo igual. */
export function filterByAge(graph: CounterGraph, age: Age | null): CounterGraph {
  if (!age) return graph;
  const nodes: CounterGraph["nodes"] = [];
  for (const n of graph.nodes) {
    const d = n.data;
    if (d.type !== "center" && arrivesAfter(d.age, age)) continue;
    const ctxs = d.type === "center" ? null : contextsOf(d);
    if (!ctxs) {
      nodes.push(n);
      continue;
    }
    const valid = ctxs.filter((x) => contextValidAt(x.context, age));
    if (valid.length === 0) continue;
    const best = valid.reduce((a, b) => (b.weight > a.weight ? b : a));
    const base = strengthOf(best.weight);
    nodes.push({
      data: {
        ...d,
        contexts: valid,
        tier: best.tier,
        nota: best.nota,
        weight: best.weight,
        context: best.context,
        type: d.dir === "beats" ? `beats-${base}` : base,
      },
    });
  }
  const keep = new Set(nodes.map((n) => n.data.id));
  const edges = graph.edges.filter(
    (e) => keep.has(e.data.source) && keep.has(e.data.target) && contextValidAt(e.data.context, age),
  );
  return { ...graph, nodes, edges };
}

/** Cuántos nodos hay de cada tipo (hard, soft, beats-hard…), para la leyenda. */
export function countByType(graph: CounterGraph): Record<string, number> {
  const out: Record<string, number> = {};
  for (const n of graph.nodes) {
    const t = n.data.type;
    if (t && t !== "center") out[t] = (out[t] ?? 0) + 1;
  }
  return out;
}
