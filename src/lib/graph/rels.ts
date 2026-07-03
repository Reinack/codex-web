// Etiquetas legibles para los tipos de relación de Neo4j, compartidas por el
// explorador (aristas) y el panel de detalle (vecinos agrupados). i18n-ready:
// a futuro se puede mover a un diccionario por idioma.
export const REL_LABEL: Record<string, string> = {
  LINKS_TO: "relacionado con",
  UPGRADES_TO: "se mejora a",
  HAS_UNIQUE_UNIT: "unidad única de",
  HAS_UNIQUE_TECH: "tecnología única de",
  COUNTERS: "counterea a",
  RATED: "rankeada en",
  DEFINES: "define",
  HAS_UNIT: "tiene",
  HAS_TECH: "tiene tech",
  HAS_BUILDING: "tiene edificio",
  // Aristas de juego derivadas del tech-tree (web/techtree/edges.mjs)
  AFFECTS: "afecta a",
  TRAINS: "entrena",
  RESEARCHES: "investiga",
  ENABLES: "habilita",
  // Aristas de meta-juego (rag/codex_rag/import_meta_edges.py)
  WON: "ganó",
  RUNNER_UP: "subcampeón en",
  PARTICIPATED_IN: "participó en",
  USED_MAP: "usó el mapa",
  IS_TYPE: "es de tipo",
};

export function relLabel(rel?: string | null): string {
  if (!rel) return "relacionado con";
  return REL_LABEL[rel] ?? rel.toLowerCase().replace(/_/g, " ");
}
