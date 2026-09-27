// Réplica del "Best Combo" del Matchup Advisor de aoe2matchup.com, adaptada a
// nuestro grafo curado de counters (no tenemos su motor de simulación 30v30/3k,
// así que trabajamos sobre las aristas COUNTERS reales con su weight).
//
// Idea del algoritmo original: elegir la unidad NÚCLEO que responde a más
// unidades de oro rivales y sumarle el mejor COMPAÑERO (idealmente del tipo
// opuesto oro↔trash) que cubra las amenazas que el núcleo no puede, minimizando
// el "gap" de unidades rivales sin respuesta. Se muestra "juntos responden N de
// M" y qué queda sin cubrir.

export interface ComboLine {
  id: string;
  label: string;
  imgKey?: string;
  role?: string | null; // gold | trash | siege | support
  status?: string | null; // green | yellow | red
}

export interface ComboTarget {
  id: string;
  label: string;
  imgKey?: string;
}

export interface ComboEdge {
  fromId?: string | null; // línea atacante (una de myLines)
  toId?: string | null; // línea defensora (uno de los targets)
  weight?: number | null;
}

export interface BestCombo {
  core: ComboLine;
  partner: ComboLine | null;
  covered: ComboTarget[]; // amenazas que el combo SÍ responde
  gap: ComboTarget[]; // amenazas que ni núcleo ni compañero responden
  coveredCount: number;
  total: number;
}

// ============================================================================
// Combo INSIGNIA de la civ (lo que la hace especial), inspirado en la página
// /civilizations de la referencia: cada civ tiene una identidad estratégica y
// unidades signature por rol. Acá elegimos la categoría militar dominante de la
// civ (radar) y sus mejores líneas en esa categoría, ordenadas por edad — para
// un Franco: Scout Cavalry → Knight/Cavalier/Paladin (su caballería bonificada).
// ============================================================================

export interface CivComboLine {
  id: string;
  label: string;
  imgKey?: string;
  bonus?: string[]; // etiquetas de bonus de civ para esta línea (señal de "signature")
}

export interface CivCombo {
  category: string; // categoría dominante (eje de radar), p. ej. "Caballería"
  units: CivComboLine[]; // apertura → núcleo (1-2 líneas de la categoría insignia)
  uu?: string | null; // unidad única (parte de la identidad)
  why?: string | null; // fortaleza/identidad en texto
}

// Índices de CATEGORY_AXES: [Infantería, Caballería, Arqueros, Asedio, Naval,
// Monjes, Defensa, Pólvora]. El core sale solo de categorías de ejército de
// campo (0-3); Naval/Monjes/Defensa/Pólvora no definen el combo insignia.
const CORE_CATEGORIES = [0, 1, 2, 3];

/** Clasifica una línea a un índice de CATEGORY_AXES por keywords del label. El
 * orden importa: "Cavalry Archer" y "Elephant Archer" caen en Arqueros, no en
 * Caballería; "Bombard Cannon" en Asedio, no en Arqueros. */
function categoryIndex(label: string): number {
  const s = label.toLowerCase();
  if (/galle|fire ship|fire galley|demolition|demo (raft|ship)|hulk|carrack|cannon galleon|longboat|caravel|turtle|dromon|thirisadai|dragon ship|lou chuan/.test(s)) return 4;
  if (/ram|mangonel|onager|scorpion|trebuchet|bombard|siege/.test(s)) return 3;
  if (/monk|priest|missionar/.test(s)) return 5;
  if (/archer|crossbow|arbalest|skirmisher|longbow|mangudai|chu ko nu|chukonu|rattan|genitour|slinger|war wagon|kipchak|composite|hand cannon|janissary|conquistador|gbeto/.test(s)) return 2;
  if (/cavalry|knight|cavalier|paladin|camel|lancer|elephant|cataphract|konnik|coustillier|tarkan|keshik|hussar|scout|boyar|shrivamsha|ratha|leitis|magyar|huszar|ghulam|savar|steppe/.test(s)) return 1;
  return 0; // infantería por defecto
}

/** Edad de entrada aproximada de la línea (por su unidad base) para ordenar
 * apertura → pico: 1 feudal, 2 castillo, 3 imperial. */
function lineAge(label: string): number {
  const base = label.split("/")[0].trim().toLowerCase();
  if (/scout|militia|man-at-arms|men-at-arms|^archer|skirmish|spearman|eagle scout/.test(base)) return 1;
  return 2;
}

const DEFAULT_WEIGHT = 0.5; // aristas sin weight curado pesan como counter suave
const STATUS_RANK: Record<string, number> = { green: 0, yellow: 1, red: 2 };

/** Construye myId -> (targetId -> weight) restringido a los targets dados. */
function buildCoverage(edges: ComboEdge[], targetIds: Set<string>): Map<string, Map<string, number>> {
  const cov = new Map<string, Map<string, number>>();
  for (const e of edges) {
    const from = e.fromId;
    const to = e.toId;
    if (!from || !to || !targetIds.has(to)) continue;
    const w = typeof e.weight === "number" ? e.weight : DEFAULT_WEIGHT;
    let row = cov.get(from);
    if (!row) {
      row = new Map();
      cov.set(from, row);
    }
    row.set(to, Math.max(row.get(to) ?? 0, w));
  }
  return cov;
}

/** Suma de weights de una cobertura (peso total con el que una línea responde). */
function coverScore(row: Map<string, number> | undefined): number {
  if (!row) return 0;
  let s = 0;
  for (const w of row.values()) s += w;
  return s;
}

/**
 * Replica del cálculo de "Best Combo": núcleo + compañero complementario que
 * maximiza la cobertura de `targets` (las líneas de oro rivales a responder).
 * Devuelve null si no hay ninguna respuesta curada.
 */
export function buildBestCombo(
  myLines: ComboLine[],
  targets: ComboTarget[],
  edges: ComboEdge[],
): BestCombo | null {
  if (myLines.length === 0 || targets.length === 0) return null;

  const targetById = new Map(targets.map((t) => [t.id, t]));
  const targetIds = new Set(targetById.keys());
  const cov = buildCoverage(edges, targetIds);

  // Candidatos: líneas propias que responden a al menos un target.
  const candidates = myLines.filter((l) => (cov.get(l.id)?.size ?? 0) > 0);
  if (candidates.length === 0) return null;

  const isGold = (l: ComboLine) => l.role === "gold";
  const statusOf = (l: ComboLine) => STATUS_RANK[l.status ?? ""] ?? 1;

  // Núcleo: mayor peso de cobertura; desempates por nº de amenazas cubiertas,
  // estado (verde > amarillo > rojo) y preferir una línea de oro (como el núcleo
  // de oro del original).
  const core = [...candidates].sort((a, b) => {
    const sa = coverScore(cov.get(a.id));
    const sb = coverScore(cov.get(b.id));
    if (sb !== sa) return sb - sa;
    const ca = cov.get(a.id)?.size ?? 0;
    const cb = cov.get(b.id)?.size ?? 0;
    if (cb !== ca) return cb - ca;
    if (statusOf(a) !== statusOf(b)) return statusOf(a) - statusOf(b);
    return (isGold(b) ? 1 : 0) - (isGold(a) ? 1 : 0);
  })[0];

  const coreCov = cov.get(core.id) ?? new Map();

  // Compañero: mayor cobertura MARGINAL (targets que el núcleo no responde).
  // Se prefiere el tipo opuesto (oro↔trash), como el sidekick del original.
  const coreGold = isGold(core);
  let partner: ComboLine | null = null;
  let partnerCov: Map<string, number> = new Map();
  let best = { marginalCount: 0, marginalScore: 0, opposite: false, status: 3 };

  for (const l of candidates) {
    if (l.id === core.id) continue;
    const row = cov.get(l.id) ?? new Map();
    let marginalCount = 0;
    let marginalScore = 0;
    for (const [tid, w] of row) {
      if (!coreCov.has(tid)) {
        marginalCount += 1;
        marginalScore += w;
      }
    }
    if (marginalCount === 0) continue;
    const opposite = coreGold ? !isGold(l) : isGold(l);
    const st = statusOf(l);
    const better =
      marginalCount > best.marginalCount ||
      (marginalCount === best.marginalCount &&
        (marginalScore > best.marginalScore ||
          (marginalScore === best.marginalScore &&
            ((opposite && !best.opposite) || (opposite === best.opposite && st < best.status)))));
    if (better) {
      partner = l;
      partnerCov = row;
      best = { marginalCount, marginalScore, opposite, status: st };
    }
  }

  // Unión de cobertura núcleo + compañero.
  const coveredIds = new Set<string>([...coreCov.keys(), ...partnerCov.keys()]);
  const covered = targets.filter((t) => coveredIds.has(t.id));
  const gap = targets.filter((t) => !coveredIds.has(t.id));

  return {
    core,
    partner,
    covered,
    gap,
    coveredCount: covered.length,
    total: targets.length,
  };
}

/**
 * Combo insignia de la civ: su categoría militar dominante (según el radar) y
 * las mejores líneas de esa categoría, ordenadas por edad (apertura → pico).
 * Las líneas con bonus de civ pesan como "signature". Devuelve null si no hay
 * datos suficientes.
 */
export function buildCivSignatureCombo(
  lines: CivComboLine[],
  radarCategory: number[] | null,
  categoryAxes: readonly string[],
  opts: { uu?: string | null; why?: string | null } = {},
): CivCombo | null {
  if (lines.length === 0) return null;

  const radarVal = (idx: number) => (radarCategory && radarCategory[idx] != null ? radarCategory[idx] : 5);
  const hasBonus = (l: CivComboLine) => (l.bonus?.length ?? 0) > 0;

  // Anotar cada línea con su categoría; descartar navales (no definen identidad
  // terrestre) y monjes/otros fuera de las categorías de core.
  const annotated = lines
    .map((l) => ({ line: l, cat: categoryIndex(l.label), age: lineAge(l.label) }))
    .filter((a) => CORE_CATEGORIES.includes(a.cat));
  if (annotated.length === 0) return null;

  // Elegir la categoría dominante: valor del radar + un empujón si la civ tiene
  // alguna línea bonificada en ella (su especialidad real).
  let domCat = -1;
  let domScore = -Infinity;
  for (const cat of CORE_CATEGORIES) {
    const inCat = annotated.filter((a) => a.cat === cat);
    if (inCat.length === 0) continue;
    const score = radarVal(cat) + (inCat.some((a) => hasBonus(a.line)) ? 2 : 0);
    if (score > domScore) {
      domScore = score;
      domCat = cat;
    }
  }
  if (domCat < 0) return null;

  // Mejores líneas de la categoría insignia: primero las bonificadas, desempate
  // por edad (más temprana = base del plan). Tomamos hasta 2 y las ordenamos
  // apertura → núcleo.
  const inCat = annotated.filter((a) => a.cat === domCat);
  inCat.sort((a, b) => {
    const ba = hasBonus(a.line) ? 1 : 0;
    const bb = hasBonus(b.line) ? 1 : 0;
    if (ba !== bb) return bb - ba;
    return a.age - b.age;
  });
  const picked = inCat.slice(0, 2).sort((a, b) => a.age - b.age);

  return {
    category: categoryAxes[domCat] ?? "",
    units: picked.map((a) => a.line),
    uu: opts.uu ?? null,
    why: opts.why ?? null,
  };
}
