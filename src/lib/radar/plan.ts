import { CATEGORY_AXES } from "./data";

// Genera "plan" y "amenazas" a partir del radar de una civ (y opcionalmente del
// rival, para hacerlo matchup-aware). A diferencia del plan del backend —que sale
// del grafo de counters y es simétrico entre civs— esto lee los ejes del radar,
// que SON los puntos fuertes/débiles propios de cada civ → el texto varía por civ.
//
// Índices (ver lib/radar/data.ts):
//   category: 0 Infantería · 1 Caballería · 2 Arqueros · 3 Asedio · 4 Naval · 5 Monjes · 6 Defensa · 7 Pólvora
//   phase:    0 Dark · 1 Feudal · 2 Castle · 3 Imperial · 4 Abierto · 5 Cerrado · 6 Agua · 7 Nómada

type RadarLike = { phase: number[]; category: number[] };

const AGE_LABELS = ["Dark", "Feudal", "Castle", "Imperial"] as const;

// Consejo asociado a cada debilidad de categoría (índice → texto).
const WEAK_ADVICE: Record<number, string> = {
  0: "no uses infantería como núcleo",
  1: "sin caballería te van a raidear → pikes, muro y buena posición",
  2: "evitá pelear a distancia; buscá melee y cerrar rápido",
  3: "asedio débil → sufrís contra muros/posiciones; presioná antes o usá monjes (Redemption)",
  4: "flojo en agua → evitá mapas acuáticos o forzá el desembarco",
  5: "monjes pobres → cuidado con reliquias y conversiones rivales",
  6: "poca defensa → vulnerable a castle drop y tower rush; vigilá el scouting",
  7: "sin pólvora → el late game a distancia es del rival",
};

export type RadarBrief = { plan: string[]; threats: string[] };

export function buildRadarPlan(me: RadarLike, opp?: RadarLike | null): RadarBrief {
  const plan: string[] = [];
  const threats: string[] = [];
  const cat = me.category;
  const ph = me.phase;

  // --- PLAN: ejes ALTOS propios -------------------------------------------
  // 1. Identidad militar: top categorías (>= 7).
  const ranked = cat
    .map((v, i) => ({ v, i, label: CATEGORY_AXES[i] as string }))
    .sort((a, b) => b.v - a.v);
  const tops = ranked.filter((x) => x.v >= 7).slice(0, 3);
  if (tops.length) {
    plan.push(
      `Tu fuerza: ${tops.map((t) => `${t.label} (${t.v})`).join(" · ")} → armá la composición alrededor de esto.`,
    );
  } else {
    plan.push(
      `Sin un eje dominante; lo mejor es ${ranked[0].label} (${ranked[0].v}). Jugá flexible y adaptá al rival.`,
    );
  }

  // 2. Pico temporal.
  const ages = AGE_LABELS.map((label, i) => ({ label, v: ph[i], i }));
  const peak = ages.reduce((a, b) => (b.v > a.v ? b : a));
  const castle = ph[2];
  const imp = ph[3];
  if (peak.i <= 1 && peak.v >= 7) {
    plan.push(`Pico temprano (${peak.label} ${peak.v}) → presioná pronto, no alargues el juego.`);
  } else if (peak.label === "Imperial" || imp >= 9) {
    plan.push(`Escalás a Imperial (${imp}) → fast-imp / late game es tu plan; sobreviví el early.`);
  } else if (peak.label === "Castle") {
    plan.push(`Tu pico es Castle (${castle}) → forzá la partida en Castle Age con tu power spike.`);
  }
  if (imp <= castle - 2 && imp <= 6) {
    plan.push(`Decaés en Imperial (${imp} vs Castle ${castle}) → cerrá antes de llegar al late game.`);
  }

  // 3. Mapa preferido.
  const maps = [
    { label: "abierto", v: ph[4] },
    { label: "cerrado", v: ph[5] },
    { label: "agua", v: ph[6] },
    { label: "nómada", v: ph[7] },
  ];
  const bestMap = maps.reduce((a, b) => (b.v > a.v ? b : a));
  const worstMap = maps.reduce((a, b) => (b.v < a.v ? b : a));
  if (bestMap.v - worstMap.v >= 3) {
    plan.push(`Mapa: fuerte en ${bestMap.label} (${bestMap.v}), flojo en ${worstMap.label} (${worstMap.v}).`);
  }

  // --- AMENAZAS: ejes BAJOS propios + ejes ALTOS del rival ----------------
  const coreWeak = [0, 1, 2, 3, 6]
    .map((i) => ({ i, v: cat[i] }))
    .filter((x) => x.v <= 3)
    .sort((a, b) => a.v - b.v)
    .slice(0, 2);
  for (const w of coreWeak) threats.push(`${CATEGORY_AXES[w.i]} ${w.v}: ${WEAK_ADVICE[w.i]}.`);
  if (cat[4] <= 2) threats.push(`${CATEGORY_AXES[4]} ${cat[4]}: ${WEAK_ADVICE[4]}.`);

  if (opp) {
    const oppTops = opp.category
      .map((v, i) => ({ v, i, label: CATEGORY_AXES[i] as string }))
      .filter((x) => x.v >= 8)
      .sort((a, b) => b.v - a.v)
      .slice(0, 2);
    for (const o of oppTops) threats.push(`El rival domina ${o.label} (${o.v}) → preparate a contrarrestarlo.`);
    if (opp.phase[3] >= 8 && imp <= opp.phase[3] - 2) {
      threats.push(`El rival escala mejor a Imperial (${opp.phase[3]} vs tu ${imp}) → evitá un late game parejo.`);
    }
  }

  if (!threats.length) threats.push("Sin debilidades marcadas en el radar — jugá tu plan con confianza.");
  return { plan, threats };
}
