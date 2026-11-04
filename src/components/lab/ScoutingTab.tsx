"use client";

// Árbol de scouting: qué viste → qué significa → qué hacer; con tu equipo, quién puede ejecutar cada respuesta.
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { labGet } from "@/lib/lab/api";
import { GkEmblem, GkIcon, GkText } from "@/lib/gamekit/GameKit";
import { CivPicker, Field, Panel, useLocalState, useTeamCivs } from "./ui";

interface Who { civ: string; unit: string | null; unitId: string | null; can: boolean | null }
interface Signal { signal: string; means: string; reaction: string; source: string; who: Who[] }
interface Stage { id: string; title: string; when: string; tip: string; signals: Signal[] }

export function ScoutingTab() {
  const [team, setTeam] = useLocalState<string[]>("sc-teamciv", []);
  const { name } = useTeamCivs();
  const { data, isError } = useQuery({
    queryKey: ["lab", "scouting", team.join(",")],
    queryFn: () => labGet<{ stages: Stage[] }>("scouting", { team: team.join(",") }),
    staleTime: Infinity,
  });
  return (
    <div>
      <p className="lab-intro"><b>Árbol de scouting:</b> qué viste → qué significa → qué hacer. Si jugás en equipo (2v2–4v4), cargá a tus aliados y cada respuesta muestra <b>quién puede ejecutarla</b> según su árbol.
        Para jugar contra una civ concreta (su counter-play, debilidades y alerta de Phosphor Rush) abrí <Link href="/matchups" className="underline">Matchups</Link>.</p>
      <Panel><div className="lab-row"><Field label="Mi equipo (hasta 4)" grow><CivPicker value={team} onChange={setTeam} /></Field></div></Panel>
      {isError ? <p className="lab-small">No se pudo cargar el árbol.</p> : null}
      <div className="lab-grid auto">
        {data?.stages.map((st) => (
          <Panel key={st.id} title={<>{st.title} <span className="lab-small">· {st.when}</span></>}>
            <p className="lab-small">{st.tip}</p>
            {st.signals.map((s) => (
              <div key={s.signal} className="sc-sig">
                <div className="s">👁 <GkText>{s.signal}</GkText></div>
                <div className="m">→ <GkText>{s.means}</GkText></div>
                <div className="r"><b>Reacción:</b> <GkText>{s.reaction}</GkText></div>
                {s.who.some((w) => w.can !== null) ? (
                  <div>{s.who.map((w) => (
                    <span key={w.civ} className={`lab-chip ${w.can ? "ok" : "no"}`}>
                      {w.can ? "✔" : "✖"} <GkEmblem slug={w.civ} />{name(w.civ)}{w.unit && w.unitId ? <> · <GkIcon id={w.unitId} size="s" />{w.unit}</> : null}
                    </span>
                  ))}</div>
                ) : null}
                <div className="lab-src">{s.source}</div>
              </div>
            ))}
          </Panel>
        ))}
      </div>
    </div>
  );
}
