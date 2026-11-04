"use client";

// Guías por mapa (58 notas de la wiki): lista con filtro y detalle con secciones, civs que destacan y ranking del radar.
import { Children, isValidElement, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { labGet } from "@/lib/lab/api";
import { GkEmblem, GkText } from "@/lib/gamekit/GameKit";
import { Field, Panel, useLocalState } from "./ui";

interface MapRow { slug: string; name: string; type: string | null; typeLabel: string | null; quote: string; players: string | null; strategies: string; civs: boolean }
interface MapDetail extends MapRow {
  axis: string | null; note: string; data: Record<string, string>;
  highlights: { profile: string; civs: string[]; negative: boolean; slugs: string[] }[];
  radarTop: { top: { slug: string; name: string; score: number }[]; bottom: { slug: string; name: string; score: number }[]; basis: string } | null;
  builds: { id: string; title: string }[]; relatedMaps: { slug: string; name: string }[];
  sections: { title: string; md: string }[];
}

const TYPES: [string, string][] = [["all", "Todos"], ["abierto", "Abiertos"], ["semiabierto", "Semiabiertos"], ["cerrado", "Cerrados"], ["hibrido", "Híbridos"], ["agua", "Agua"], ["nomada", "Nómadas"], ["caotico", "Caóticos"]];
const slugify = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Wikilinks → Markdown: los de mapas navegan a su guía; el resto queda como texto plano. */
function prepare(md: string, known: Set<string>): string {
  return md.replace(/\[\[([^\]|\\]+)(?:\\?\|([^\]]+))?\]\]/g, (_, target: string, alias?: string) => {
    const label = alias ?? target.split("/").pop() ?? target;
    const [kind, ...rest] = target.split("/");
    if (kind === "maps") { const slug = slugify(rest.join("/")); if (known.has(slug)) return `[${label}](/lab/maps?map=${slug})`; }
    return label;
  });
}

/** Pone íconos en los textos sueltos de un nodo de Markdown. */
function withIcons(children: ReactNode): ReactNode {
  return Children.map(children, (c) => (typeof c === "string" ? <GkText>{c}</GkText> : isValidElement(c) ? c : c));
}

const MD_COMPONENTS = {
  p: ({ children }: { children?: ReactNode }) => <p>{withIcons(children)}</p>,
  li: ({ children }: { children?: ReactNode }) => <li>{withIcons(children)}</li>,
  td: ({ children }: { children?: ReactNode }) => <td>{withIcons(children)}</td>,
  a: ({ href, children }: { href?: string; children?: ReactNode }) => (href?.startsWith("/") ? <Link href={href}>{children}</Link> : <span>{children}</span>),
  table: ({ children }: { children?: ReactNode }) => <table className="lab-table">{children}</table>,
};

export function MapsTab() {
  const params = useSearchParams();
  const router = useRouter();
  const slug = params.get("map");
  const [filter, setFilter] = useLocalState("map-filter", "all");
  const [q, setQ] = useState("");
  const list = useQuery({ queryKey: ["lab", "maps"], queryFn: () => labGet<{ maps: MapRow[] }>("maps"), staleTime: Infinity });
  const detail = useQuery({ queryKey: ["lab", "map", slug], queryFn: () => labGet<MapDetail>(`maps/${slug}`), enabled: !!slug, staleTime: Infinity });
  const maps = useMemo(() => list.data?.maps ?? [], [list.data]);
  const known = useMemo(() => new Set(maps.map((m) => m.slug)), [maps]);
  const [, setDraftMap] = useLocalState("dv-map", "open");

  if (slug) {
    const m = detail.data;
    if (!m) return <p className="lab-small">{detail.isError ? "No se encontró esa guía." : "cargando…"}</p>;
    return (
      <div>
        <Panel>
          <div className="lab-row"><Link href="/lab/maps" className="lab-btn">◀ Todos los mapas</Link></div>
          <h3 className="lab-hero">{m.name} {m.typeLabel ? <span className={`lab-tag mt-${m.type}`}>{m.typeLabel}</span> : null}</h3>
          <p>{m.quote}</p>
          {m.strategies ? <p className="lab-small"><b>Estrategias típicas:</b> {m.strategies}</p> : null}
          <div>{Object.entries(m.data).map(([k, v]) => <span key={k} className="lab-chip"><b>{k}:</b>&nbsp;{v}</span>)}</div>
          <div className="lab-row" style={{ marginTop: 12 }}>
            {m.axis ? <Link href="/lab/draft" className="lab-btn" onClick={() => setDraftMap(m.axis as string)}>⚖️ Draft en este mapa</Link> : null}
            <Link href="/lab/scouting" className="lab-btn">🔭 Scouting</Link>
            <Link href={`/matchups?map=${encodeURIComponent(m.name)}`} className="lab-btn">🆚 Matchup en este mapa</Link>
            {m.builds.map((b) => <Link key={b.id} href="/lab/builds" className="lab-btn" onClick={() => { try { localStorage.setItem("lab:bo", JSON.stringify(b.id)); } catch { /* noop */ } }}>🗒️ {b.title}</Link>)}
          </div>
          {m.relatedMaps.length ? <div className="lab-small">Relacionados: {m.relatedMaps.map((r, i) => <span key={r.slug}>{i ? " · " : ""}<Link href={`/lab/maps?map=${r.slug}`} className="underline">{r.name}</Link></span>)}</div> : null}
        </Panel>
        <div className="lab-grid split">
          <div className="lab-cols2">
            {m.sections.map((s, i) => (
              <details key={s.title} className="lab-panel mp-sec" open={i < 2 || /c[oó]mo se juega|estrategias/i.test(s.title)}>
                <summary>{s.title}</summary>
                <div className="lab-md"><ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>{prepare(s.md, known)}</ReactMarkdown></div>
              </details>
            ))}
          </div>
          <div className="lab-aside">
            {m.highlights.length ? (
              <Panel title={<>Civs que destacan <span className="lab-small">(wiki)</span></>}>
                {m.highlights.map((h) => (
                  <div key={h.profile} style={{ margin: "6px 0" }}>
                    <span className="lab-small">{h.negative ? "⚠️ " : ""}{h.profile}</span>
                    <div>{h.civs.map((c, i) => <Link key={c} href={`/matchups?vs=${h.slugs[i] ?? ""}&map=${encodeURIComponent(m.name)}`} className={`lab-chip ${h.negative ? "no" : ""}`}><GkEmblem slug={h.slugs[i]} />{c}</Link>)}</div>
                  </div>
                ))}
              </Panel>
            ) : null}
            {m.radarTop ? (
              <Panel title={<>Según el radar <span className="lab-small">({m.radarTop.basis})</span></>}>
                <div className="lab-small">Mejor puntuadas para este tipo de mapa</div>
                <div>{m.radarTop.top.map((c) => <Link key={c.slug} href={`/matchups?vs=${c.slug}&map=${encodeURIComponent(m.name)}`} className="lab-chip"><GkEmblem slug={c.slug} />{c.name} {c.score}</Link>)}</div>
                <div className="lab-small" style={{ marginTop: 6 }}>Peor puntuadas</div>
                <div>{m.radarTop.bottom.map((c) => <Link key={c.slug} href={`/matchups?vs=${c.slug}&map=${encodeURIComponent(m.name)}`} className="lab-chip no"><GkEmblem slug={c.slug} />{c.name} {c.score}</Link>)}</div>
                <p className="lab-src">El radar califica por tipo de mapa, no por este mapa en particular. Clic en una civ para analizar el matchup.</p>
              </Panel>
            ) : <Panel><span className="lab-small">Este tipo de mapa no tiene un eje equivalente en el radar de civs.</span></Panel>}
            <p className="lab-src">Fuente: <code>{m.note}</code></p>
          </div>
        </div>
      </div>
    );
  }

  const rows = maps.filter((m) => (filter === "all" || m.type === filter) && (!q || `${m.name} ${m.strategies}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <div>
      <p className="lab-intro"><b>Guías por mapa:</b> generación y recursos, cómo se juega, civs que destacan (de la wiki) y las civs mejor puntuadas por el radar para ese <b>tipo</b> de mapa. Desde cada guía saltás al draft, al scouting, al build recomendado o al análisis de matchup en ese mapa.</p>
      <Panel>
        <div className="lab-row">
          <Field label="Buscar"><input className="lab-input" size={18} placeholder="Arabia, Arena, Nomad…" value={q} onChange={(e) => setQ(e.target.value)} /></Field>
          <div className="flex flex-wrap gap-1.5">{TYPES.map(([k, l]) => <button key={k} className={`lab-btn ${filter === k ? "active" : ""}`} onClick={() => setFilter(k)}>{l}</button>)}</div>
        </div>
        <div className="lab-grid">
          {rows.map((m) => (
            <button key={m.slug} className="mp-card" onClick={() => router.push(`/lab/maps?map=${m.slug}`)}>
              <b>{m.name}</b> <span className={`lab-tag mt-${m.type}`}>{m.typeLabel ?? "—"}</span>
              <div className="lab-small">{m.quote.length > 150 ? `${m.quote.slice(0, 147)}…` : m.quote}</div>
            </button>
          ))}
          {!rows.length ? <p className="lab-small">Sin resultados.</p> : null}
        </div>
      </Panel>
    </div>
  );
}
