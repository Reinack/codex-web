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

// Esquema de la salida YA transformada (lo que devuelve el BFF /api/civs). Lo usa
// el cliente para validar sin volver a aplicar el transform de CivListItemSchema.
export const CivListOutSchema = z.array(
  z.object({
    name: z.string(),
    slug: z.string(),
    title: z.string(),
    aliases: z.array(z.string()),
    tier: z.string().nullable(),
  }),
);

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

// --- GET /api/search?q=...  (título o alias ES/MX) -------------------------
export const SearchResultSchema = z
  .object({
    path: z.string(),
    title: z.string(),
    type: z.string().nullable().default(null),
    aliases: z.array(z.string()).nullable().default(null),
  })
  .transform((r) => ({
    path: r.path,
    title: r.title,
    type: r.type,
    slug: pathToSlug(r.path).toLowerCase(),
    aliases: r.aliases ?? [],
  }));
export const SearchResultsSchema = z.array(SearchResultSchema);
export type SearchResult = z.infer<typeof SearchResultSchema>;

// --- GET /api/graph?path=...  (subgrafo, formato vis from/to) ---------------
export const GraphSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      label: z.string().nullable().default(null),
      type: z.string().nullable().default(null),
    }),
  ),
  edges: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      rel: z.string().nullable().default(null),
    }),
  ),
});
export type GraphData = z.infer<typeof GraphSchema>;

// --- GET /api/note?path=...  (nota + vecinos) ------------------------------
export const NoteSchema = z.object({
  path: z.string(),
  title: z.string(),
  type: z.string().nullable().default(null),
  aliases: z.array(z.string()).nullable().default(null),
  neighbors: z
    .array(
      z.object({
        path: z.string(),
        title: z.string(),
        type: z.string().nullable().default(null),
        rel: z.string().nullable().default(null),
      }),
    )
    .default([]),
});
export type NoteData = z.infer<typeof NoteSchema>;

// --- GET /api/matchup?me=&vs=&map=  (Matchup Lab) --------------------------
const MatchupCivSchema = z
  .object({ title: z.string(), path: z.string(), aliases: z.array(z.string()).nullable().default(null) })
  .catchall(z.unknown());
const CounterEdgeSchema = z
  .object({
    from: z.string(),
    target: z.string(),
    fromImg: z.string().nullable().optional(),
    targetImg: z.string().nullable().optional(),
    weight: z.number().nullable().optional(),
    strength: z.string().nullable().optional(),
    context: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .catchall(z.unknown());
const KitSchema = z
  .object({
    uniqueUnits: z.array(z.object({ title: z.string() }).catchall(z.unknown())).default([]),
    uniqueTechs: z.array(z.object({ title: z.string() }).catchall(z.unknown())).default([]),
    tiers: z
      .array(z.object({ list: z.string(), tier: z.string().nullable() }).catchall(z.unknown()))
      .default([]),
  })
  .catchall(z.unknown());
export const MatchupSchema = z
  .object({
    me: MatchupCivSchema,
    vs: MatchupCivSchema,
    kits: z.object({ me: KitSchema, vs: KitSchema }),
    counters: z.object({
      answers: z.array(CounterEdgeSchema).default([]),
      threats: z.array(CounterEdgeSchema).default([]),
    }),
    sharedNotes: z
      .array(
        z.object({
          note: z.string(),
          heading: z.string().nullable().optional(),
          excerpt: z.string().nullable().optional(),
        }),
      )
      .default([]),
    plan: z.array(z.string()).default([]),
    planVs: z.array(z.string()).default([]),
  })
  .catchall(z.unknown());
export type Matchup = z.infer<typeof MatchupSchema>;
export type CounterEdge = z.infer<typeof CounterEdgeSchema>;

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
