"use client";

import { useEffect, useRef, useState } from "react";
import cytoscape, { type NodeDefinition, type EdgeDefinition } from "cytoscape";
import type { CounterGraph as CounterGraphData, CyNodeData } from "@/lib/api/schema";
import { useT } from "@/lib/i18n/I18nProvider";

// 'hard/soft/situational' = lo que te counterea (entra al centro);
// 'beats-*' = a lo que tu unidad le gana (sale del centro); 'center' = la buscada.
const NODE_COLOR: Record<string, string> = {
// Pigmentos de la guía de estilo del árbol: rojo --bad = te counterea, verde
// --good = le ganás, oro = la unidad buscada (selección/jerarquía).
  center: "#c69b45",
  hard: "#9b2b1a",
  soft: "#83551d",
  situational: "#6f5234",
  "beats-hard": "#3d6b17",
  "beats-soft": "#53682a",
  "beats-situational": "#2a5d86",
};
const colorFor = (type?: string) => (type && NODE_COLOR[type]) || "#6f5234";
const baseType = (t?: string) => (t || "").replace("beats-", "");
const R_BY_STRENGTH: Record<string, number> = { hard: 170, soft: 270, situational: 360 };
const ORDER: Record<string, number> = { hard: 0, soft: 1, situational: 2 };

export function CounterGraph({
  graph,
  onSelect,
}: {
  graph: CounterGraphData;
  onSelect?: (data: CyNodeData | null) => void;
}) {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  // Globo al pasar el mouse: el porqué de la relación sin tener que clickear.
  const [tip, setTip] = useState<{ x: number; y: number; w: number; d: CyNodeData } | null>(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Posiciones tipo radial: counters en el semicírculo izquierdo, beats en el
    // derecho; radio por fuerza (hard cerca, situational lejos).
    const sortFn = (a: { data: CyNodeData }, b: { data: CyNodeData }) =>
      ORDER[baseType(a.data.type)] - ORDER[baseType(b.data.type)];
    const counters = graph.nodes
      .filter((n) => n.data.type !== "center" && n.data.dir !== "beats")
      .sort(sortFn);
    const beats = graph.nodes.filter((n) => n.data.dir === "beats").sort(sortFn);

    // Elipse: en pantallas anchas los nodos se abren a lo ancho en vez de quedar
    // en un círculo con los costados vacíos.
    const kx = Math.min(2.2, Math.max(1, container.clientWidth / Math.max(1, container.clientHeight)));
    const pos = new Map<string, { x: number; y: number }>([["center", { x: 0, y: 0 }]]);
    const place = (list: { data: CyNodeData }[], from: number, to: number) => {
      const n = list.length;
      list.forEach((node, i) => {
        const r = R_BY_STRENGTH[baseType(node.data.type)] || 300;
        const a = n === 1 ? (from + to) / 2 : from + ((to - from) * i) / (n - 1);
        pos.set(node.data.id, { x: kx * r * Math.cos(a), y: r * Math.sin(a) });
      });
    };
    place(counters, Math.PI * 0.6, Math.PI * 1.4); // izquierda
    place(beats, -Math.PI * 0.4, Math.PI * 0.4); // derecha

    const nodes: NodeDefinition[] = graph.nodes.map((n) => ({
      data: { ...n.data, color: colorFor(n.data.type) },
      position: pos.get(n.data.id) ?? { x: 0, y: 0 },
    }));
    const edges: EdgeDefinition[] = graph.edges.map((e) => ({
      data: { ...e.data, source: String(e.data.source), target: String(e.data.target) },
    }));

    const cy = cytoscape({
      container,
      elements: { nodes, edges },
      style: [
        {
          selector: "node",
          style: {
            "background-color": "data(color)",
            "border-width": 4,
            "border-color": "data(color)",
            width: 54,
            height: 54,
            label: "data(label)",
            "font-size": 10,
            color: "#e4d4b0",
            "text-valign": "bottom",
            "text-halign": "center",
            "text-margin-y": 5,
            "text-wrap": "wrap",
            "text-max-width": "96px",
            "text-background-color": "#060402",
            "text-background-opacity": 0.82,
            "text-background-padding": "3px",
            "text-background-shape": "rectangle",
            "font-family": "Crimson Pro, Georgia, serif",
          },
        },
        // Solo los nodos con ícono: un "background-image" vacío (unidad nueva que
        // todavía no está en IMG_MAP) hace que Cytoscape tire abajo todo el grafo.
        {
          selector: "node[?img]",
          style: { "background-image": "data(img)", "background-fit": "cover" },
        },
        {
          selector: 'node[type="center"]',
          style: { width: 88, height: 88, "border-width": 5, "font-size": 12 },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "curve-style": "bezier",
            "target-arrow-shape": "triangle",
            "line-color": "#4b331c",
            "target-arrow-color": "#4b331c",
            opacity: 0.55,
          },
        },
        { selector: "node:selected", style: { "border-color": "#ecd08a", "border-width": 5 } },
      ],
      layout: { name: "preset", fit: true, padding: 36 },
      minZoom: 0.25,
      maxZoom: 2.5,
      wheelSensitivity: 0.2,
    });

    cy.on("mouseover mousemove", "node", (evt) => {
      const d = evt.target.data() as CyNodeData;
      if (d.type === "center") return;
      setTip({ x: evt.renderedPosition.x, y: evt.renderedPosition.y, w: cy.width(), d });
    });
    cy.on("mouseout", "node", () => setTip(null));
    cy.on("viewport", () => setTip(null));
    cy.on("tap", "node", (evt) => onSelectRef.current?.(evt.target.data() as CyNodeData));
    cy.on("tap", (evt) => {
      if (evt.target === cy) onSelectRef.current?.(null);
    });

    return () => {
      setTip(null);
      cy.destroy();
    };
  }, [graph]);

  const ctx = tip?.d.context && tip.d.context !== "general" ? t(`counters.ctx.${tip.d.context}`) : "";
  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-[max(520px,calc(100vh-320px))] w-full rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      />
      {tip && (
        <div
          className="pointer-events-none absolute z-20 max-w-[260px] border border-[var(--gold)] bg-[#060402]/95 px-2.5 py-2 text-xs leading-snug text-[#e4d4b0]"
          style={{ left: Math.min(tip.x + 16, Math.max(0, tip.w - 270)), top: tip.y + 16 }}
        >
          <b className="text-[#ecd08a]">{(typeof tip.d.full === "string" && tip.d.full) || tip.d.label}</b>
          <div className="mb-1 mt-0.5 text-[11px] text-[#bfae8a]">
            {t(tip.d.dir === "beats" ? "counters.tipBeats" : "counters.tipCounters").replace("{unit}", graph.heading)}
            {tip.d.tier ? ` · ${tip.d.tier}` : ""}
            {ctx ? ` · ${ctx}` : ""}
          </div>
          {typeof tip.d.nota === "string" && tip.d.nota && tip.d.nota !== "—" ? tip.d.nota : <i>{t("counters.noNote")}</i>}
        </div>
      )}
    </div>
  );
}
