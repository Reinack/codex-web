"use client";

// Modo estudio: tarjetas generadas desde el vault con repetición espaciada (cajas de Leitner; el progreso queda en el navegador).
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { labGet } from "@/lib/lab/api";
import { GkEmblem } from "@/lib/gamekit/GameKit";
import { Panel, useLocalState, useTeamCivs } from "./ui";

interface Card { id: string; type: string; q: string; a: string; source: string; fixed?: string[] }
type Progress = Record<string, { box: number; due: number }>;
const BOX_DAYS = [0, 1, 3, 7, 14, 30];
const DAY = 864e5;

export function StudyTab() {
  const { data } = useQuery({ queryKey: ["lab", "quiz"], queryFn: () => labGet<{ cards: Card[] }>("quiz"), staleTime: Infinity });
  const { civs } = useTeamCivs();
  const [prog, setProg] = useLocalState<Progress>("study", {});
  const [current, setCurrent] = useState<{ card: Card; options: string[] } | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const cards = useMemo(() => data?.cards ?? [], [data]);
  const [now] = useState(() => Date.now()); // fija al montar: la lista "para hoy" no se reordena a mitad de sesión
  const due = cards.filter((c) => !prog[c.id] || prog[c.id].due <= now);
  const stat = { nuevas: cards.filter((c) => !prog[c.id]).length, aprendiendo: cards.filter((c) => prog[c.id] && prog[c.id].box < 4).length, dominadas: cards.filter((c) => (prog[c.id]?.box ?? 0) >= 4).length };

  const next = (exclude?: string) => {
    const pool = due.filter((c) => c.id !== exclude);
    if (!pool.length) { setCurrent(null); return; }
    const card = pool[Math.floor(Math.random() * pool.length)];
    const others = [...new Set(cards.filter((x) => x.type === card.type && x.a !== card.a).map((x) => x.a))].sort(() => Math.random() - 0.5).slice(0, 3);
    setPicked(null);
    setCurrent({ card, options: (card.fixed ?? [card.a, ...others]).slice().sort(() => Math.random() - 0.5) });
  };
  const answer = (o: string) => {
    if (!current || picked) return;
    const ok = o === current.card.a;
    setPicked(o);
    setProg((p) => { const box = ok ? Math.min(5, (p[current.card.id]?.box ?? 0) + 1) : 0; return { ...p, [current.card.id]: { box, due: Date.now() + BOX_DAYS[box] * DAY } }; });
  };
  const civOf = (n: string) => civs.find((c) => c.name === n)?.slug;
  const c = current?.card;
  const qCiv = c && ["position", "phosphor"].includes(c.type) ? c.id.split(":")[1] : null; // la civ es parte de la pregunta
  const optEmb = c && ["teambonus", "specialty"].includes(c.type);                          // la civ es la respuesta

  return (
    <div>
      <p className="lab-intro"><b>Modo estudio:</b> tarjetas generadas desde el vault (bonus de equipo, especialidad, posición, Phosphor) con repetición espaciada (cajas de Leitner). Las que fallás vuelven antes; el progreso queda en este navegador.</p>
      <Panel>
        <div className="lab-small">Nuevas {stat.nuevas} · Aprendiendo {stat.aprendiendo} · Dominadas {stat.dominadas} · Para hoy {due.length}
          {" · "}<button className="underline" onClick={() => { setProg({}); setCurrent(null); }}>reiniciar progreso</button></div>
        {!c ? (
          <div style={{ marginTop: 12 }}>
            {due.length ? <button className="lab-btn" onClick={() => next()}>Empezar</button> : <p className="st-q">✔ No quedan tarjetas pendientes por hoy.</p>}
          </div>
        ) : (
          <div>
            <div className="st-q">{qCiv ? <GkEmblem slug={qCiv} size="l" /> : null}{c.q}</div>
            {current!.options.map((o) => (
              <button key={o} disabled={!!picked} onClick={() => answer(o)} className={`st-opt ${picked ? (o === c.a ? "right" : o === picked ? "wrong" : "") : ""}`}>
                {optEmb ? <GkEmblem slug={civOf(o)} size="m" /> : null}{o}
              </button>
            ))}
            <div className="lab-src">{c.source}</div>
            {picked ? <p>{picked === c.a ? "✔ Correcto" : <>✖ Era: <b>{c.a}</b></>} · {Math.max(0, due.length - 1)} pendientes <button className="lab-btn" onClick={() => next(c.id)}>Siguiente</button></p> : null}
          </div>
        )}
      </Panel>
    </div>
  );
}
