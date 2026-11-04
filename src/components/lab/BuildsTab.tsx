"use client";

// Build orders del vault paso a paso, con timer, marcas de Feudal/Castle (medallas contra el benchmark),
// overlay flotante y exportación a JSON.
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { labGet } from "@/lib/lab/api";
import { GkEmblem } from "@/lib/gamekit/GameKit";
import { Field, Panel, Rich, mmss, useLocalState, useTeamCivs } from "./ui";
import type { TimingsData, TimingRef } from "./TimingsTab";
import { medal } from "./TimingsTab";

interface Step { at: string; do: string }
interface Section { title: string; group: string; variant: boolean; unit: "pop" | "step" | "list"; steps: Step[] }
export interface Build { id: string; title: string; quote: string; civs: string; maps: string; type: string; difficulty: string; note: string; sections: Section[] }

function CivLine({ text }: { text: string }) {
  const { civs } = useTeamCivs();
  // "Magyars, Franks, …" → emblema + nombre de cada civ conocida
  return (
    <>
      {text.split(/,\s*/).map((c, i) => {
        const civ = civs.find((x) => x.name === c.trim());
        return <span key={i} className="gk-run">{i ? " " : ""}{civ ? <GkEmblem slug={civ.slug} size="s" /> : null}{c.trim()}{i < text.split(/,\s*/).length - 1 ? "," : ""}</span>;
      })}
    </>
  );
}

export function BuildsTab() {
  const q = useQuery({ queryKey: ["lab", "builds"], queryFn: () => labGet<{ builds: Build[] }>("build-orders"), staleTime: Infinity });
  const tq = useQuery({ queryKey: ["lab", "timings"], queryFn: () => labGet<TimingsData>("timings"), staleTime: Infinity });
  const [boId, setBoId] = useLocalState("bo", "");
  const builds = q.data?.builds ?? [];
  const build = builds.find((b) => b.id === boId) ?? builds[0];
  const [secIdx, setSecIdx] = useState(0);
  const [step, setStep] = useState(0);
  const [voice, setVoice] = useState(false);
  const [overlay, setOverlay] = useState(false);
  const [t, setT] = useState(0);
  const [run, setRun] = useState(false);
  const [marks, setMarks] = useState<Record<string, number>>({});
  const last = useRef(0);

  const sec = build?.sections[Math.min(secIdx, (build?.sections.length ?? 1) - 1)];

  useEffect(() => {
    if (!run) return;
    last.current = Date.now();
    const h = setInterval(() => { const n = Date.now(); setT((x) => x + (n - last.current) / 1000); last.current = n; }, 250);
    return () => clearInterval(h);
  }, [run]);

  const speak = useCallback((s?: Step) => {
    if (!voice || !s || typeof speechSynthesis === "undefined") return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(s.do.replace(/\*\*/g, ""));
    u.lang = "es-UY";
    speechSynthesis.speak(u);
  }, [voice]);

  const go = useCallback((d: number) => {
    if (!sec) return;
    setStep((s) => {
      const n = Math.max(0, Math.min(sec.steps.length, s + d));
      if (d > 0) speak(sec.steps[n]);
      return n;
    });
  }, [sec, speak]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/INPUT|SELECT|TEXTAREA/.test((e.target as HTMLElement).tagName)) return;
      if (e.code === "Space") { e.preventDefault(); go(1); }
      if (e.code === "Backspace") { e.preventDefault(); go(-1); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [go]);

  if (!build || !sec) return <p className="lab-small">{q.isError ? "No se pudo cargar los build orders." : "cargando…"}</p>;
  const ref: TimingRef | undefined = tq.data?.builds.find((x) => x.buildId === build.id);
  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ name: build.title, source: build.note, section: sec.title,
      build_order: sec.steps.map((s) => ({ at: s.at, notes: [s.do.replace(/\*\*/g, "")] })) }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${build.id}.json`; a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      <p className="lab-intro"><b>Build orders del vault</b>, paso a paso. Clic en una fila (o <b>Espacio</b>) avanza el paso; el timer corre aparte y podés marcar el click a Feudal/Castle para compararlo con el benchmark. El <b>overlay</b> queda flotante sobre la página.</p>
      <Panel>
        <div className="lab-row">
          <Field label="Build">
            <select className="lab-select" value={build.id} onChange={(e) => { setBoId(e.target.value); setSecIdx(0); setStep(0); }}>
              {builds.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
          </Field>
        </div>
        <div className="text-[14.5px] leading-snug">
          <div><b>Civs:</b> <CivLine text={build.civs || "—"} /></div>
          <div><b>Mapas:</b> {build.maps || "—"} &nbsp; <b>Tipo:</b> {build.type || "—"} &nbsp; <b>Dificultad:</b> {build.difficulty || "—"}</div>
          <div className="lab-small"><i>{build.quote}</i></div>
        </div>
      </Panel>

      <div className="lab-grid split">
        <Panel>
          <div className="lab-row">
            <Field label="Sección">
              <select className="lab-select" value={Math.min(secIdx, build.sections.length - 1)} onChange={(e) => { setSecIdx(+e.target.value); setStep(0); }}>
                {build.sections.map((s, i) => <option key={i} value={i}>{s.title}{s.variant ? " (variante)" : ""}</option>)}
              </select>
            </Field>
          </div>
          <table className="lab-table lab-steps">
            <thead><tr><th>{sec.unit === "step" ? "Paso" : sec.unit === "list" ? "" : "Pob."}</th><th>Acción</th></tr></thead>
            <tbody>
              {sec.steps.map((s, i) => (
                <tr key={i} className={i < step ? "done" : i === step ? "cur" : ""} onClick={() => { setStep(i); speak(s); }}>
                  <td className="at">{s.at}</td><td><Rich text={s.do} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="lab-row" style={{ marginTop: 10 }}>
            <button className="lab-btn" onClick={() => go(-1)}>◀ Atrás</button>
            <button className="lab-btn" onClick={() => go(1)}>Siguiente ▶ (Espacio)</button>
            <button className="lab-btn" onClick={() => setStep(0)}>Reiniciar pasos</button>
          </div>
          <div className="lab-src">Fuente: <code>{build.note}</code></div>
        </Panel>

        <Panel title="Timer" className="lab-aside">
          <div>
            <span className="lab-timer">{mmss(t)}</span>
            <button className="lab-btn" onClick={() => setRun((r) => !r)}>{run ? "⏸ Pausar" : "▶ Iniciar"}</button>{" "}
            <button className="lab-btn" onClick={() => { setT(0); setRun(false); setMarks({}); }}>↺ Reset</button>
          </div>
          <div className="lab-row" style={{ marginTop: 10 }}>
            <button className="lab-btn" onClick={() => setMarks((m) => ({ ...m, feudal: t }))}>Marcar Feudal</button>
            <button className="lab-btn" onClick={() => setMarks((m) => ({ ...m, castle: t }))}>Marcar Castle</button>
          </div>
          <div className="lab-small">{Object.entries(marks).map(([k, v]) => `${k}: ${mmss(v)}`).join(" · ")}</div>
          {ref ? (["feudal", "castle"] as const).map((k) => (marks[k] != null && ref[k] ? <div key={k} dangerouslySetInnerHTML={{ __html: medal(k, marks[k], ref[k]!, ref.label) }} /> : null)) : null}
          <h4 className="lab-h4">Overlay y exportación</h4>
          <div className="lab-row">
            <button className="lab-btn" onClick={() => setOverlay((o) => !o)}>🪟 Overlay en página</button>
            <button className="lab-btn" onClick={exportJson}>⬇ JSON</button>
            <label className="lab-small flex items-center gap-1.5"><input type="checkbox" checked={voice} onChange={(e) => setVoice(e.target.checked)} /> voz por paso</label>
          </div>
        </Panel>
      </div>

      {overlay ? (
        <div className="lab-overlay" role="dialog" aria-label="Overlay del build order">
          <div className="t">{mmss(t)} <button className="lab-btn" onClick={() => setRun((r) => !r)}>{run ? "⏸" : "▶"}</button></div>
          <div className="lab-small" style={{ color: "var(--on-dark-dim)" }}>{build.title} · {sec.title}</div>
          <div className="cur">{sec.steps[step] ? <><b>{sec.steps[step].at}</b> <Rich text={sec.steps[step].do} /></> : "✔ Sección completa"}</div>
          {sec.steps.slice(step + 1, step + 4).map((s, i) => <div key={i} className="nx">{s.at} · <Rich text={s.do} /></div>)}
          <div style={{ marginTop: 6 }}><button className="lab-btn" onClick={() => go(-1)}>◀</button> <button className="lab-btn" onClick={() => go(1)}>▶</button></div>
        </div>
      ) : null}
    </div>
  );
}
