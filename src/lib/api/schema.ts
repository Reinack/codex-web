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

// GET /api/civ-units?civ= → líneas construibles + unidades únicas de una civ.
export const CivUnitsSchema = z.object({
  civ: z.string(),
  slug: z.string(),
  units: z.array(z.string()).default([]),
  uniqueUnits: z
    .array(z.object({ title: z.string(), treeId: z.string().nullable().optional() }).catchall(z.unknown()))
    .default([]),
});
export type CivUnits = z.infer<typeof CivUnitsSchema>;

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

// --- GET /api/note?path=...[&content=1]  (nota + vecinos [+ artículo]) -------
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
  // Solo con ?content=1: el artículo, una sección H2 por elemento (desde los :Chunk).
  sections: z
    .array(z.object({ heading: z.string(), text: z.string() }))
    .default([]),
  // Solo con ?content=1: destinos de sus [[wikilinks]] (LINKS_TO, sin límite).
  links: z.array(z.object({ path: z.string(), title: z.string() })).default([]),
});
export type NoteData = z.infer<typeof NoteSchema>;

// --- GET /api/matchup?me=&vs=&map=  (Matchup Lab) --------------------------
const MatchupCivSchema = z
  .object({
    title: z.string(),
    path: z.string(),
    slug: z.string(),
    aliases: z.array(z.string()).nullable().default(null),
  })
  .catchall(z.unknown());
const CounterEdgeSchema = z
  .object({
    from: z.string(),
    target: z.string(),
    fromId: z.string().nullable().optional(),
    toId: z.string().nullable().optional(),
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
const PhosphorSchema = z
  .object({
    civ: z.string(),
    tier: z.string(),
    uu: z.string().nullable().optional(),
    strength: z.string(), // "fuerte" | "viable" | "débil" | "defensivo"
    defensive: z.boolean().optional(),
  })
  .catchall(z.unknown());
const TraitsSchema = z
  .object({
    strengths: z.array(z.string()).default([]),
    weaknesses: z.array(z.string()).default([]),
  })
  .catchall(z.unknown());
const MissingSchema = z
  .object({ unit: z.string(), self: z.string(), opp: z.string() })
  .catchall(z.unknown());
// "Cómo jugar CONTRA X" — bullets de counter-play ya invertidos (mecánica
// propia de la civ → consejo para el rival), parseados desde el vault.
const CounterPlaySchema = z
  .object({ me: z.array(z.string()).default([]), vs: z.array(z.string()).default([]) })
  .catchall(z.unknown());
// Una entrada de "En Matchups Documentados": cita un matchup real/teórico con
// síntesis táctica propia desde la perspectiva de la civ que la escribió.
const DocumentedMatchupEntrySchema = z
  .object({
    heading: z.string(),
    matchupFile: z.string().nullable().optional(),
    opponent: z.string().nullable().optional(),
    bullets: z.array(z.string()).default([]),
    recordar: z.string().nullable().optional(),
  })
  .catchall(z.unknown());
const DocumentedMatchupsSchema = z
  .object({
    me: z.array(DocumentedMatchupEntrySchema).default([]),
    vs: z.array(DocumentedMatchupEntrySchema).default([]),
  })
  .catchall(z.unknown());

// Bonus de civ aplicado a una línea ("propio"/"ajeno" + etiquetas de bonus).
const LineBonusSchema = z
  .object({ tag: z.string().optional(), labels: z.array(z.string()).default([]) })
  .catchall(z.unknown());
// Líneas construibles de una civ (top-level `lines.me` / `lines.vs`).
const CivLineSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    imgKey: z.string().default(""),
    bonus: LineBonusSchema.nullable().optional(),
    eco: z.array(z.string()).default([]),
  })
  .catchall(z.unknown());
// Contraparte (unidad rival) de un hueco o riesgo de una línea propia.
const GapRiskSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    weight: z.number().nullable().optional(),
    context: z.string().nullable().optional(),
  })
  .catchall(z.unknown());
// Una línea propia analizada: rol, semáforo, huecos que el rival no contesta y
// riesgos que sí. Base del tablero "dónde pegás / dónde te pegan".
const ExploitLineSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    role: z.string().nullable().optional(), // gold | trash | siege | support
    status: z.string().nullable().optional(), // green | yellow | red
    gaps: z.array(GapRiskSchema).default([]),
    risks: z.array(GapRiskSchema).default([]),
    bonus: LineBonusSchema.nullable().optional(),
    eco: z.array(z.string()).default([]),
  })
  .catchall(z.unknown());
// Combo canónico (military.md): nombre, edad recomendada, por qué, y si en este
// cruce alguna pieza está en riesgo.
const RecipeSchema = z
  .object({
    name: z.string(),
    age: z.string().nullable().optional(),
    why: z.string().nullable().optional(),
    risky: z.boolean().optional(),
  })
  .catchall(z.unknown());
// Composición sugerida de 3 unidades: oro (línea explotable), trash (cubre el
// riesgo del oro) y asedio.
const CompositionSchema = z
  .object({
    gold: z.string().nullable().optional(),
    goldBonus: LineBonusSchema.nullable().optional(),
    trash: z.string().nullable().optional(),
    trashBonus: LineBonusSchema.nullable().optional(),
    trashCovers: z.string().nullable().optional(),
    siege: z.string().nullable().optional(),
  })
  .catchall(z.unknown());
const ExploitsSchema = z
  .object({
    lines: z.array(ExploitLineSchema).default([]),
    recipes: z.array(RecipeSchema).default([]),
    composition: CompositionSchema.nullable().default(null),
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
    // Alerta de Phosphor Rush (FC all-in Arabia, tier list de Red Fosforu).
    // optional: el backend de Render puede no tenerlo hasta el próximo deploy.
    phosphorRush: z
      .object({
        me: PhosphorSchema.nullable().default(null),
        vs: PhosphorSchema.nullable().default(null),
      })
      .optional(),
    // Fortalezas/Debilidades autorales + unidades faltantes con implicancia.
    traits: z.object({ me: TraitsSchema, vs: TraitsSchema }).optional(),
    missing: z
      .object({ me: z.array(MissingSchema).default([]), vs: z.array(MissingSchema).default([]) })
      .optional(),
    // Counter-play autoral (vault) — "Cómo jugar CONTRA X" de cada lado.
    counterPlay: CounterPlaySchema.optional(),
    // Matchups documentados de este cruce específico, uno por perspectiva.
    documentedMatchups: DocumentedMatchupsSchema.optional(),
    // Líneas construibles de cada civ (para íconos y lookup de imgKey por id).
    lines: z
      .object({ me: z.array(CivLineSchema).default([]), vs: z.array(CivLineSchema).default([]) })
      .optional(),
    // Análisis de huecos: qué explotar y qué combos armar. `exploits` es lo tuyo,
    // `vsExploits` lo del rival (para anticipar su composición probable).
    exploits: ExploitsSchema.optional(),
    vsExploits: ExploitsSchema.optional(),
  })
  .catchall(z.unknown());
export type Matchup = z.infer<typeof MatchupSchema>;
export type PhosphorTier = z.infer<typeof PhosphorSchema>;
export type CivTraits = z.infer<typeof TraitsSchema>;
export type MissingUnit = z.infer<typeof MissingSchema>;
export type CounterPlay = z.infer<typeof CounterPlaySchema>;
export type DocumentedMatchupEntry = z.infer<typeof DocumentedMatchupEntrySchema>;
export type DocumentedMatchups = z.infer<typeof DocumentedMatchupsSchema>;
export type CounterEdge = z.infer<typeof CounterEdgeSchema>;
export type CivLine = z.infer<typeof CivLineSchema>;
export type ExploitLine = z.infer<typeof ExploitLineSchema>;
export type Recipe = z.infer<typeof RecipeSchema>;
export type Composition = z.infer<typeof CompositionSchema>;

// --- GET /api/eco-catalog  (calculadora de producción: catálogo) -----------
// Espejo de lib/eco.mjs → catalog(). Se mantiene laxo (.catchall/.passthrough)
// porque el modelo económico crece; la UI solo consume lo que tipa acá.
const CostSchema = z.object({
  food: z.number().default(0),
  wood: z.number().default(0),
  gold: z.number().default(0),
  stone: z.number().default(0),
});
export const EcoItemSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    kind: z.enum(["unit", "building"]),
    category: z.string(),
    variant: z.string().default("generic"),
    age: z.string(),
    cost: CostSchema,
    time: z.number(),
    imgPath: z.string().nullable().optional(),
    timeApprox: z.boolean().optional(),
  })
  .passthrough();
const EcoSourceSchema = z
  .object({
    label: z.string(),
    resource: z.string(),
    ratePerAge: z.record(z.string(), z.number()),
    techs: z.array(z.string()).optional(),
    perUnit: z.string().optional(),
  })
  .passthrough();
const EcoTechSchema = z
  .object({ name: z.string(), affects: z.array(z.string()).default([]), mod: z.record(z.string(), z.unknown()) })
  .passthrough();
export const EcoCatalogSchema = z.object({
  items: z.array(EcoItemSchema),
  sources: z.record(z.string(), EcoSourceSchema),
  defaults: z.record(z.string(), z.record(z.string(), z.unknown())),
  passive: z.record(z.string(), z.unknown()),
  supplyTechs: z.record(z.string(), EcoTechSchema),
  demandTechs: z.record(z.string(), EcoTechSchema).default({}),
  resources: z.array(z.string()),
  ages: z.array(z.string()),
  civs: z.array(z.string()),
  // Construibilidad por civ (ids de item). Ausente si el backend es viejo.
  buildable: z.record(z.string(), z.array(z.string())).default({}),
});
export type EcoCatalog = z.infer<typeof EcoCatalogSchema>;
export type EcoItem = z.infer<typeof EcoItemSchema>;

// --- POST /api/production  (calculadora de producción: resultado) ----------
const PerResourceSchema = z
  .object({
    demandPerMin: z.number(),
    fixedIncomePerMin: z.number().default(0),
    reseedPerMin: z.number().optional(), // solo madera
    fillSource: z.string().nullable().default(null),
    ratePerMin: z.number(),
    fillVillagers: z.number().nullable(),
  })
  .passthrough();
const ContributorSchema = z.object({
  source: z.string(),
  label: z.string(),
  resource: z.string(),
  count: z.number(),
  ratePerMin: z.number(),
  producedPerMin: z.number(),
});
export const ProductionSchema = z
  .object({
    input: z.record(z.string(), z.unknown()),
    perItem: z.array(
      z
        .object({
          id: z.string(),
          name: z.string(),
          kind: z.string(),
          lines: z.number(),
          cost: CostSchema,
          time: z.number(),
          drainPerMin: CostSchema,
        })
        .passthrough(),
    ),
    perResource: z.object({
      food: PerResourceSchema,
      wood: PerResourceSchema,
      gold: PerResourceSchema,
      stone: PerResourceSchema,
    }),
    contributors: z.array(ContributorSchema).default([]),
    contributorVillagers: z.number().default(0),
    fillVillagers: z.number().default(0),
    total: z.number(),
    bottleneck: z.string(),
    reseedWood: z
      .object({
        totalPerMin: z.number(),
        breakdown: z.array(z.object({ source: z.string(), label: z.string(), woodPerMin: z.number() })),
      })
      .optional(),
    passiveIncome: CostSchema,
    heuristics: z.array(z.string()).default([]),
    appliedCivMods: z.array(z.record(z.string(), z.unknown())).nullable().default(null),
  })
  .passthrough();
export type Production = z.infer<typeof ProductionSchema>;
export type ProductionContributor = z.infer<typeof ContributorSchema>;

// --- GET /api/civ-radar/:slug  (perfil de fuerza, generado desde el vault) --
export const RadarSchema = z.object({
  phase: z.array(z.number()),
  category: z.array(z.number()),
});
export type RadarData = z.infer<typeof RadarSchema>;

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

// --- GET /api/catalog[?type=...]  (notas por categoría del vault) -----------
export const CatalogCountsSchema = z.array(
  z.object({ type: z.string(), count: z.coerce.number() }),
);
export type CatalogCounts = z.infer<typeof CatalogCountsSchema>;

export const CatalogItemsSchema = z.array(
  z.object({
    path: z.string(),
    title: z.string(),
    aliases: z.array(z.string()).nullable().default(null),
    degree: z.coerce.number().default(0),
    group: z.string().nullable().default(null),
  }),
);
export type CatalogItem = z.infer<typeof CatalogItemsSchema>[number];
