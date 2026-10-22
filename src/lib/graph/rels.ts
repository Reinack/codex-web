// Etiquetas legibles para los tipos de relación de Neo4j, compartidas por el
// explorador (aristas) y el panel de detalle (vecinos agrupados). Cada tipo tiene
// dos lecturas: saliente (desde la nota de origen: "Knight evoluciona a Cavalier")
// y entrante (desde la de destino: "Cavalier evoluciona de Knight").
// Las relaciones de la wiki se definen en aoe2-codex/ingest/codex/relations.py
// (RELACIONES): si se agrega un tipo allá, se agrega acá. i18n-ready: a futuro se
// puede mover a un diccionario por idioma.
export const REL_LABEL: Record<string, [string, string]> = {
  // Genérico: un wikilink sin contexto que diga qué relación es.
  LINKS_TO: ["menciona", "mencionada en"],
  RELATED_TO: ["relacionado con", "relacionado con"],
  // Unidades, techs y edificios
  UPGRADES_TO: ["evoluciona a", "evoluciona de"],
  IMPROVES: ["mejora a", "mejorada por"],
  AFFECTS: ["afecta a", "afectada por"],
  REQUIRES: ["requiere", "requisito de"],
  ENABLES: ["habilita", "habilitada por"],
  TRAINS: ["entrena", "se entrena en"],
  RESEARCHES: ["investiga", "se investiga en"],
  COUNTERS: ["counterea a", "counterada por"],
  // Civs
  HAS_UNIT: ["tiene la unidad", "disponible para"],
  HAS_TECH: ["tiene la tecnología", "disponible para"],
  HAS_BUILDING: ["tiene el edificio", "disponible para"],
  LACKS: ["no tiene", "no disponible para"],
  HAS_UNIQUE_UNIT: ["unidad única", "unidad única de"],
  HAS_UNIQUE_TECH: ["tecnología única", "tecnología única de"],
  BONUS_ON: ["bonifica a", "bonificada por"],
  SYNERGY_WITH: ["sinergia en equipo con", "sinergia en equipo con"],
  BENEFITS_FROM: ["aprovecha el bonus de equipo de", "su bonus de equipo le sirve a"],
  HAS_MATCHUP: ["matchup", "matchup de"],
  // Matchups, mapas y estrategias
  FAVORS: ["favorece a", "favorecida en"],
  PLAYED_ON: ["se jugó en", "matchup jugado acá"],
  IS_TYPE: ["es de tipo", "mapa de este tipo"],
  SUITS: ["recomendada para", "estrategia recomendada"],
  USES: ["usa", "usada en"],
  // Meta
  RANKS: ["rankea a", "rankeada en"],
  RATED: ["rankeada en", "rankea a"],
  FEATURES: ["incluye a", "figura en"],
  CHANGES: ["modifica a", "modificada en"],
  DEFINES: ["define", "definido en"],
  // Aristas de meta-juego (rag/codex_rag/import_meta_edges.py)
  WON: ["ganó", "ganado por"],
  RUNNER_UP: ["subcampeón en", "subcampeón"],
  PARTICIPATED_IN: ["participó en", "participante"],
  USED_MAP: ["usó el mapa", "usado en"],
};

/** Etiqueta de una relación. `out` = la relación sale de la nota que se está mirando. */
export function relLabel(rel?: string | null, out = true): string {
  if (!rel) return "menciona";
  const pair = REL_LABEL[rel];
  if (!pair) return rel.toLowerCase().replace(/_/g, " ");
  return out ? pair[0] : pair[1];
}
