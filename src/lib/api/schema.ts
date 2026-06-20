// Contrato tipado del backend de aoe2-codex.
//
// Cada esquema describe EXACTAMENTE lo que devuelve un endpoint del Express
// (ver aoe2-codex/web/server.js) y lo normaliza en el borde con `.transform()`:
// el resto de la app trabaja con `slug` limpio, nunca con el `path` crudo de Neo4j.
import { z } from "zod";

/** "civs/aztecs.md" -> "aztecs"  ·  "units/unique/jaguar.md" -> "jaguar" */
export function pathToSlug(path: string): string {
  return path.replace(/^.*\//, "").replace(/\.md$/, "");
}

// --- GET /api/civs  (listado) ----------------------------------------------
// Backend: { path, title, aliases: string[]|null, tierArabia: string|null }
// Ojo con la casing: las notas en Neo4j son title-case ("civs/Khmer.md") pero
// los emblemas PNG son lowercase ("khmer.png"). Exponemos:
//   - `name`: basename original ("Khmer") → para el lookup case-sensitive del detalle
//   - `slug`: lowercase ("khmer")        → para URLs idiomáticas y para el emblema
export const CivListItemSchema = z
  .object({
    path: z.string(),
    title: z.string(),
    aliases: z.array(z.string()).nullable().default(null),
    tierArabia: z.string().nullable().default(null),
  })
  .transform((c) => {
    const name = pathToSlug(c.path);
    return {
      name,
      slug: name.toLowerCase(),
      title: c.title,
      aliases: c.aliases ?? [],
      tier: c.tierArabia,
    };
  });
export const CivListSchema = z.array(CivListItemSchema);
export type CivListItem = z.infer<typeof CivListItemSchema>;

// --- GET /api/civ/:slug  (detalle) -----------------------------------------
const NoteRefSchema = z.object({ title: z.string(), path: z.string() });
export const CivDetailSchema = z
  .object({
    path: z.string(),
    title: z.string(),
    aliases: z.array(z.string()).nullable().default(null),
    type: z.string().nullable().default(null),
    uniqueUnits: z.array(NoteRefSchema).default([]),
    uniqueTechs: z.array(NoteRefSchema).default([]),
    tiers: z
      .array(z.object({ list: z.string(), tier: z.string().nullable() }))
      .default([]),
  })
  .transform((c) => ({
    slug: pathToSlug(c.path).toLowerCase(),
    title: c.title,
    aliases: c.aliases ?? [],
    type: c.type,
    uniqueUnits: c.uniqueUnits.map((u) => ({ title: u.title, slug: pathToSlug(u.path) })),
    uniqueTechs: c.uniqueTechs.map((t) => ({ title: t.title, slug: pathToSlug(t.path) })),
    tiers: c.tiers,
  }));
export type CivDetail = z.infer<typeof CivDetailSchema>;

// --- GET /api/stats --------------------------------------------------------
// El helper run() de db.js ya convierte los Integer de Neo4j a números JS planos.
export const StatsSchema = z.object({
  notes: z.number(),
  links: z.number(),
  uu: z.number(),
  ut: z.number(),
});
export type Stats = z.infer<typeof StatsSchema>;

// --- GET /api/counter-graph?unit=...  (formato Cytoscape) ------------------
// El backend ya emite elementos { data: {...} } listos para Cytoscape.
// Tipamos las claves conocidas y dejamos pasar el resto (contexts, uid, full...).
const CyNodeDataSchema = z
  .object({
    id: z.string(),
    label: z.string().optional(),
    type: z.string().optional(),
    imgKey: z.string().optional(),
    img: z.string().optional(), // URL del ícono, inyectada por el BFF
    weight: z.number().optional(),
    tier: z.string().optional(),
    nota: z.string().optional(),
    dir: z.string().optional(),
    context: z.string().optional(),
  })
  .catchall(z.unknown());
const CyEdgeDataSchema = z
  .object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    weight: z.number().optional(),
    strength: z.string().optional(),
  })
  .catchall(z.unknown());

export const CounterGraphSchema = z.object({
  heading: z.string(),
  unitId: z.string().optional(),
  nodes: z.array(z.object({ data: CyNodeDataSchema })),
  edges: z.array(z.object({ data: CyEdgeDataSchema })),
  notes: z.array(z.string()).default([]),
  source: z.string(),
});
export type CounterGraph = z.infer<typeof CounterGraphSchema>;
export type CyNodeData = z.infer<typeof CyNodeDataSchema>;

// --- POST /api/chat  (GraphRAG, respuesta de una sola pasada) ---------------
// El backend hace shell-out a Python y devuelve UN JSON (no streaming).
// `hits_meta` es lo que alimenta el panel "Ver razonamiento".
export const ChatResponseSchema = z.object({
  text: z.string(),
  sources: z.array(z.unknown()).default([]),
  abstained: z.boolean().default(false),
  max_score: z.number().default(0),
  related: z.array(z.string()).default([]),
  hits_meta: z
    .array(z.object({ note: z.string(), heading: z.string(), score: z.number() }))
    .default([]),
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
