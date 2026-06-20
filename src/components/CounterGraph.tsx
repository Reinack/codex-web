"use client";

import { useEffect, useRef } from "react";
import cytoscape, { type NodeDefinition, type EdgeDefinition } from "cytoscape";
import type { CounterGraph as CounterGraphData, CyNodeData } from "@/lib/api/schema";

// 'hard/soft/situational' = lo que te counterea (entra al centro);
// 'beats-*' = a lo que tu unidad le gana (sale del centro); 'center' = la buscada.
const NODE_COLOR: Record<string, string> = {
  center: "#f59e0b",
  hard: "#e11d48",
  soft: "#fb923c",
  situational: "#a1a1aa",
  "beats-hard": "#059669",
  "beats-soft": "#2dd4bf",
  "beats-situational": "#38bdf8",
};
const colorFor = (type?: string) => (type && NODE_COLOR[type]) || "#a1a1aa";
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
  const containerRef = useRef<HTMLDivElement>(null);
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

    const pos = new Map<string, { x: number; y: number }>([["center", { x: 0, y: 0 }]]);
    const place = (list: { data: CyNodeData }[], from: number, to: number) => {
      const n = list.length;
      list.forEach((node, i) => {
        const r = R_BY_STRENGTH[baseType(node.data.type)] || 300;
        const a = n === 1 ? (from + to) / 2 : from + ((to - from) * i) / (n - 1);
        pos.set(node.data.id, { x: r * Math.cos(a), y: r * Math.sin(a) });
      });
    };
    place(counters, Math.PI * (2 / 3), Math.PI * (4 / 3)); // izquierda
    place(beats, -Math.PI / 3, Math.PI / 3); // derecha

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
            "background-image": "data(img)",
            "background-fit": "cover",
            "border-width": 4,
            "border-color": "data(color)",
            width: 54,
            height: 54,
            label: "data(label)",
            "font-size": 10,
            color: "#f8fafc",
            "text-valign": "bottom",
            "text-halign": "center",
            "text-margin-y": 5,
            "text-wrap": "wrap",
            "text-max-width": "96px",
            "text-background-color": "#0f172a",
            "text-background-opacity": 0.82,
            "text-background-padding": "3px",
            "text-background-shape": "roundrectangle",
          },
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
            "line-color": "#94a3b8",
            "target-arrow-color": "#94a3b8",
            opacity: 0.5,
          },
        },
        { selector: "node:selected", style: { "border-color": "#0ea5e9", "border-width": 5 } },
      ],
      layout: { name: "preset", fit: true, padding: 36 },
      minZoom: 0.25,
      maxZoom: 2.5,
      wheelSensitivity: 0.2,
    });

    cy.on("tap", "node", (evt) => onSelectRef.current?.(evt.target.data() as CyNodeData));
    cy.on("tap", (evt) => {
      if (evt.target === cy) onSelectRef.current?.(null);
    });

    return () => cy.destroy();
  }, [graph]);

  return (
    <div
      ref={containerRef}
      className="h-[520px] w-full rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
    />
  );
}
