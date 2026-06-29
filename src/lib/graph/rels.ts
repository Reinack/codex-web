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
};

export function relLabel(rel?: string | null): string {
  if (!rel) return "relacionado con";
  return REL_LABEL[rel] ?? rel.toLowerCase().replace(/_/g, " ");
}
