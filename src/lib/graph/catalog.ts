// Grupos del catálogo del grafo. La API manda en `group` el campo `catalogo` de la
// wiki ("Genéricas › Caballería", "Únicas › Imperial Age", "Europa Occidental"),
// que sigue los navboxes de la wiki de Fandom (AoE-Wiki/_tools/catalogo.py), o la
// subcarpeta para las notas sin clasificar.
//
// El orden replica ORDEN_SECCIONES / ORDEN_GRUPOS de catalogo.py: si cambia allá,
// se cambia acá.

export const SECTION_SEP = " › ";

const SECTION_ORDER = ["Genéricas", "Regionales", "Únicas", "Civiles", "Militares"];
const GROUP_ORDER = [
  // unidades y edificios
  "Civiles", "Infantería", "Arquería", "Caballería", "Asedio", "Naval", "Monjes", "Héroes",
  "Producción", "Producción fortificada", "Depósito", "Investigación", "Religiosos",
  "Recursos", "Torres", "Murallas", "Varios",
  // techs genéricas y regionales
  "Avance de edad", "Economía", "Infraestructura", "Militares", "Otras", "Mejoras de unidades",
  // techs únicas, por edad (cada civ tiene una de Castle y una de Imperial)
  "Castle Age", "Imperial Age",
  // estrategias y meta, por clase de contenido
  "Parche y meta vigente", "Tier lists", "Tops", "Guías", "Fundamentos", "Build orders",
  "Planes de juego", "Mecánicas de juego",
];
// Siempre al final de su nivel.
const LAST = ["Varios", "Otras", "Otros", "Panoramas", "General"];

// Las etiquetas vienen en español (idioma de la wiki); en inglés se traducen.
const EN: Record<string, string> = {
  Genéricas: "Generic", Regionales: "Regional", Únicas: "Unique", Militares: "Military",
  Civiles: "Civilian", Infantería: "Infantry", Arquería: "Archers", Caballería: "Cavalry",
  Asedio: "Siege", Naval: "Ships", Monjes: "Monks", Héroes: "Heroes", Varios: "Miscellaneous",
  Producción: "Production", "Producción fortificada": "Fortified production",
  Depósito: "Drop-off", Investigación: "Research", Religiosos: "Religious",
  Recursos: "Resources", Torres: "Towers", Murallas: "Walls",
  "Avance de edad": "Age advance", Economía: "Economy", Infraestructura: "Infrastructure",
  Otras: "Other", "Mejoras de unidades": "Unit upgrades", Panoramas: "Overviews",
  África: "African", Centroamérica: "Central American", "Asia Central": "Central Asian",
  "Europa Central": "Central European", "Asia Oriental": "East Asian",
  "Europa del Este": "Eastern European", Mediterráneo: "Mediterranean",
  "Medio Oriente": "Middle Eastern", "Europa del Norte": "Northern European",
  Sudamérica: "South American", "Asia del Sur": "South Asian",
  "Sudeste Asiático": "Southeast Asian", "Europa Occidental": "Western European",
  // mapas, por tipo (título de la nota maps/tipo-*)
  "Mapas abiertos": "Open maps", "Mapas semiabiertos": "Semi-open maps",
  "Mapas cerrados": "Closed maps", "Mapas de agua": "Water maps", "Mapas híbridos": "Hybrid maps",
  "Mapas nómadas": "Nomad maps", "Mapas caóticos": "Chaotic maps", Otros: "Other",
  // estrategias y meta
  "Parche y meta vigente": "Current patch & meta", Tops: "Top lists", Guías: "Guides",
  Fundamentos: "Fundamentals", "Planes de juego": "Game plans",
  "Mecánicas de juego": "Game mechanics",
};

/** "Genéricas › Caballería" → { section: "Genéricas", group: "Caballería" }. */
export function splitGroup(key: string): { section: string | null; group: string } {
  const i = key.indexOf(SECTION_SEP);
  return i < 0 ? { section: null, group: key } : { section: key.slice(0, i), group: key.slice(i + SECTION_SEP.length) };
}

/** Clave de grupo de una nota: su `catalogo` o, si no tiene, su subcarpeta legible. */
export function groupKey(g: string | null): string {
  if (!g) return "General";
  if (g.includes(SECTION_SEP) || /[A-ZÁÉÍÓÚ ]/.test(g)) return g;
  const s = g.replace(/[-_]/g, " "); // subcarpeta: "unique-techs" → "Unique techs"
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function catalogLabel(label: string, locale: string): string {
  return locale === "en" ? (EN[label] ?? label) : label;
}

function rank(label: string | null, order: string[]): [number, number, string] {
  if (!label) return [0, -1, ""];
  return [LAST.includes(label) ? 1 : 0, order.includes(label) ? order.indexOf(label) : order.length, label];
}

function cmp(a: [number, number, string], b: [number, number, string]): number {
  return a[0] - b[0] || a[1] - b[1] || a[2].localeCompare(b[2]);
}

// Primer nivel: una sección (Genéricas…) o, en las categorías de un solo nivel
// (estrategias, meta, mapas, civs), directamente el grupo.
function firstLevel(k: { section: string | null; group: string }): [number, number, string] {
  if (k.section) return rank(k.section, SECTION_ORDER);
  return SECTION_ORDER.includes(k.group) ? rank(k.group, SECTION_ORDER) : rank(k.group, GROUP_ORDER);
}

/** Ordena las claves de grupo como los navboxes: sección, después grupo. */
export function compareGroupKeys(a: string, b: string): number {
  const sa = splitGroup(a);
  const sb = splitGroup(b);
  return cmp(firstLevel(sa), firstLevel(sb)) || cmp(rank(sa.group, GROUP_ORDER), rank(sb.group, GROUP_ORDER));
}
