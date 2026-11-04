"use client";

// Team Lab: armá un equipo de 1 a 4 civs; asigna flanco/pocket, marca sinergias y muestra la cobertura de unidades.
import { useQuery } from "@tanstack/react-query";
import { labGet } from "@/lib/lab/api";
import { GkEmblem, GkIcon } from "@/lib/gamekit/GameKit";
import { CivPicker, Panel, useLocalState } from "./ui";

interface Player { civ: string; name: string; slot: "flank" | "pocket" | "flex"; fit: string; position: "flank" | "pocket" | "flex"; specialty: string; teamBonus: string; notes: string[] }
interface Cov { key: string; label: string; icon: string; gap: boolean; best: string[]; who: { civ: string; unit: string | null; unitId: string | null }[] }
interface TeamResp { score: number; maxScore: number; players: Player[]; links: { text: string; kind: string }[]; coverage: Cov[]; gaps: string[] }

const SLOT_ES = { flank: "Flanco", pocket: "Pocket", flex: "—" } as const;

export function TeamTab() {
  const [civs, setCivs] = useLocalState<string[]>("tm-civs", []);
  const { data, error } = useQuery({
    queryKey: ["lab", "team", civs.join(",")],
    queryFn: () => labGet<TeamResp>("team", { civs: civs.join(",") }),
    enabled: civs.length > 0,
    staleTime: Infinity,
  });
  return (
    <div>
      <p className="lab-intro"><b>Team Lab:</b> armá tu equipo de 1 a 4 civs. Asigna <b>flanco</b> y <b>pocket</b> según el perfil de cada civ en la wiki (2v2 = 1 flanco + 1 pocket, 3v3 = 2 + 1, 4v4 = 2 + 2),
        marca sinergias de bonus de equipo y muestra qué línea de unidades cubre cada jugador y qué <b>huecos</b> quedan.</p>
      <Panel><CivPicker value={civs} onChange={setCivs} placeholder="Agregar civ al equipo…" /></Panel>
      {error ? <Panel>{(error as Error).message}</Panel> : null}
      {data && civs.length ? (
        <div className="lab-grid auto">
          <Panel title={<>Posiciones <span className="lab-small">· ajuste {data.score}/{data.maxScore}</span></>}>
            {data.players.map((p) => (
              <div key={p.civ} className="tm-slot">
                <div className="tm-pos">{SLOT_ES[p.slot]}</div>
                <GkEmblem slug={p.civ} size="l" />
                <div>
                  <b>{p.name}</b> <span className={`lab-tag ${p.position}`}>{p.position}</span> <span className="lab-small">{p.fit}</span>
                  <div className="lab-small">{p.specialty}</div>
                  <div>🤝 {p.teamBonus || "sin bonus de equipo registrado"}</div>
                  {p.notes.slice(0, 2).map((n) => <div key={n} className="lab-small">· {n}</div>)}
                </div>
              </div>
            ))}
            {data.links.length
              ? <><h4 className="lab-h4">Sinergias entre los elegidos</h4>{data.links.map((l) => <div key={l.text} className="lab-small">{l.kind === "bonus" ? "🤝" : "✨"} {l.text}</div>)}</>
              : <p className="lab-small">Ninguna sinergia directa registrada entre estas civs.</p>}
          </Panel>
          <Panel title="Cobertura del equipo">
            {data.gaps.length ? <p>⚠️ Huecos: <b>{data.gaps.join(", ")}</b></p> : <p>✔ Sin huecos de unidades.</p>}
            <table className="lab-table">
              <thead><tr><th>Línea</th>{data.players.map((p) => <th key={p.civ}><GkEmblem slug={p.civ} />{p.name}</th>)}</tr></thead>
              <tbody>
                {data.coverage.map((c) => (
                  <tr key={c.key} className={c.gap ? "cov-gap" : ""}>
                    <td><GkIcon id={c.icon} size="s" />{c.label}</td>
                    {c.who.map((w) => <td key={w.civ} className={c.best.includes(w.civ) && w.unit ? "cov-best" : ""}>{w.unit && w.unitId ? <><GkIcon id={w.unitId} size="s" />{w.unit}</> : "—"}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="lab-small">En verde, quien tiene la mejor versión de la línea: es quien conviene que la produzca. Basado en el árbol tecnológico de cada civ.</p>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
