"use client";
/* eslint-disable @next/next/no-img-element -- íconos del árbol servidos por el proxy /api/icon (PNG chicos); next/image no aporta */

// GameKit para React: catálogo de íconos + UN tooltip para toda la app.
//   · <GameKitProvider> (en providers.tsx) carga /api/lab/icons y monta el tooltip.
//   · Cualquier elemento con data-gk="i:<id>" (unidad/tecnología/edificio) o data-gk="c:<slug>" (civ) muestra el hover.
//   · Piezas: <GkIcon id/>, <GkEmblem slug/>, <GkAge/>, <GkStat/>, <GkRes/>, <GkText> (íconos delante de los nombres reconocidos).
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { labGet } from "@/lib/lab/api";
import { splitNames } from "./iconize";
import { EMPTY_CATALOG, type Cost, type GkCatalog, type ResKey } from "./types";
import "./gamekit.css";

const Ctx = createContext<GkCatalog>(EMPTY_CATALOG);
export const useGameKit = () => useContext(Ctx);

const treeImg = (p: string) => `/api/icon?p=${encodeURIComponent(p)}`;
const noGk = (cls: string) => /\bno-gk\b/.test(cls);

// ── Piezas ───────────────────────────────────────────────────────────────────
export function GkIcon({ id, size = "", className = "" }: { id: string; size?: "s" | "m" | "l" | ""; className?: string }) {
  const cat = useGameKit();
  const it = cat.items[id];
  if (!it) return null;
  const cls = `gk-ico k-${it.k} ${size ? `gk-${size}` : ""} ${className}`;
  return <img className={cls} src={treeImg(it.i)} alt="" loading="lazy" {...(noGk(className) ? {} : { "data-gk": `i:${id}` })} />;
}

export function GkEmblem({ slug, size = "", className = "" }: { slug?: string | null; size?: "s" | "m" | "l" | "xl" | ""; className?: string }) {
  const cat = useGameKit();
  if (!slug || !cat.civs.includes(slug)) return null;
  const cls = `gk-emb ${size ? `gk-e${size}` : ""} ${className}`;
  return <img className={cls} src={treeImg(`img/Civs/${slug}.png`)} alt="" loading="lazy" {...(noGk(className) ? {} : { "data-gk": `c:${slug}` })} />;
}

export function GkAge({ age }: { age: string }) {
  const cat = useGameKit();
  return cat.ages[age] ? <img className="gk-age" src={treeImg(cat.ages[age])} alt="" title={age} /> : null;
}

export function GkStat({ k }: { k: string }) {
  const cat = useGameKit();
  return cat.stats[k] ? <img className="gk-stat" src={treeImg(cat.stats[k])} alt="" title={k} /> : null;
}

export function GkRes({ k }: { k: string }) {
  const cat = useGameKit();
  return cat.res[k] ? <img className="gk-stat" src={treeImg(cat.res[k])} alt="" title={k} /> : null;
}

/** Texto con el ícono (y el hover) delante de cada nombre de unidad, tecnología o edificio reconocido. */
export function GkText({ children }: { children: string }) {
  const cat = useGameKit();
  return (
    <>
      {splitNames(children, cat).map((p, i) =>
        p.id ? (
          <span key={i} className="gk-run">
            <GkIcon id={p.id} size="s" />
            {p.text}
          </span>
        ) : (
          p.text
        ),
      )}
    </>
  );
}

// ── Contenido del hover ──────────────────────────────────────────────────────
const AGE = ["Dark Age", "Feudal Age", "Castle Age", "Imperial Age"];
const KIND_ES: Record<string, string> = { unit: "Unidad", upgrade: "Unidad mejorada", tech: "Tecnología", building: "Edificio", defencive: "Defensa" };
const POS_ES = { flank: "Flanco", pocket: "Pocket", flex: "Flexible" } as const;
const RES: ResKey[] = ["food", "wood", "gold", "stone"];
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

function CostRow({ label, c, t }: { label: string; c: Cost; t?: number }) {
  return (
    <div className="gk-row">
      <span className="gk-lbl">{label}</span>
      {RES.filter((k) => c[k]).map((k) => (
        <span key={k} className="gk-c"><GkRes k={k} />{c[k]}</span>
      ))}
      {t ? <span className="gk-t">{t} s</span> : null}
    </div>
  );
}

function ItemTip({ id }: { id: string }) {
  const cat = useGameKit();
  const it = cat.items[id];
  if (!it) return null;
  const build = it.k === "building", unit = it.k === "unit";
  const sub = [KIND_ES[it.ty], AGE[it.a], it.w && cat.items[it.w] ? `en ${cat.items[it.w].n}` : ""].filter(Boolean).join(" · ");
  const s = it.st;
  return (
    <>
      <div className="gk-head">
        <span className={`gk-box k-${it.k}`}><img src={treeImg(it.i)} alt="" /></span>
        <div><div className="gk-name">{it.n}</div>{it.es ? <div className="gk-alias">{it.es}</div> : null}</div>
      </div>
      <div className="gk-sub">{sub}</div>
      {s ? (
        <div className="gk-stats">
          {s.hp ? <span><GkStat k="hp" /><b>{s.hp}</b> PV</span> : null}
          {s.atk ? <span><GkStat k="attack" /><b>{s.atk}</b> ataque</span> : null}
          {s.arm ? <span><GkStat k="armor" /><b>{s.arm[0]}</b> <GkStat k="pierce" /><b>{s.arm[1]}</b> armadura</span> : null}
          {s.rng ? <span><GkStat k="range" /><b>{s.rng}</b> rango</span> : null}
          {s.spd ? <span><GkStat k="speed" /><b>{s.spd}</b> velocidad</span> : null}
          {s.rof ? <span><GkStat k="rof" /><b>{s.rof}</b> s por golpe</span> : null}
        </div>
      ) : null}
      {it.c ? <CostRow label={build ? "Construcción" : unit ? "Producción" : "Costo"} c={it.c} t={it.t || it.bt} /> : null}
      {it.rc ? <CostRow label={it.k === "tech" ? "Investigación" : "Mejora"} c={it.rc} t={it.rt} /> : null}
      {it.ef ? <p className="gk-text">{it.ef}</p> : null}
      {it.bo ? (
        <div className="gk-row"><span className="gk-lbl">Bonus</span>{Object.entries(it.bo).map(([k, v]) => <span key={k} className="gk-c">+{v} vs {k}</span>)}</div>
      ) : null}
      {it.sg ? <div className="gk-rel"><b>Fuerte contra</b> {cut(it.sg, 130)}</div> : null}
      {it.wk ? <div className="gk-rel"><b>Débil contra</b> {cut(it.wk, 130)}</div> : null}
      {it.pr?.length ? (
        <div className="gk-rel"><b>Produce</b>
          <span className="gk-prod">{it.pr.map((p) => <span key={p}><GkIcon id={p} size="s" className="no-gk" />{cat.items[p]?.n}</span>)}</span>
        </div>
      ) : null}
      {it.av?.length ? (
        <div className="gk-rel"><b>Solo</b> {it.av.map((c, i) => <span key={c}>{i ? ", " : ""}<GkEmblem slug={c} size="s" className="no-gk" />{cat.civInfo[c]?.n ?? c}</span>)}</div>
      ) : it.nv && it.nv < cat.totalCivs ? (
        <div className="gk-rel"><b>Disponible en</b> {it.nv} de {cat.totalCivs} civs</div>
      ) : null}
    </>
  );
}

function CivTip({ slug }: { slug: string }) {
  const cat = useGameKit();
  const c = cat.civInfo[slug];
  if (!c) return null;
  return (
    <>
      <div className="gk-head">
        <GkEmblem slug={slug} size="l" className="no-gk" />
        <div><div className="gk-name">{c.n}</div><div className="gk-alias">{POS_ES[c.pos]}{c.ph ? ` · Phosphor Rush ${c.ph}` : ""}</div></div>
      </div>
      {c.sp ? <div className="gk-sub">{c.sp}</div> : null}
      {c.tb ? <p className="gk-text"><b>Equipo:</b> {c.tb}</p> : null}
      {c.st.length ? <ul className="gk-list ok">{c.st.map((x) => <li key={x}>{cut(x, 90)}</li>)}</ul> : null}
      {c.wk.length ? <ul className="gk-list no">{c.wk.map((x) => <li key={x}>{cut(x, 90)}</li>)}</ul> : null}
    </>
  );
}

// ── Tooltip global: delegación de eventos sobre [data-gk] ────────────────────
function GkTooltip() {
  const cat = useGameKit();
  const [spec, setSpec] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let current: Element | null = null;
    const touch = () => matchMedia("(hover: none)").matches;
    const find = (e: Event) => (e.target as Element | null)?.closest?.("[data-gk]") ?? null;
    const hide = () => { clearTimeout(timer); current = null; setSpec(null); };
    const show = (el: Element) => {
      const s = el.getAttribute("data-gk") ?? "";
      const [type, ...rest] = s.split(":");
      const id = rest.join(":");
      const ok = type === "c" ? !!cat.civInfo[id] : !!cat.items[id];
      if (!ok) return;
      for (const t of [el, ...el.querySelectorAll("[title]")]) {   // el hover propio reemplaza al title nativo
        const title = t.getAttribute("title");
        if (title) { t.setAttribute("data-gk-title", title); t.removeAttribute("title"); }
      }
      current = el; setSpec(s); setAnchor(el.getBoundingClientRect());
    };
    const over = (e: MouseEvent) => {
      if (touch()) return;
      const el = find(e); if (!el || el === current) return;
      clearTimeout(timer); timer = setTimeout(() => show(el), 120);
    };
    const out = (e: MouseEvent) => {
      const el = find(e); if (!el) return;
      if (e.relatedTarget instanceof Node && el.contains(e.relatedTarget)) return;
      hide();
    };
    const click = (e: MouseEvent) => {                       // táctil: un toque abre, otro cierra
      if (!touch()) return;
      const el = find(e);
      if (el && el !== current) show(el); else hide();
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") hide(); };
    const focus = (e: FocusEvent) => { const el = find(e); if (el) show(el); };
    document.addEventListener("mouseover", over);
    document.addEventListener("mouseout", out);
    document.addEventListener("click", click, true);
    document.addEventListener("keydown", key);
    document.addEventListener("focusin", focus);
    document.addEventListener("focusout", hide);
    addEventListener("scroll", hide, true); addEventListener("resize", hide); addEventListener("blur", hide);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseover", over); document.removeEventListener("mouseout", out);
      document.removeEventListener("click", click, true); document.removeEventListener("keydown", key);
      document.removeEventListener("focusin", focus); document.removeEventListener("focusout", hide);
      removeEventListener("scroll", hide, true); removeEventListener("resize", hide); removeEventListener("blur", hide);
    };
  }, [cat]);

  useLayoutEffect(() => {
    if (!spec || !anchor || !ref.current) return;
    const { offsetWidth: w, offsetHeight: h } = ref.current, m = 8;
    const x = Math.max(m, Math.min(anchor.left + anchor.width / 2 - w / 2, innerWidth - w - m));
    let y = anchor.bottom + 8;
    if (y + h > innerHeight - m) y = Math.max(m, anchor.top - h - 8);
    setPos({ x: Math.round(x), y: Math.round(y) });
  }, [spec, anchor]);

  const [type, ...rest] = (spec ?? "").split(":");
  const id = rest.join(":");
  return (
    <div ref={ref} className={`gk-tip ${spec ? "on" : ""}`} role="tooltip" style={{ left: pos.x, top: pos.y }}>
      {spec ? (type === "c" ? <CivTip slug={id} /> : <ItemTip id={id} />) : null}
    </div>
  );
}

export function GameKitProvider({ children }: { children: ReactNode }) {
  const q = useQuery({ queryKey: ["gamekit", "catalog"], queryFn: () => labGet<GkCatalog>("icons"), staleTime: Infinity, retry: 1 });
  const cat = q.data ?? EMPTY_CATALOG;
  return (
    <Ctx.Provider value={cat}>
      {children}
      <GkTooltip />
    </Ctx.Provider>
  );
}
