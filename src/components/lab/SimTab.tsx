"use client";

// Simulador de combate ejército vs ejército (aproximado) + matriz de eficiencia de costo. Aplica bonos de civ y de
// equipo (y descuentos de costo) según la edad; no incluye techs únicas ni unidades únicas.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { labGet, labPost } from "@/lib/lab/api";
import { GkEmblem, GkIcon, GkRes, GkStat } from "@/lib/gamekit/GameKit";
import { Field, Panel, useLocalState } from "./ui";

interface Unit { id: string; name: string; hp: number; attack: number; armor: [number, number]; range: number; speed: number; rof: number; cost: Record<string, number>; value: number }
interface Group { id: string; count: number }
interface Side { groups: Group[]; up: [number, number, number]; civ: string; ally: string }
interface SimRow { id: string; name: string; start: number; left: number }
interface SimSide { rows: SimRow[]; lostValue: number; startValue: number }
interface SimResult {
  winner: "A" | "B" | "draw"; seconds: number; a: SimSide; b: SimSide; efficiency: { a: number | null; b: number | null };
  civs: Record<"a" | "b", { civ: string | null; ally: string | null; applied: string[]; warnings: string[] }>; caveats: string[];
}
interface Matrix { ids: string[]; names: string[]; cells: number[][] }

const EMPTY_SIDE = (id: string, count: number): Side => ({ groups: [{ id, count }], up: [0, 0, 0], civ: "", ally: "" });
const AGES = ["Dark", "Feudal", "Castle", "Imperial"];

function UnitInfo({ u }: { u?: Unit }) {
  if (!u) return null;
  return (
    <div className="sim-stats">
      <GkStat k="hp" />{u.hp} <GkStat k="attack" />{u.attack} <GkStat k="armor" />{u.armor[0]} <GkStat k="pierce" />{u.armor[1]}
      {u.range ? <><GkStat k="range" />{u.range}</> : null} <GkStat k="speed" />{u.speed}
      <span style={{ marginLeft: 8 }}>{(["food", "wood", "gold", "stone"] as const).filter((r) => u.cost[r]).map((r) => <span key={r}><GkRes k={r} />{u.cost[r]} </span>)}</span>
    </div>
  );
}

export function SimTab() {
  const cat = useQuery({ queryKey: ["lab", "sim-cat"], queryFn: () => labGet<{ units: Unit[] }>("sim/catalog"), staleTime: Infinity });
  const civq = useQuery({ queryKey: ["lab", "sim-civs"], queryFn: () => labGet<{ civs: { slug: string; name: string }[] }>("sim/civs"), staleTime: Infinity });
  const units = cat.data?.units ?? [];
  const civs = civq.data?.civs ?? [];
  const [A, setA] = useLocalState<Side>("sim-a", EMPTY_SIDE("paladin", 10));
  const [B, setB] = useLocalState<Side>("sim-b", EMPTY_SIDE("halberdier", 20));
  const [age, setAge] = useLocalState("sim-age", 3);
  const [gap, setGap] = useState(10);
  const [res, setRes] = useState<SimResult | null>(null);
  const [err, setErr] = useState("");
  const [mx, setMx] = useLocalState<string[]>("mx", ["halberdier", "paladin", "arbalester", "eliteskirm", "heavycamel", "champion"]);
  const [budget, setBudget] = useState(2000);
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const byId = (id: string) => units.find((u) => u.id === id);

  const body = () => ({
    a: A.groups, b: B.groups, gap, age,
    upgradesA: { attack: A.up[0], armMelee: A.up[1], armPierce: A.up[2] }, upgradesB: { attack: B.up[0], armMelee: B.up[1], armPierce: B.up[2] },
    civA: A.civ, civB: B.civ, allyA: A.ally, allyB: B.ally,
  });
  const simulate = async () => { try { setErr(""); setRes(await labPost<SimResult>("sim", body())); } catch (e) { setErr((e as Error).message); } };
  const calcMatrix = async () => {
    try {
      setErr("");
      setMatrix(await labGet<Matrix>("sim/matrix", { units: mx.join(","), budget, civA: A.civ, civB: B.civ, allyA: A.ally, allyB: B.ally, age }));
    } catch (e) { setErr((e as Error).message); }
  };

  const CivSel = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <span className="inline-flex items-center gap-1.5"><GkEmblem slug={value} size="m" />
      <select className="lab-select" value={value} onChange={(e) => onChange(e.target.value)}><option value="">— sin civ —</option>{civs.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></span>
  );

  const side = (label: string, S: Side, set: (s: Side) => void) => (
    <Panel title={label}>
      {S.groups.map((g, i) => (
        <div key={i} style={{ margin: "6px 0 10px" }}>
          <div className="flex items-center gap-1.5">
            <GkIcon id={g.id} size="m" />
            <select className="lab-select flex-1" value={g.id} onChange={(e) => set({ ...S, groups: S.groups.map((x, j) => (j === i ? { ...x, id: e.target.value } : x)) })}>
              {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <input className="lab-input" style={{ width: 64 }} type="number" min={1} max={500} value={g.count}
              onChange={(e) => set({ ...S, groups: S.groups.map((x, j) => (j === i ? { ...x, count: Math.max(1, +e.target.value || 1) } : x)) })} />
            {S.groups.length > 1 ? <button className="lab-chip" aria-label="Quitar" onClick={() => set({ ...S, groups: S.groups.filter((_, j) => j !== i) })}>×</button> : null}
          </div>
          <UnitInfo u={byId(g.id)} />
        </div>
      ))}
      {S.groups.length < 4 ? <button className="lab-btn" onClick={() => set({ ...S, groups: [...S.groups, { id: "knight", count: 10 }] })}>+ unidad</button> : null}
      <div className="lab-row" style={{ marginTop: 8 }}>
        <Field label="Civ"><CivSel value={S.civ} onChange={(v) => set({ ...S, civ: v })} /></Field>
        <Field label="Aliado (bonus de equipo)"><CivSel value={S.ally} onChange={(v) => set({ ...S, ally: v })} /></Field>
      </div>
      <div className="lab-row">
        {(["Ataque +", "Arm. melee +", "Arm. perf. +"] as const).map((l, k) => (
          <Field key={l} label={l}><input className="lab-input" style={{ width: 54 }} type="number" min={0} max={3} value={S.up[k]}
            onChange={(e) => { const up = [...S.up] as Side["up"]; up[k] = Math.max(0, Math.min(3, +e.target.value || 0)); set({ ...S, up }); }} /></Field>
        ))}
      </div>
    </Panel>
  );

  const tbl = (s: SimSide, t: string) => (
    <div>
      <table className="lab-table"><thead><tr><th>{t}</th><th>Inicio</th><th>Quedan</th></tr></thead>
        <tbody>{s.rows.map((x) => <tr key={x.id}><td><GkIcon id={x.id} size="s" />{x.name}</td><td>{x.start}</td><td><b>{x.left}</b></td></tr>)}</tbody></table>
      <div className="lab-small">Valor perdido: {s.lostValue} de {s.startValue}</div>
    </div>
  );
  const col = (v: number) => (v === 0 ? "transparent" : v > 0 ? `rgba(61,107,23,${0.15 + v * 0.65})` : `rgba(155,43,26,${0.15 + -v * 0.65})`);

  return (
    <div>
      <p className="lab-intro"><b>Simulador de combate</b> ejército vs ejército con stats y bonus del vault/árbol. <b>Es una aproximación</b>: sin hit&amp;run ni selección de objetivo; aplica bonos de civ y de equipo (y descuentos de costo) según la edad, pero no techs únicas ni unidades únicas. Útil para comparar tendencias, no para predecir una pelea exacta. Los counters curados del vault están en <Link href="/counters" className="underline">Counters</Link>.</p>
      <div className="lab-grid two">{side("Ejército A", A, setA)}{side("Ejército B", B, setB)}</div>
      <Panel>
        <div className="lab-row">
          <Field label="Edad"><select className="lab-select" value={age} onChange={(e) => setAge(+e.target.value)}>{AGES.map((n, i) => <option key={n} value={i}>{n}</option>)}</select></Field>
          <Field label="Distancia inicial (casillas)"><input className="lab-input" style={{ width: 70 }} type="number" min={1} max={30} value={gap} onChange={(e) => setGap(+e.target.value || 10)} /></Field>
          <button className="lab-btn" onClick={simulate}>Simular</button>
        </div>
        {err ? <p className="lab-small" style={{ color: "var(--bad)" }}>{err}</p> : null}
        {res ? (
          <div>
            <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20 }}>{res.winner === "draw" ? "Empate (sin ganador en 15 min)" : `Gana el ejército ${res.winner}`} <span className="lab-small">· {res.seconds} s</span></p>
            <div className="lab-grid two">{tbl(res.a, "A")}{tbl(res.b, "B")}</div>
            <p>Eficiencia (valor enemigo destruido / valor propio perdido): A <b>{res.efficiency.a ?? "∞"}</b> · B <b>{res.efficiency.b ?? "∞"}</b></p>
            {(["a", "b"] as const).map((k) => { const c = res.civs[k]; return c.civ || c.ally ? (
              <div key={k} className="lab-small"><b>Bonos aplicados {k.toUpperCase()}</b>: {c.applied.length ? c.applied.join(" · ") : "ninguno sobre estas unidades"}{c.warnings.length ? <><br />⚠️ {c.warnings.join(" · ")}</> : null}</div>) : null; })}
            <p className="lab-src">Limitaciones: {res.caveats.join(" · ")}</p>
          </div>
        ) : null}
      </Panel>
      <Panel title="Matriz de eficiencia de costo">
        <p className="lab-small">Usa las civs, aliados y edad elegidos arriba. Cada celda enfrenta a igual valor en recursos. Positivo (verde) = gana la unidad de la fila; negativo (rojo) = gana la de la columna.</p>
        <div className="lab-row">
          <Field label="Unidades" grow>
            <div>
              {mx.map((id) => <span key={id} className="lab-chip"><GkIcon id={id} size="s" />{byId(id)?.name ?? id}<button className="x" aria-label="Quitar" onClick={() => setMx(mx.filter((x) => x !== id))}>×</button></span>)}
              {mx.length < 14 ? <select className="lab-select" value="" onChange={(e) => e.target.value && setMx([...mx, e.target.value])}><option value="">+ unidad…</option>{units.filter((u) => !mx.includes(u.id)).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select> : null}
            </div>
          </Field>
          <Field label="Presupuesto"><input className="lab-input" style={{ width: 80 }} type="number" step={500} min={500} value={budget} onChange={(e) => setBudget(+e.target.value || 2000)} /></Field>
          <button className="lab-btn" onClick={calcMatrix}>Calcular</button>
        </div>
        {matrix ? (
          <div style={{ overflow: "auto" }}>
            <table className="mx">
              <thead><tr><th />{matrix.names.map((n, i) => <th key={n} className="col"><GkIcon id={matrix.ids[i]} size="s" /><span className="vt">{n}</span></th>)}</tr></thead>
              <tbody>{matrix.cells.map((r, i) => (
                <tr key={matrix.ids[i]}><th><GkIcon id={matrix.ids[i]} size="s" />{matrix.names[i]}</th>
                  {r.map((v, j) => <td key={matrix.ids[j]} style={{ background: col(v) }} title={`${matrix.names[i]} vs ${matrix.names[j]}`}>{i === j ? "·" : v.toFixed(2)}</td>)}</tr>))}</tbody>
            </table>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
