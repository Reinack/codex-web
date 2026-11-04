"use client";

// Benchmarks de timing citados de la wiki (cada fila con su nota de origen) + comparador "mi partida".
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { labGet } from "@/lib/lab/api";
import { GkAge, GkEmblem } from "@/lib/gamekit/GameKit";
import { Field, Panel, mmss, parseTime, useTeamCivs } from "./ui";

interface Mark { t?: number; t2?: number; max?: number; approx?: boolean; text: string }
export interface TimingRef { id: string; label: string; villagers: string; feudal: Mark | null; castle: Mark | null; source: string; buildId: string | null }
export interface TimingsData {
  ageCosts: { feudal: string }; eloSignal: string; builds: TimingRef[];
  imperial: { label: string; t: number; text: string; source: string }[]; windows: { label: string; text: string; source: string }[];
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

/** Medalla oro/plata/bronce de un click contra el benchmark (devuelve HTML ya escapado). */
export function medal(age: string, t: number, ref: Mark, label: string): string {
  const goal = (ref.max ?? ref.t2 ?? ref.t) as number;
  const d = t - goal;
  const m = d <= 0 ? ["🥇", "oro"] : d <= 30 ? ["🥈", "plata"] : d <= 60 ? ["🥉", "bronce"] : ["⚪", "sin medalla"];
  return `<div><span style="font-size:22px">${m[0]}</span> ${age[0].toUpperCase() + age.slice(1)} ${mmss(t)} vs ${ref.max ? "≤" : ref.approx ? "≈" : ""}${mmss(goal)} → ${m[1]} (${d > 0 ? "+" : ""}${Math.round(d)} s) <span class="lab-small">${esc(label)}</span></div>`;
}

const MAX = 35 * 60;
const pc = (t: number) => `${((t / MAX) * 100).toFixed(2)}%`;

function Label({ text }: { text: string }) {
  const { civs } = useTeamCivs();
  const civ = civs.find((c) => text.includes(c.name));
  return <>{civ ? <GkEmblem slug={civ.slug} size="s" /> : null}{text}</>;
}

export function TimingsTab() {
  const { data: T } = useQuery({ queryKey: ["lab", "timings"], queryFn: () => labGet<TimingsData>("timings"), staleTime: Infinity });
  const [refIdx, setRefIdx] = useState(0);
  const [f, setF] = useState(""); const [c, setC] = useState("");
  const [out, setOut] = useState<string[] | null>(null);
  if (!T) return <p className="lab-small">cargando…</p>;

  const compare = () => {
    const ref = T.builds[refIdx], res: string[] = [];
    const tf = parseTime(f), tc = parseTime(c);
    if (tf != null && ref.feudal) res.push(medal("feudal", tf, ref.feudal, ref.label));
    if (tc != null && ref.castle) res.push(medal("castle", tc, ref.castle, ref.label));
    if (tf != null && !ref.feudal) res.push(`<div class="lab-small">Esta referencia no tiene benchmark de Feudal.</div>`);
    setOut(res.length ? res : [`<div class="lab-small">Ingresá tiempos con formato m:ss.</div>`]);
  };
  const row = (label: string, sub: string, marks: React.ReactNode, key: string) => (
    <div className="tl-row" key={key}><div className="tl-lbl"><Label text={label} /><small>{sub}</small></div><div className="tl-track">{marks}</div></div>
  );

  return (
    <div>
      <p className="lab-intro"><b>Benchmarks de timing</b> citados de la wiki — cada fila trae su nota de origen. {T.ageCosts.feudal}</p>
      <Panel title="Línea de tiempo">
        <div>
          <div className="tl-axis">{[0, 5, 10, 15, 20, 25, 30, 35].map((m) => <span key={m} style={{ left: pc(m * 60) }}>{m}&apos;</span>)}</div>
          {T.builds.map((b) => row(b.label,
            `${b.villagers !== "—" ? `${b.villagers} aldeanos · ` : ""}${[b.feudal?.text, b.castle?.text].filter(Boolean).join(" · ")}`,
            <>
              {b.feudal?.t ? <span className="tl-m f" style={{ left: pc(b.feudal.t) }} title={`Feudal ${mmss(b.feudal.t)}`} /> : null}
              {b.castle?.t2 && b.castle.t ? <span className="tl-bar" style={{ left: pc(b.castle.t), width: `calc(${pc(b.castle.t2)} - ${pc(b.castle.t)})` }} /> : null}
              {b.castle?.max ? <><span className="tl-bar max" style={{ left: 0, width: pc(b.castle.max) }} /><span className="tl-m c" style={{ left: pc(b.castle.max) }} title={`Castle antes de ${mmss(b.castle.max)}`} /></>
                : b.castle?.t ? <span className="tl-m c" style={{ left: pc(b.castle.t) }} title={`Castle ${mmss(b.castle.t)}`} /> : null}
            </>, b.id))}
          {T.imperial.map((i) => row(i.label, i.text, <span className="tl-m i" style={{ left: pc(i.t) }} />, i.label))}
        </div>
        <div className="lab-small" style={{ marginTop: 8 }}>
          <span className="lab-tag age-1 has-ico"><GkAge age="feudal" />Feudal</span> <span className="lab-tag age-2 has-ico"><GkAge age="castle" />Castle</span> <span className="lab-tag age-3 has-ico"><GkAge age="imperial" />Imperial</span>
          la barra de Castle marca un rango o un &ldquo;antes de&rdquo;.
        </div>
        <p className="lab-small">{T.eloSignal}</p>
      </Panel>
      <div className="lab-grid auto">
        <Panel title="Mi partida vs benchmark">
          <div className="lab-row"><Field label="Referencia"><select className="lab-select" value={refIdx} onChange={(e) => setRefIdx(+e.target.value)}>{T.builds.map((b, i) => <option key={b.id} value={i}>{b.label}</option>)}</select></Field></div>
          <div className="lab-row">
            <Field label="Click a Feudal (m:ss)"><input className="lab-input" size={6} placeholder="9:10" value={f} onChange={(e) => setF(e.target.value)} /></Field>
            <Field label="Click a Castle (m:ss)"><input className="lab-input" size={6} placeholder="14:30" value={c} onChange={(e) => setC(e.target.value)} /></Field>
            <button className="lab-btn" onClick={compare}>Comparar</button>
          </div>
          {out?.map((h, i) => <div key={i} dangerouslySetInnerHTML={{ __html: h }} />)}
        </Panel>
        <Panel title="Ventanas y avisos">
          {T.windows.map((w) => <p key={w.label}><b>{w.label}.</b> {w.text}<span className="lab-src"> · {w.source}</span></p>)}
          <h4 className="lab-h4">Fuentes de los benchmarks</h4>
          {T.builds.map((b) => (
            <div key={b.id} className="lab-small">{b.label} — <code>{b.source}</code>{b.buildId ? <> · <Link href="/lab/builds" onClick={() => { try { localStorage.setItem("lab:bo", JSON.stringify(b.buildId)); } catch { /* noop */ } }} className="underline">ver build</Link></> : null}</div>
          ))}
        </Panel>
      </div>
    </div>
  );
}
