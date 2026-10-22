import { CATEGORY_AXES } from "./data";

// Genera "plan" y "amenazas" a partir del radar de una civ (y opcionalmente del
// rival, para hacerlo matchup-aware). A diferencia del plan del backend —que sale
// del grafo de counters y es simétrico entre civs— esto lee los ejes del radar,
// que SON los puntos fuertes/débiles propios de cada civ → el texto varía por civ.
//
// El objetivo del texto es sonar como un coach: frases completas, segunda persona,
// una idea accionable por bullet. Los números (x/10) van entre paréntesis como
// referencia, no como protagonistas.
//
// Índices (ver lib/radar/data.ts):
//   category: 0 Infantería · 1 Caballería · 2 Arqueros · 3 Asedio · 4 Naval · 5 Monjes · 6 Defensa · 7 Pólvora
//   phase:    0 Dark · 1 Feudal · 2 Castle · 3 Imperial · 4 Abierto · 5 Cerrado · 6 Agua · 7 Nómada

type RadarLike = { phase: number[]; category: number[] };

const AGE_LABELS = ["Dark", "Feudal", "Castle", "Imperial"] as const;

// Consejo asociado a cada debilidad de categoría (índice → texto accionable).
const WEAK_ADVICE: Record<number, string> = {
  0: "no apoyes tu ejército en infantería; sirve de relleno barato, no de núcleo",
  1: "casi no tenés caballería, así que te van a raidear los aldeanos: hacé pikes, muro y elegí bien dónde plantarte",
  2: "tus arqueros no asustan a nadie; cerrá distancia con melee y ganá el cuerpo a cuerpo",
  3: "tu asedio es flojo, vas a sufrir contra muros y posiciones: rompé antes con presión o convertí con monjes",
  4: "sos débil en el agua: evitá mapas acuáticos o jugá para forzar el desembarco cuanto antes",
  5: "tus monjes son pobres: cuidá las reliquias y no regales conversiones al rival",
  6: "tenés poca defensa, sos vulnerable a castle drops y tower rush: mantené el scouting prendido",
  7: "no tenés pólvora, así que el late game a distancia es del rival; cerrá la partida antes de llegar ahí",
};

// Descriptor cualitativo para un valor de eje (1–10).
function tier(v: number): string {
  if (v >= 9) return "élite";
  if (v >= 7) return "fuerte";
  if (v >= 5) return "correcto";
  if (v >= 3) return "flojo";
  return "muy flojo";
}

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
  if (tops.length === 1) {
    plan.push(
      `Tu mayor fortaleza es ${tops[0].label.toLowerCase()} (${tops[0].v}/10): construí el ejército alrededor de eso.`,
    );
  } else if (tops.length >= 2) {
    const names = tops.map((t) => t.label.toLowerCase());
    const last = names.pop();
    plan.push(
      `Tu identidad es ${names.join(", ")} y ${last} — apoyate en esos brazos y combinalos.`,
    );
  } else {
    plan.push(
      `No tenés un brazo dominante; lo más sólido es ${ranked[0].label.toLowerCase()} (${ranked[0].v}/10). Jugá flexible y leé lo que arma el rival.`,
    );
  }

  // 2. Pico temporal.
  const ages = AGE_LABELS.map((label, i) => ({ label, v: ph[i], i }));
  const peak = ages.reduce((a, b) => (b.v > a.v ? b : a));
  const castle = ph[2];
  const imp = ph[3];
  if (peak.i <= 1 && peak.v >= 7) {
    plan.push(
      `Tu pico es temprano (${peak.label}, ${peak.v}/10): presioná apenas puedas y no dejes que la partida se alargue.`,
    );
  } else if (peak.label === "Imperial" || imp >= 9) {
    plan.push(
      `Escalás muy bien a Imperial (${imp}/10): tu plan es aguantar el early y dominar el late game.`,
    );
  } else if (peak.label === "Castle") {
    plan.push(
      `Tu power spike está en Castle Age (${castle}/10): forzá ahí la definición de la partida.`,
    );
  }
  if (imp <= castle - 2 && imp <= 6) {
    plan.push(
      `Te apagás en Imperial (${imp}/10 vs ${castle}/10 en Castle): cerrá la partida antes de llegar al late game.`,
    );
  }

  // 3. Mapa preferido.
  const maps = [
    { label: "mapas abiertos", v: ph[4] },
    { label: "mapas cerrados", v: ph[5] },
    { label: "el agua", v: ph[6] },
    { label: "nómada", v: ph[7] },
  ];
  const bestMap = maps.reduce((a, b) => (b.v > a.v ? b : a));
  const worstMap = maps.reduce((a, b) => (b.v < a.v ? b : a));
  if (bestMap.v - worstMap.v >= 3) {
    plan.push(
      `Te sentís cómodo en ${bestMap.label} (${bestMap.v}/10) y sufrís en ${worstMap.label} (${worstMap.v}/10): elegí o vetá los mapas con eso en mente.`,
    );
  }

  // --- AMENAZAS: ejes BAJOS propios + ejes ALTOS del rival ----------------
  const coreWeak = [0, 1, 2, 3, 6]
    .map((i) => ({ i, v: cat[i] }))
    .filter((x) => x.v <= 3)
    .sort((a, b) => a.v - b.v)
    .slice(0, 2);
  for (const w of coreWeak) {
    threats.push(`${CATEGORY_AXES[w.i]} (${w.v}/10): ${WEAK_ADVICE[w.i]}.`);
  }
  if (cat[4] <= 2) threats.push(`${CATEGORY_AXES[4]} (${cat[4]}/10): ${WEAK_ADVICE[4]}.`);

  if (opp) {
    const oppTops = opp.category
      .map((v, i) => ({ v, i, label: CATEGORY_AXES[i] as string }))
      .filter((x) => x.v >= 8)
      .sort((a, b) => b.v - a.v)
      .slice(0, 2);
    for (const o of oppTops) {
      threats.push(
        `El rival es ${tier(o.v)} en ${o.label.toLowerCase()} (${o.v}/10): tené listo cómo contrarrestarlo desde el principio.`,
      );
    }
    if (opp.phase[3] >= 8 && imp <= opp.phase[3] - 2) {
      threats.push(
        `El rival escala mejor a Imperial (${opp.phase[3]}/10 vs tu ${imp}/10): no busques un late game parejo, definí antes.`,
      );
    }
  }

  if (!threats.length) {
    threats.push("No tenés agujeros marcados en el radar: jugá tu plan con confianza.");
  }
  return { plan, threats };
}
