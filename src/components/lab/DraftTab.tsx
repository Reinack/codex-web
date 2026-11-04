"use client";

// Draft en un solo panel: por mapa con el radar del vault (+ tier Phosphor en mapa abierto) y, si se cargan las civs del
// rival, puntuando cada candidata contra ellas (servidor: /api/draft-vs). Cada pick enlaza al matchup.
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { labGet } from "@/lib/lab/api";
import { GkEmblem } from "@/lib/gamekit/GameKit";
import { CivPicker, Field, Panel, useLocalState, useTeamCivs } from "./ui";

type Pos = "flank" | "pocket" | "flex";
type MapKey = "open" | "closed" | "water" | "nomad";
interface DraftCiv { slug: string; name: string; position: Pos; axes: Record<MapKey, number> | null; phosphor: string | null }
interface VsCand { civ: string; name: string; position: Pos; score: number; reasons: string[]; per: { vs: string; name: string; total: number }[] }
interface VsResp { candidates: VsCand[]; bans: { civ: string; name: string; threat: number }[]; phosphorAlert: { civ: string; name: string; tier: string; uu: string }[] }

const MAPS: [MapKey, string][] = [["open", "Abierto (Arabia…)"], ["closed", "Cerrado (Arena, Black Forest…)"], ["water", "Agua"], ["nomad", "Nómada"]];
const PHB: Record<string, number> = { S: 2, A: 1.4, B: 0.7, C: 0.2, D: 0 };
const POS_ES = { flex: "1v1", flank: "Flanco", pocket: "Pocket" } as const;
const SLOTS: Record<number, Pos[]> = { 1: ["flex"], 2: ["flank", "pocket"], 3: ["flank", "pocket", "flank"], 4: ["flank", "pocket", "pocket", "flank"] };

interface Row { slug: string; name: string; position: Pos; info: string; bar: number; more?: React.ReactNode; matchup?: string }

function RankList({ rows }: { rows: Row[] }) {
  return (
    <ol className="dr-list">
      {rows.map((r) => (
        <li key={r.slug}>
          <GkEmblem slug={r.slug} size="m" /><b>{r.name}</b> <span className={`lab-tag ${r.position}`}>{r.position}</span>
          <span className="lab-small">{r.info}</span><span className="dr-bar" style={{ width: Math.max(0, Math.round(r.bar)) }} />
          {r.more}
          {r.matchup ? <div><Link href={r.matchup} className="underline">Ver matchup</Link></div> : null}
        </li>
      ))}
    </ol>
  );
}

export function DraftTab() {
  const { name } = useTeamCivs();
  const [fmt, setFmt] = useLocalState("dr-fmt", 1);
  const [nbo, setNbo] = useLocalState("dr-bo", 1);
  const [nb, setNb] = useLocalState("dr-bans", 1);
  const [mine, setMine] = useLocalState<string[]>("dr-mine", []);
  const [opp, setOpp] = useLocalState<string[]>("dv-vs", []);
  const [startMap] = useLocalState<MapKey>("dv-map", "open");
  const [maps, setMaps] = useLocalState<MapKey[]>("dr-maps", []);
  const gameMaps: MapKey[] = Array.from({ length: nbo }, (_, g) => maps[g] ?? startMap);
  const slots = SLOTS[fmt] ?? SLOTS[1];
  const uniq = [...new Set(slots)];

  const dq = useQuery({ queryKey: ["lab", "draft-data"], queryFn: () => labGet<{ civs: DraftCiv[] }>("draft-data"), staleTime: Infinity });
  const vq = useQuery({
    queryKey: ["lab", "draft-vs", opp.join(","), gameMaps.join(","), uniq.join(","), nb, mine.join(",")],
    enabled: opp.length > 0,
    queryFn: () => Promise.all(gameMaps.map((m) => Promise.all(uniq.map((sl) =>
      labGet<VsResp>("draft-vs", { vs: opp.join(","), map: m, slot: sl, bans: nb, exclude: mine.join(",") }))))),
  });

  const civs = dq.data?.civs ?? [];
  const score = (c: DraftCiv, m: MapKey) => (c.axes?.[m] ?? 0) + (m === "open" ? (PHB[c.phosphor ?? ""] ?? 0) : 0);
  const fits = (c: DraftCiv, sl: Pos) => sl === "flex" || c.position === sl || c.position === "flex";
  const count = (sl: Pos) => slots.filter((x) => x === sl).length;
  const setMapAt = (g: number, m: MapKey) => setMaps(gameMaps.map((x, i) => (i === g ? m : x)));
  const rivalsMode = opp.length > 0;

  const game = (map: MapKey, g: number) => {
    let lists: [Pos, Row[]][];
    let bans: Row[];
    let alert: React.ReactNode = null;
    if (rivalsMode) {
      const res = vq.data?.[g];
      if (!res) return <p className="lab-small">{vq.isError ? "No se pudo calcular." : "calculando…"}</p>;
      const top = Math.max(1, ...res.flatMap((r) => r.candidates.map((c) => Math.abs(c.score))));
      lists = uniq.map((sl, i) => [sl, res[i].candidates.slice(0, 4).map((c): Row => ({
        slug: c.civ, name: c.name, position: c.position, info: ` puntaje ${c.score}`, bar: (Math.max(0, c.score) / top) * 90,
        matchup: `/matchups?me=${c.civ}&vs=${opp[0]}`,
        more: <><div className="lab-small">{c.reasons.join(" · ")}</div>{opp.length > 1 ? <div className="lab-small">{c.per.map((p) => `${p.name} ${p.total}`).join(" · ")}</div> : null}</>,
      }))]);
      bans = (res[0].bans ?? []).map((b): Row => ({ slug: b.civ, name: b.name, position: "flex", info: ` amenaza a tus mejores picks: ${b.threat}`, bar: 0 }));
      const al = res[0].phosphorAlert;
      if (al.length) alert = <p>🔥 <b>Alerta Phosphor Rush:</b> {al.map((p) => `${p.name} (tier ${p.tier}${p.uu ? `, ${p.uu}` : ""})`).join(" · ")} — puede ir Fast Castle all-in en mapa abierto; mirá el <Link href="/lab/scouting" className="underline">scouting</Link>.</p>;
    } else {
      const rank = (sl: Pos) => civs.filter((c) => !mine.includes(c.slug) && fits(c, sl)).sort((a, b) => score(b, map) - score(a, map));
      const info = (c: DraftCiv) => ` ${c.axes ? `${map} ${c.axes[map]}` : "sin radar"}${map === "open" && c.phosphor ? ` · Phosphor ${c.phosphor}` : ""}`;
      const toRow = (c: DraftCiv): Row => ({ slug: c.slug, name: c.name, position: c.position, info: info(c), bar: score(c, map) * 6 });
      lists = uniq.map((sl) => [sl, rank(sl).slice(0, 4).map(toRow)]);
      const myTop = new Set(uniq.flatMap((sl) => rank(sl).slice(0, 4).map((c) => c.slug)));
      bans = civs.filter((c) => !mine.includes(c.slug) && !myTop.has(c.slug)).sort((a, b) => score(b, map) - score(a, map)).slice(0, nb + 1).map(toRow);
    }
    return (
      <>
        {alert}
        <div className="lab-grid two">
          <div>
            <h4 className="lab-h4">🟢 Picks sugeridos</h4>
            {lists.map(([sl, rows]) => <div key={sl}><div className="lab-small"><b>{POS_ES[sl]}{count(sl) > 1 ? ` ×${count(sl)}` : ""}</b></div><RankList rows={rows} /></div>)}
          </div>
          <div>
            <h4 className="lab-h4">🔴 Bans sugeridos ({nb})</h4>
            {nb && bans.length ? <><RankList rows={bans} /><p className="lab-small">{rivalsMode ? "Las civs del pool rival que más pelean contra tus 3 mejores picks." : "Las más fuertes del mapa que no están entre tus picks: lo que el rival querría pickear."}</p></> : <p className="lab-small">Sin bans.</p>}
          </div>
        </div>
      </>
    );
  };

  return (
    <div>
      <p className="lab-intro"><b>Draft:</b> sugiere <b>picks</b> y <b>bans</b> por mapa con el radar del vault (y la tier de Phosphor Rush en mapa abierto). Si cargás las <b>civs del rival</b> (las que ya pickeó o suele jugar), puntúa a cada candidata <b>contra ellas</b> —categorías débiles que podés explotar y partidas documentadas— y sugiere bans de su pool. En equipos filtra por <b>posición</b>.</p>
      <Panel>
        <div className="lab-row">
          <Field label="Formato"><select className="lab-select" value={fmt} onChange={(e) => setFmt(+e.target.value)}>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}v{n}</option>)}</select></Field>
          <Field label="Serie"><select className="lab-select" value={nbo} onChange={(e) => setNbo(+e.target.value)}>{[1, 3, 5].map((n) => <option key={n} value={n}>Bo{n}</option>)}</select></Field>
          <Field label="Bans por lado"><select className="lab-select" value={nb} onChange={(e) => setNb(+e.target.value)}>{[0, 1, 2, 3].map((n) => <option key={n}>{n}</option>)}</select></Field>
        </div>
        <div className="lab-row">
          <Field label="Mis civs ya usadas (no repiten en la serie)" grow><CivPicker value={mine} onChange={setMine} max={5} /></Field>
          <Field label="Civs del rival, hasta 5 (opcional)" grow><CivPicker value={opp} onChange={setOpp} max={5} placeholder="Agregar civ del rival…" /></Field>
        </div>
        {opp.length ? <p className="lab-small">Contra: {opp.map(name).join(", ")}</p> : null}
      </Panel>
      {gameMaps.map((m, g) => (
        <Panel key={g} title={`Partida ${g + 1}`}>
          <div className="lab-row"><Field label="Mapa"><select className="lab-select" value={m} onChange={(e) => setMapAt(g, e.target.value as MapKey)}>{MAPS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field></div>
          {game(m, g)}
        </Panel>
      ))}
      {rivalsMode ? <p className="lab-src">Guía basada en los radares y partidas documentadas del vault; no es un veredicto.</p> : null}
    </div>
  );
}
